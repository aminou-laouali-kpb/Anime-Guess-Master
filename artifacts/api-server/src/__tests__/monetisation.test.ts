import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  BuyShopItemResponse,
  ClaimAdRewardResponse,
  CreateAdOfferResponse,
  GetMyAccountResponse,
  RegisterProfileResponse,
  RevenueCatWebhookResponse,
  SyncPurchasesResponse,
} from "@workspace/api-zod";
import { type TestServer, api, connectClient, startServer } from "./helpers";
import { type FakeAdmob, startFakeAdmob } from "./ssv-keys";

// Needs a Postgres database: set DATABASE_URL to run these (CI provides one).
const hasDatabase = Boolean(process.env["DATABASE_URL"]);
const WEBHOOK_SECRET = "test-webhook-secret-123";

let server: TestServer;
let admob: FakeAdmob;
let revenueCat: Server & { subscriber?: unknown; url?: string };
let query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, any>[] }>;
const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined) => {
  if (!(k in saved)) saved[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
};

let ipCounter = 1;
const ip = () => `198.18.${ipCounter >> 8}.${ipCounter++ & 255}`;

async function newAccount(name = "Testeur") {
  const res = await api(server, "/me", { method: "POST", body: { name }, ip: ip() });
  expect(res.status).toBe(201);
  RegisterProfileResponse.parse(res.body);
  return { token: res.body.profileToken as string, id: res.body.playerId as string };
}

// Every account read is checked against the OpenAPI contract.
const account = async (token: string) => GetMyAccountResponse.parse((await api(server, "/me/entitlements", { token, ip: ip() })).body);

let eventCounter = 1;
function rcEvent(type: string, appUserId: string, extra: Record<string, unknown> = {}): { api_version: string; event: Record<string, any> } {
  const n = eventCounter++;
  return {
    api_version: "1.0",
    event: {
      id: `evt-${n}-${Date.now()}`,
      type,
      app_user_id: appUserId,
      original_app_user_id: appUserId,
      aliases: [appUserId],
      environment: "SANDBOX",
      store: "APP_STORE",
      transaction_id: `tx-${n}-${Date.now()}`,
      purchased_at_ms: Date.now(),
      ...extra,
    },
  };
}

const webhook = (body: unknown, auth: string | null = WEBHOOK_SECRET) =>
  api(server, "/webhooks/revenuecat", {
    method: "POST",
    body,
    headers: auth ? { Authorization: auth } : {},
    ip: "198.51.100.200",
  });

describe.skipIf(!hasDatabase)("monetisation (Postgres)", () => {
  beforeAll(async () => {
    admob = await startFakeAdmob();
    revenueCat = createServer((req, res) => {
      const ok = req.headers.authorization === "Bearer rc_secret_key";
      res.statusCode = ok ? 200 : 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(revenueCat.subscriber ?? {}));
    });
    await new Promise<void>((r) => revenueCat.listen(0, "127.0.0.1", r));
    revenueCat.url = `http://127.0.0.1:${(revenueCat.address() as AddressInfo).port}`;

    setEnv("REVENUECAT_WEBHOOK_AUTH", WEBHOOK_SECRET);
    setEnv("REVENUECAT_API_KEY", "rc_secret_key");
    setEnv("REVENUECAT_API_URL", revenueCat.url);
    setEnv("ADMOB_SSV_KEYS_URL", admob.url);
    server = await startServer();
    const { initStats } = await import("../lib/stats");
    await initStats();
    const { pool } = await import("@workspace/db");
    query = (sql, params) => pool.query(sql, params);
  });

  afterAll(async () => {
    await server.close();
    await admob.close();
    await new Promise<void>((r) => revenueCat.close(() => r()));
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  beforeEach(async () => {
    await query(
      "TRUNCATE games, players, entitlements, wallet_ledger, purchases, webhook_events, ad_offers, ad_rewards, inventory, equipped, reports RESTART IDENTITY CASCADE",
    );
    revenueCat.subscriber = undefined;
  });

  describe("profile", () => {
    it("creates a profile (and its token) on POST /me, then recognises the token", async () => {
      const { token, id } = await newAccount("Aya");
      expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
      const again = await api(server, "/me", { method: "POST", token, body: {}, ip: ip() });
      expect(again).toMatchObject({ status: 200, body: { playerId: id, name: "Aya", profileToken: null } });
      expect(await account(token)).toMatchObject({ playerId: id, shardsBalance: 0, noAds: false, entitlements: [], inventory: [] });
    });

    it("uses the same profile as the game socket", async () => {
      const socket = await connectClient(server, { ip: ip() });
      const res = await api(server, "/me", { method: "POST", token: socket.profile, ip: ip() });
      expect(res.status).toBe(201);
      expect(res.body.profileToken).toBeNull(); // the app already has it
      socket.close();
    });

    it("requires a known profile token", async () => {
      expect((await api(server, "/me/entitlements", { ip: ip() })).status).toBe(401);
      expect((await api(server, "/me/entitlements", { token: "x".repeat(32), ip: ip() })).status).toBe(404);
    });

    it("deletes the account: personal data gone, token no longer valid, off the leaderboard", async () => {
      const { token, id } = await newAccount("Supprimé");
      await webhook(rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.shards_100" }));
      expect((await api(server, "/me", { method: "DELETE", token, ip: ip() })).body).toEqual({ deleted: true });
      expect((await api(server, "/me/entitlements", { token, ip: ip() })).status).toBe(404);
      const { rows } = await query("SELECT name, deleted_at, shards_balance FROM players WHERE id = $1", [id]);
      expect(rows[0]).toMatchObject({ name: "Joueur supprimé", shards_balance: 0 });
      expect(rows[0]!["deleted_at"]).not.toBeNull();
      expect((await query("SELECT count(*)::int AS n FROM wallet_ledger WHERE player_id = $1", [id])).rows[0]!["n"]).toBe(0);
      // Later webhooks for that user are acknowledged but change nothing.
      expect((await webhook(rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.shards_100" }))).body.outcome).toBe("unknown_user");
    });
  });

  describe("RevenueCat webhook", () => {
    it("is off without a secret, and refuses a wrong secret", async () => {
      const { id } = await newAccount();
      setEnv("REVENUECAT_WEBHOOK_AUTH", undefined);
      expect((await webhook(rcEvent("TEST", id))).status).toBe(404);
      setEnv("REVENUECAT_WEBHOOK_AUTH", WEBHOOK_SECRET);
      expect((await webhook(rcEvent("TEST", id), "wrong")).status).toBe(401);
      expect((await webhook(rcEvent("TEST", id), null)).status).toBe(401);
      expect((await webhook(rcEvent("TEST", id), `Bearer ${WEBHOOK_SECRET}`)).status).toBe(200);
      expect((await webhook({ nothing: true })).status).toBe(400);
    });

    it("grants 'no ads' for life, and a replayed event (3 times) changes nothing", async () => {
      const { token, id } = await newAccount();
      const event = rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.noads" });
      expect(RevenueCatWebhookResponse.parse((await webhook(event)).body).outcome).toBe("granted");
      for (let i = 0; i < 3; i++) expect((await webhook(event)).body.outcome).toBe("duplicate");
      const acc = await account(token);
      expect(acc.noAds).toBe(true);
      expect(acc.entitlements).toEqual([{ entitlement: "no_ads", productId: "animewho.noads", expiresAt: null }]);
      expect((await query("SELECT count(*)::int AS n FROM purchases")).rows[0]!["n"]).toBe(1);
    });

    it("credits an Éclats pack once per store transaction, even under different event ids", async () => {
      const { token, id } = await newAccount();
      const event = rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.shards_550" });
      await webhook(event);
      await webhook(event);
      // Same transaction, re-sent by RevenueCat with a new event id.
      await webhook({ event: { ...event.event, id: `${event.event.id}-bis` } });
      expect((await account(token)).shardsBalance).toBe(550);
    });

    it("gives the starter pack's Éclats and exclusive items", async () => {
      const { token, id } = await newAccount();
      await webhook(rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.starter_pack" }));
      expect(await account(token)).toMatchObject({ shardsBalance: 500, inventory: ["card_back_dawn", "frame_rookie"] });
    });

    it("keeps a subscription until it expires, then removes it", async () => {
      const { token, id } = await newAccount();
      const expiry = Date.now() + 30 * 24 * 3600_000;
      await webhook(rcEvent("INITIAL_PURCHASE", id, { product_id: "animewho.plus.monthly", expiration_at_ms: expiry }));
      expect((await account(token)).entitlements).toEqual([
        { entitlement: "plus", productId: "animewho.plus.monthly", expiresAt: new Date(expiry).toISOString() },
      ]);
      expect((await account(token)).noAds).toBe(true);
      // Auto-renew turned off: still active.
      expect((await webhook(rcEvent("CANCELLATION", id, { product_id: "animewho.plus.monthly", cancel_reason: "UNSUBSCRIBE" }))).body.outcome).toBe("noted");
      expect((await account(token)).noAds).toBe(true);
      await webhook(rcEvent("EXPIRATION", id, { product_id: "animewho.plus.monthly", expiration_at_ms: Date.now() - 1000 }));
      expect(await account(token)).toMatchObject({ noAds: false, entitlements: [] });
    });

    it("moves entitlements on TRANSFER, and acknowledges unknown users", async () => {
      const a = await newAccount();
      const b = await newAccount();
      await webhook(rcEvent("NON_RENEWING_PURCHASE", a.id, { product_id: "animewho.noads" }));
      expect((await webhook(rcEvent("TRANSFER", b.id, { transferred_from: [a.id], transferred_to: [b.id] }))).body.outcome).toBe("transferred");
      expect((await account(a.token)).noAds).toBe(false);
      expect((await account(b.token)).noAds).toBe(true);
      const unknown = await webhook(rcEvent("INITIAL_PURCHASE", "$RCAnonymousID:abc", { product_id: "animewho.noads" }));
      expect(unknown).toMatchObject({ status: 200, body: { outcome: "unknown_user" } });
    });
  });

  describe("refunds", () => {
    it("removes the right and claws back Éclats, keeping items already bought", async () => {
      const { token, id } = await newAccount();
      const noads = rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.noads" });
      const pack = rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.shards_550" });
      await webhook(noads);
      await webhook(pack);
      await api(server, "/shop/buy", { method: "POST", token, body: { itemId: "card_back_neon" }, ip: ip() }); // 400
      expect((await account(token)).shardsBalance).toBe(150);

      const refund = (e: typeof noads) =>
        webhook(rcEvent("CANCELLATION", id, { product_id: e.event.product_id, transaction_id: e.event.transaction_id, cancel_reason: "CUSTOMER_SUPPORT" }));
      expect((await refund(noads)).body.outcome).toBe("refunded");
      expect((await refund(pack)).body.outcome).toBe("refunded");
      const acc = await account(token);
      expect(acc).toMatchObject({ noAds: false, shardsBalance: -400, inventory: ["card_back_neon"] });
      // Negative balance: the shop is closed.
      expect((await api(server, "/shop/buy", { method: "POST", token, body: { itemId: "board_dojo" }, ip: ip() })).body.error).toBe(
        "insufficient_shards",
      );
      const statuses = (await query("SELECT status FROM purchases ORDER BY id")).rows.map((r) => r["status"]);
      expect(statuses).toEqual(["refunded", "refunded"]);
    });
  });

  describe("shop", () => {
    it("sells an item once, for its price, and only equips what the player owns", async () => {
      const { token, id } = await newAccount();
      const buy = (itemId: string) => api(server, "/shop/buy", { method: "POST", token, body: { itemId }, ip: ip() });
      expect((await buy("card_back_sakura")).body.error).toBe("insufficient_shards");
      await webhook(rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.shards_550" }));
      expect(BuyShopItemResponse.parse((await buy("card_back_sakura")).body)).toEqual({ ok: true, shardsBalance: 250 });
      expect((await buy("card_back_sakura")).body.error).toBe("already_owned");
      expect((await buy("card_back_dawn")).body.error).toBe("not_for_sale");
      expect((await buy("nope")).body.error).toBe("unknown_item");

      const equip = (slot: string, itemId: string | null) => api(server, "/me/equip", { method: "POST", token, body: { slot, itemId }, ip: ip() });
      expect((await equip("frame", "frame_moon")).status).toBe(409);
      expect((await equip("frame", "card_back_sakura")).body.error).toBe("wrong_slot");
      expect((await equip("card_back", "card_back_sakura")).body.equipped).toEqual({ card_back: "card_back_sakura" });
      expect((await equip("card_back", null)).body.equipped).toEqual({});
      const ledger = (await query("SELECT sum(delta)::int AS s FROM wallet_ledger WHERE player_id = $1", [id])).rows[0]!["s"];
      expect(ledger).toBe((await account(token)).shardsBalance); // balance = sum of the ledger
    });
  });

  describe("rewarded videos (AdMob SSV)", () => {
    async function offer(token: string, rewardKey = "free_shards") {
      return api(server, "/me/ad-offers", { method: "POST", token, body: { adUnit: "rw_free_shards", rewardKey }, ip: ip() });
    }
    const ssv = (q: string) => api(server, `/admob/ssv?${q}`, { ip: "198.51.100.201" });
    const claim = (token: string, nonce: string) =>
      api(server, "/me/ad-rewards/claim", { method: "POST", token, body: { nonce }, ip: ip() });
    const callback = (userId: string, nonce: string, transactionId: string) => ({
      ad_network: "5450213213286189855",
      ad_unit: "1234567890",
      custom_data: nonce,
      reward_amount: "1",
      reward_item: "shards",
      timestamp: String(Date.now()),
      transaction_id: transactionId,
      user_id: userId,
    });

    it("credits a verified video once: offer → signed callback → claim", async () => {
      const { token, id } = await newAccount();
      const o = await offer(token);
      expect(o.status).toBe(201);
      CreateAdOfferResponse.parse(o.body);
      expect(o.body).toMatchObject({ rewardKey: "free_shards", amount: 30, ssv: { userId: id, customData: o.body.nonce } });

      expect((await claim(token, o.body.nonce)).status).toBe(202); // AdMob hasn't called yet
      const q = admob.signedQuery(callback(id, o.body.nonce, "tx-ad-1"));
      expect((await ssv(q)).body).toEqual({ status: "recorded" });
      expect((await ssv(q)).body).toEqual({ status: "duplicate" });

      expect(ClaimAdRewardResponse.parse((await claim(token, o.body.nonce)).body)).toEqual({ status: "credited", amount: 30, shardsBalance: 30 });
      expect((await claim(token, o.body.nonce)).body).toEqual({ status: "already_claimed", amount: 30, shardsBalance: 30 });
      expect((await account(token)).shardsBalance).toBe(30);
    });

    it("never credits a forged, replayed or misdirected callback", async () => {
      const { token, id } = await newAccount();
      const other = await newAccount();
      const o = await offer(token);
      const forged = admob.signedQuery(callback(id, o.body.nonce, "tx-ad-2")).replace("tx-ad-2", "tx-ad-3");
      expect((await ssv(forged)).status).toBe(403);
      // Signed, but for another player's offer.
      expect((await ssv(admob.signedQuery(callback(other.id, o.body.nonce, "tx-ad-4")))).body).toEqual({ status: "user_mismatch" });
      // Signed, with a nonce the server never issued.
      expect((await ssv(admob.signedQuery(callback(id, "made_up_nonce", "tx-ad-5")))).body).toEqual({ status: "unknown_offer" });
      expect((await claim(token, o.body.nonce)).status).toBe(202);
      expect((await claim(other.token, o.body.nonce)).status).toBe(404);
      expect((await account(token)).shardsBalance).toBe(0);
    });

    it("credits a verified but unclaimed video on the next account read", async () => {
      const { token, id } = await newAccount();
      const o = await offer(token);
      await ssv(admob.signedQuery(callback(id, o.body.nonce, "tx-ad-6")));
      expect((await account(token)).shardsBalance).toBe(30);
    });

    it("enforces the daily caps on the server", async () => {
      const { token } = await newAccount();
      for (let i = 0; i < 3; i++) expect((await offer(token)).status).toBe(201); // rw_free_shards_daily_cap = 3
      expect((await offer(token)).body).toEqual({ error: "daily_cap_reached" });
      expect((await offer(token, "daily_chest")).status).toBe(201); // other reward, own cap (1)
      expect((await offer(token, "daily_chest")).status).toBe(429);
      expect((await offer(token, "bot_hint")).body).toEqual({ error: "unknown_reward" });
    });
  });

  describe("purchase sync (RevenueCat REST API)", () => {
    it("applies entitlements and packs, sharing ledger keys with the webhook", async () => {
      const { token, id } = await newAccount();
      revenueCat.subscriber = {
        subscriber: {
          entitlements: {
            no_ads: { expires_date: null, product_identifier: "animewho.noads" },
            plus: { expires_date: "2000-01-01T00:00:00Z", product_identifier: "animewho.plus.monthly" },
          },
          non_subscriptions: { "animewho.shards_100": [{ id: "rc1", store_transaction_id: "store-tx-1" }] },
        },
      };
      const res = await api(server, "/me/sync-purchases", { method: "POST", token, ip: ip() });
      SyncPurchasesResponse.parse(res.body);
      expect(res.body).toMatchObject({ entitlements: 1, purchases: 1, account: { noAds: true, shardsBalance: 100 } });
      // The webhook for the same store transaction arrives late: no double credit.
      await webhook(rcEvent("NON_RENEWING_PURCHASE", id, { product_id: "animewho.shards_100", transaction_id: "store-tx-1" }));
      await api(server, "/me/sync-purchases", { method: "POST", token, ip: ip() });
      expect((await account(token)).shardsBalance).toBe(100);
    });
  });

  describe("reports", () => {
    it("stores reports with hashed profiles and the reported questions", async () => {
      const a = await connectClient(server, { ip: ip() });
      const b = await connectClient(server, { ip: ip() });
      a.emit("create_room", { name: "A" });
      const { code } = await a.next("room_created");
      b.emit("join_room", { code, name: "B" });
      await a.until(() => a.has("room_joined") && b.has("room_joined"));
      b.emit("report_player", { reason: "insult" });
      await b.next("player_reported");
      await new Promise((r) => setTimeout(r, 200));
      const { rows } = await query("SELECT reason, room_code, reporter_hash, content FROM reports");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ reason: "insult", room_code: code, content: "[]" });
      expect(rows[0]!["reporter_hash"]).not.toBe(b.profile);
      a.close();
      b.close();
    });
  });
});
