import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetRemoteConfigResponse, GetShopCatalogResponse } from "@workspace/api-zod";
import { type TestServer, TestClient, api, connectClient, mobileAuth, startServer, wait } from "./helpers";

// Mobile clients (native app): handshake, version gate, CGNAT-aware limits,
// and the moderation events the stores require. Limits are lowered for the
// test and restored afterwards.
const ENV = {
  MIN_MOBILE_VERSION: "1.2.0",
  MAX_CONNECTIONS_PER_IP: "3",
  MAX_CONNECTIONS_PER_IP_MOBILE: "6",
  MAX_CONNECTIONS_PER_PROFILE: "2",
  HTTP_RATE_LIMIT_PER_IP: "10",
  HTTP_RATE_LIMIT_PER_IP_AUTHENTICATED: "30",
  HTTP_RATE_LIMIT_PER_PROFILE: "5",
};
const saved: Record<string, string | undefined> = {};

let server: TestServer;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);
const app = (extra: Record<string, unknown> = {}) => mobileAuth({ appVersion: "1.2.0", ...extra });
const profileOf = (n: number) => `profile${String(n).padStart(25, "0")}`; // 32 chars

let ipCounter = 1;
const freshIp = () => `192.0.2.${ipCounter++}`;

async function refused(c: TestClient) {
  await c.until(() => c.has("connect_error"), 3000, "connect_error");
  expect(c.connected).toBe(false);
  return c.last("connect_error")!;
}

beforeAll(async () => {
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  server = await startServer();
});

afterAll(async () => {
  open.forEach((c) => c.close());
  await server.close();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("mobile handshake", () => {
  it("accepts the app (no Origin header) and tells it it was recognised", async () => {
    const c = track(await connectClient(server, { ip: freshIp(), auth: app() }));
    expect(c.last("session")).toMatchObject({ client: "mobile" });
  });

  it("refuses an app older than MIN_MOBILE_VERSION with a clear, machine-readable error", async () => {
    const old = track(new TestClient(server.url, { ip: freshIp(), auth: app({ appVersion: "1.1.9" }) }));
    const err = await refused(old);
    expect(err["message"]).toBe("app_outdated");
    expect(err["data"]).toMatchObject({ code: "app_outdated", minVersion: "1.2.0" });
    expect(err["data"]["message"]).toMatch(/mets l’app à jour/i);

    const noVersion = track(new TestClient(server.url, { ip: freshIp(), auth: { client: "mobile" } }));
    expect((await refused(noVersion))["message"]).toBe("app_outdated");
  });

  it("keeps refusing other websites even when they claim to be the app", async () => {
    const evil = track(new TestClient(server.url, { ip: freshIp(), origin: "https://evil.example", auth: app() }));
    await refused(evil);
  });

  it("treats our own web page claiming to be the app as a browser (no version gate, web limits)", async () => {
    const ip = freshIp();
    const page = track(
      await new TestClient(server.url, { ip, origin: server.url, auth: app({ appVersion: "0.0.1" }) }).connectedOrFail(),
    );
    expect(page.last("session")).toMatchObject({ client: "web" });
  });

  it("keeps the web site working exactly as before", async () => {
    const web = track(await connectClient(server, { ip: freshIp() }));
    expect(web.last("session")).toMatchObject({ client: "web" });
  });
});

describe("connection limits (carrier CGNAT)", () => {
  it("gives the app a higher cap per IP than browsers, counted separately", async () => {
    const ip = freshIp();
    const web = [0, 1, 2, 3].map(() => track(new TestClient(server.url, { ip })));
    const mobile = Array.from({ length: 7 }, (_, i) =>
      track(new TestClient(server.url, { ip, auth: app({ device: `device-number-${i}` }) })),
    );
    await wait(1200);
    expect(web.filter((c) => c.connected)).toHaveLength(3); // MAX_CONNECTIONS_PER_IP
    expect(mobile.filter((c) => c.connected)).toHaveLength(6); // MAX_CONNECTIONS_PER_IP_MOBILE
    expect(mobile.find((c) => !c.connected)!.last("connect_error")!["message"]).toBe("too_many_connections");
  });

  it("caps connections per profile for the app", async () => {
    const profile = profileOf(1);
    const clients = [0, 1, 2].map(() => track(new TestClient(server.url, { ip: freshIp(), profile, auth: app() })));
    await wait(1000);
    expect(clients.filter((c) => c.connected)).toHaveLength(2);
    // A closed connection frees its slot.
    clients.find((c) => c.connected)!.close();
    await wait(200);
    expect((await connectClient(server, { ip: freshIp(), profile, auth: app() })).connected).toBe(true);
  });

  it("rate-limits REST calls per IP, higher with a profile token, and per profile", async () => {
    const anonymousIp = freshIp();
    const anon = [];
    for (let i = 0; i < 12; i++) anon.push((await api(server, "/healthz", { ip: anonymousIp })).status);
    expect(anon.filter((s) => s === 429).length).toBe(2); // 10 per minute

    // Ten app users behind one carrier IP: 5 calls each fit (30 per IP)…
    const sharedIp = freshIp();
    const statuses: number[] = [];
    for (let p = 0; p < 6; p++) {
      for (let i = 0; i < 5; i++) statuses.push((await api(server, "/healthz", { ip: sharedIp, token: profileOf(100 + p) })).status);
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
    // …but the IP total is still capped,
    expect((await api(server, "/healthz", { ip: sharedIp, token: profileOf(200) })).status).toBe(429);
    // and so is one profile on its own.
    const ip = freshIp();
    const one = [];
    for (let i = 0; i < 6; i++) one.push((await api(server, "/healthz", { ip, token: profileOf(300) })).status);
    expect(one.at(-1)).toBe(429);
  });
});

/** Two app players in a private room, game running, `a` to play. */
async function privateGame(aAuth = {}, bAuth = {}) {
  const a = track(await connectClient(server, { ip: freshIp(), auth: app(aAuth) }));
  const b = track(await connectClient(server, { ip: freshIp(), auth: app(bAuth) }));
  a.emit("create_room", { name: "A" });
  const { code } = await a.next("room_created");
  b.emit("join_room", { code, name: "B" });
  await a.until(() => a.has("room_joined") && b.has("room_joined"));
  const board = a.last("room_joined")!["characters"] as { id: string }[];
  a.emit("select_character", { characterId: board[0]!.id });
  b.emit("select_character", { characterId: board[1]!.id });
  const start = await a.next("game_start");
  await b.until(() => b.has("game_start"));
  const [mover, other] = start["currentTurnPlayerId"] === a.playerId ? [a, b] : [b, a];
  const otherCharacter = (other === a ? board[0] : board[1])!.id;
  return { mover, other, code, otherCharacter };
}

describe("moderation of free questions (Apple 1.2)", () => {
  it("filters objectionable free questions without sending them", async () => {
    const { mover, other } = await privateGame();
    mover.emit("ask_question", { question: "T'es un connard ?" });
    expect((await mover.next("error"))["message"]).toMatch(/Reformule/);
    expect(other.has("question_asked")).toBe(false);
    mover.emit("ask_question", { question: "Porte-t-il un chapeau ?" });
    expect((await other.next("question_asked"))["question"]).toBe("Porte-t-il un chapeau ?");
  });

  it("lets a player accept verified questions only", async () => {
    const { mover, other } = await privateGame();
    other.emit("set_verified_only", { enabled: true });
    await wait(50);
    mover.emit("ask_question", { question: "Porte-t-il un chapeau ?" });
    expect((await mover.next("error"))["message"]).toMatch(/questions vérifiées/);
    mover.emit("ask_question", { attribute: "gender", value: "male" });
    await other.next("question_answered");
  });

  it("reports the opponent with the free questions they sent, even after they left", async () => {
    const { mover, other } = await privateGame();
    mover.emit("ask_question", { question: "Question bizarre ?" });
    await other.next("question_asked");
    mover.emit("leave_room");
    await other.next("opponent_left");
    other.emit("report_player", { reason: "spam" });
    expect(await other.next("player_reported")).toEqual({ ok: true });
  });

  it("blocks a player: never matched again, can't join their private room, block list survives reconnects", async () => {
    const { mover, other, otherCharacter } = await privateGame();
    mover.emit("make_guess", { characterId: otherCharacter });
    await other.next("game_over");
    other.emit("block_player");
    const { blockKey } = await other.next("player_blocked");
    expect(blockKey).toMatch(/^[A-Za-z0-9_-]{22}$/);

    // No rematch between them.
    mover.emit("request_rematch");
    await wait(100);
    expect(other.has("rematch_requested")).toBe(false);

    // Fresh connections, block list sent back by the app in the handshake.
    const blocker = track(await connectClient(server, { ip: freshIp(), profile: other.profile, auth: app({ blocked: [blockKey] }) }));
    const blocked = track(await connectClient(server, { ip: freshIp(), profile: mover.profile, auth: app() }));
    other.close();
    mover.close();

    blocked.emit("join_lobby", { name: "Blocked" });
    await blocked.next("in_queue");
    blocker.emit("join_lobby", { name: "Blocker" });
    await blocker.next("in_queue"); // not paired with the blocked player
    const third = track(await connectClient(server, { ip: freshIp(), auth: app() }));
    third.emit("join_lobby", { name: "Third" });
    await third.until(() => third.has("room_joined"));
    // The third player gets the first compatible player in the queue.
    await blocked.until(() => blocked.has("room_joined"));
    expect(blocker.has("room_joined")).toBe(false);

    // Private room: the blocked player can't join the blocker's room.
    blocker.emit("create_room", { name: "Blocker" });
    const room = await blocker.next("room_created");
    blocked.emit("leave_room");
    await wait(50);
    blocked.emit("join_room", { code: room["code"], name: "Blocked" });
    expect((await blocked.next("error"))["message"]).toMatch(/introuvable/);
  });
});

describe("public configuration endpoints (no database needed)", () => {
  it("serves the minimum app version, enabled features and ad caps", async () => {
    const { status, body } = await api(server, "/config", { ip: freshIp() });
    expect(status).toBe(200);
    GetRemoteConfigResponse.parse(body); // matches the OpenAPI contract
    expect(body.minMobileVersion).toBe("1.2.0");
    expect(body.remoteConfig).toMatchObject({ int_daily_cap: 6, rw_total_daily_cap: 10, rw_free_shards_amount: 30 });
    expect(body.features).toHaveProperty("wallet");
  });

  it("serves the cosmetic catalogue and the store products", async () => {
    const { body } = await api(server, "/shop/catalog", { ip: freshIp() });
    GetShopCatalogResponse.parse(body);
    expect(body.items.length).toBeGreaterThanOrEqual(25);
    for (const item of body.items) {
      expect(item).toMatchObject({ id: expect.any(String), slot: expect.any(String), name: { fr: expect.any(String), en: expect.any(String) } });
    }
    expect(body.products.map((p: { productId: string }) => p.productId)).toContain("animewho.noads");
  });

  it("answers 503 on per-profile endpoints without a database", async () => {
    if (process.env["DATABASE_URL"]) return; // covered by monetisation.test.ts
    const ip = freshIp();
    expect((await api(server, "/me", { method: "POST", ip })).status).toBe(503);
    expect((await api(server, "/me/entitlements", { ip, token: profileOf(9) })).status).toBe(503);
    expect((await api(server, "/admob/ssv?x=1", { ip })).status).toBe(503);
  });
});
