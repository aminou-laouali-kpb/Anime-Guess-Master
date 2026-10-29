import { randomBytes } from "crypto";
import { hashToken, loadDb } from "../database";
import { logger } from "../logger";
import { newProfileToken } from "../stats";
import { CATALOG_BY_ID, type CosmeticSlot, NO_ADS_ENTITLEMENTS } from "./catalog";
import {
  AD_OFFER_TTL_MS,
  type AdRewardKey,
  isAdRewardKey,
  remoteConfig,
  rewardAmount,
  rewardDailyCap,
} from "./config";

// Accounts, Éclats wallet, entitlements, inventory and ad rewards. Only
// called when DATABASE_URL is set (routes answer 503 otherwise).
//
// Invariants:
//  - players.shards_balance always equals the sum of the player's ledger
//    rows: both are written in the same transaction, by credit() only.
//  - Every credit has a unique (reason, ref): replaying an event is a no-op.

type Db = Awaited<ReturnType<typeof loadDb>>;
type Tx = Parameters<Parameters<Db["db"]["transaction"]>[0]>[0];

export interface PlayerRef {
  id: string;
  name: string;
  shardsBalance: number;
}

const DAY = "interval '24 hours'";

export async function findPlayer(profileToken: string): Promise<PlayerRef | null> {
  const { db, playersTable } = await loadDb();
  const { eq, and, isNull } = await import("drizzle-orm");
  const [row] = await db
    .select({ id: playersTable.id, name: playersTable.name, shardsBalance: playersTable.shardsBalance })
    .from(playersTable)
    .where(and(eq(playersTable.tokenHash, hashToken(profileToken)), isNull(playersTable.deletedAt)));
  return row ?? null;
}

/** Creates the profile row if needed (and a token if none is given). */
export async function registerPlayer(
  profileToken: string | null,
  name: string | null,
): Promise<PlayerRef & { profileToken: string; created: boolean }> {
  const { db, playersTable } = await loadDb();
  const { sql } = await import("drizzle-orm");
  const token = profileToken ?? newProfileToken();
  const [row] = await db
    .insert(playersTable)
    .values({ id: randomBytes(9).toString("base64url"), tokenHash: hashToken(token), name: name ?? "Joueur" })
    .onConflictDoUpdate({
      target: playersTable.tokenHash,
      set: name ? { name, updatedAt: sql`now()` } : { updatedAt: sql`now()` },
    })
    .returning({
      id: playersTable.id,
      name: playersTable.name,
      shardsBalance: playersTable.shardsBalance,
      createdAt: playersTable.createdAt,
      updatedAt: playersTable.updatedAt,
    });
  return {
    id: row!.id,
    name: row!.name,
    shardsBalance: row!.shardsBalance,
    profileToken: token,
    created: row!.createdAt.getTime() === row!.updatedAt.getTime(),
  };
}

/**
 * Adds a ledger row and updates the balance, once per (reason, ref).
 * Returns false when this (reason, ref) was already applied.
 */
export async function credit(
  tx: Tx,
  m: Db,
  playerId: string,
  delta: number,
  reason: string,
  ref: string,
): Promise<boolean> {
  const { sql, eq } = await import("drizzle-orm");
  const inserted = await tx
    .insert(m.walletLedgerTable)
    .values({ playerId, delta, reason, ref })
    .onConflictDoNothing()
    .returning({ id: m.walletLedgerTable.id });
  if (inserted.length === 0) return false;
  await tx
    .update(m.playersTable)
    .set({ shardsBalance: sql`${m.playersTable.shardsBalance} + ${delta}` })
    .where(eq(m.playersTable.id, playerId));
  logger.info({ playerId, delta, reason }, "Éclats ledger entry");
  return true;
}

// ── Account summary ───────────────────────────────────────────────────────────

export async function getAccount(player: PlayerRef) {
  const m = await loadDb();
  const { db, entitlementsTable, inventoryTable, equippedTable, playersTable } = m;
  const { eq, and, or, isNull, gt, sql } = await import("drizzle-orm");

  // Rewards verified by AdMob but never claimed (app closed, network lost):
  // credited now, so a watched video is never lost.
  await settlePendingAdRewards(player.id);

  const [balanceRow] = await db
    .select({ shardsBalance: playersTable.shardsBalance })
    .from(playersTable)
    .where(eq(playersTable.id, player.id));
  const entitlements = await db
    .select({ entitlement: entitlementsTable.entitlement, expiresAt: entitlementsTable.expiresAt, productId: entitlementsTable.productId })
    .from(entitlementsTable)
    .where(
      and(
        eq(entitlementsTable.playerId, player.id),
        or(isNull(entitlementsTable.expiresAt), gt(entitlementsTable.expiresAt, sql`now()`)),
      ),
    );
  const inventory = await db
    .select({ itemId: inventoryTable.itemId })
    .from(inventoryTable)
    .where(eq(inventoryTable.playerId, player.id));
  const equipped = await db
    .select({ slot: equippedTable.slot, itemId: equippedTable.itemId })
    .from(equippedTable)
    .where(eq(equippedTable.playerId, player.id));

  return {
    playerId: player.id,
    name: player.name,
    shardsBalance: balanceRow?.shardsBalance ?? 0,
    noAds: entitlements.some((e) => NO_ADS_ENTITLEMENTS.includes(e.entitlement)),
    entitlements: entitlements.map((e) => ({
      entitlement: e.entitlement,
      productId: e.productId,
      expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
    })),
    inventory: inventory.map((i) => i.itemId).sort(),
    equipped: Object.fromEntries(equipped.map((e) => [e.slot, e.itemId])) as Partial<Record<CosmeticSlot, string>>,
  };
}

// ── Shop ──────────────────────────────────────────────────────────────────────

export type BuyResult =
  | { ok: true; shardsBalance: number }
  | { ok: false; error: "unknown_item" | "not_for_sale" | "already_owned" | "insufficient_shards" };

export async function buyItem(player: PlayerRef, itemId: string): Promise<BuyResult> {
  const item = CATALOG_BY_ID.get(itemId);
  if (!item) return { ok: false, error: "unknown_item" };
  if (item.priceShards === null) return { ok: false, error: "not_for_sale" };
  const price = item.priceShards;

  const m = await loadDb();
  const { eq, and } = await import("drizzle-orm");
  return m.db.transaction(async (tx): Promise<BuyResult> => {
    // Lock the player row: two purchases at once can't both spend the same Éclats.
    const [row] = await tx
      .select({ balance: m.playersTable.shardsBalance })
      .from(m.playersTable)
      .where(eq(m.playersTable.id, player.id))
      .for("update");
    const balance = row?.balance ?? 0;
    const [owned] = await tx
      .select({ itemId: m.inventoryTable.itemId })
      .from(m.inventoryTable)
      .where(and(eq(m.inventoryTable.playerId, player.id), eq(m.inventoryTable.itemId, itemId)));
    if (owned) return { ok: false, error: "already_owned" };
    // A refund clawback can leave the balance negative: the shop is then closed.
    if (balance < price) return { ok: false, error: "insufficient_shards" };
    await tx.insert(m.inventoryTable).values({ playerId: player.id, itemId, source: "shop" });
    await credit(tx, m, player.id, -price, "spend_item", `${player.id}:${itemId}`);
    return { ok: true, shardsBalance: balance - price };
  });
}

export async function equipItem(
  player: PlayerRef,
  slot: CosmeticSlot,
  itemId: string | null,
): Promise<{ ok: true } | { ok: false; error: "unknown_item" | "wrong_slot" | "not_owned" }> {
  const m = await loadDb();
  const { eq, and } = await import("drizzle-orm");
  if (itemId === null) {
    await m.db
      .delete(m.equippedTable)
      .where(and(eq(m.equippedTable.playerId, player.id), eq(m.equippedTable.slot, slot)));
    return { ok: true };
  }
  const item = CATALOG_BY_ID.get(itemId);
  if (!item) return { ok: false, error: "unknown_item" };
  if (item.slot !== slot) return { ok: false, error: "wrong_slot" };
  const [owned] = await m.db
    .select({ itemId: m.inventoryTable.itemId })
    .from(m.inventoryTable)
    .where(and(eq(m.inventoryTable.playerId, player.id), eq(m.inventoryTable.itemId, itemId)));
  if (!owned) return { ok: false, error: "not_owned" };
  await m.db
    .insert(m.equippedTable)
    .values({ playerId: player.id, slot, itemId })
    .onConflictDoUpdate({ target: [m.equippedTable.playerId, m.equippedTable.slot], set: { itemId } });
  return { ok: true };
}

// ── Rewarded videos ───────────────────────────────────────────────────────────

export type OfferResult =
  | { ok: true; nonce: string; rewardKey: AdRewardKey; amount: number; expiresAt: string }
  | { ok: false; error: "unknown_reward" | "daily_cap_reached" | "too_many_offers" };

/**
 * Issues a nonce for one rewarded video. Caps are checked HERE, counting
 * rewards already verified plus offers still open, so that every video the
 * player is allowed to start can be credited afterwards.
 */
export async function createAdOffer(player: PlayerRef, adUnit: string, rewardKey: unknown): Promise<OfferResult> {
  if (!isAdRewardKey(rewardKey)) return { ok: false, error: "unknown_reward" };
  const { pool } = await loadDb();
  const cap = rewardDailyCap(rewardKey);
  const totalCap = remoteConfig().rw_total_daily_cap;

  const { rows } = await pool.query<{ key_used: string; total_used: string; offers_today: string }>(
    `SELECT
       (SELECT count(*) FROM ad_rewards WHERE player_id = $1 AND reward_key = $2 AND verified_at > now() - ${DAY})
     + (SELECT count(*) FROM ad_offers o WHERE o.player_id = $1 AND o.reward_key = $2 AND o.expires_at > now()
          AND NOT EXISTS (SELECT 1 FROM ad_rewards r WHERE r.nonce = o.nonce)) AS key_used,
       (SELECT count(*) FROM ad_rewards WHERE player_id = $1 AND verified_at > now() - ${DAY})
     + (SELECT count(*) FROM ad_offers o WHERE o.player_id = $1 AND o.expires_at > now()
          AND NOT EXISTS (SELECT 1 FROM ad_rewards r WHERE r.nonce = o.nonce)) AS total_used,
       (SELECT count(*) FROM ad_offers WHERE player_id = $1 AND created_at > now() - ${DAY}) AS offers_today`,
    [player.id, rewardKey],
  );
  const used = rows[0]!;
  if (Number(used.key_used) >= cap || Number(used.total_used) >= totalCap) {
    return { ok: false, error: "daily_cap_reached" };
  }
  // Offers that never turn into a video (no fill, closed early) are allowed, within reason.
  if (Number(used.offers_today) >= totalCap * 5) return { ok: false, error: "too_many_offers" };

  const nonce = randomBytes(16).toString("base64url");
  const expiresAt = new Date(Date.now() + AD_OFFER_TTL_MS);
  const m = await loadDb();
  await m.db.insert(m.adOffersTable).values({ nonce, playerId: player.id, adUnit: adUnit.slice(0, 100), rewardKey, expiresAt });
  return { ok: true, nonce, rewardKey, amount: rewardAmount(rewardKey), expiresAt: expiresAt.toISOString() };
}

export type SsvRecordResult = "recorded" | "duplicate" | "unknown_offer" | "user_mismatch" | "expired_offer" | "missing_fields";

// The SSV callback may arrive a bit after the offer expired (long video).
const SSV_GRACE_MS = 10 * 60_000;

/** Stores a reward whose AdMob signature was verified (does not credit yet). */
export async function recordVerifiedAdReward(p: {
  transactionId: string | null;
  userId: string | null;
  customData: string | null;
  adUnit: string | null;
}): Promise<SsvRecordResult> {
  if (!p.transactionId || !p.userId || !p.customData) return "missing_fields";
  const m = await loadDb();
  const { eq } = await import("drizzle-orm");
  const [offer] = await m.db.select().from(m.adOffersTable).where(eq(m.adOffersTable.nonce, p.customData));
  if (!offer) return "unknown_offer";
  if (offer.playerId !== p.userId) return "user_mismatch";
  if (offer.expiresAt.getTime() + SSV_GRACE_MS < Date.now()) return "expired_offer";
  const inserted = await m.db
    .insert(m.adRewardsTable)
    .values({
      transactionId: p.transactionId.slice(0, 200),
      playerId: offer.playerId,
      nonce: offer.nonce,
      adUnit: (p.adUnit ?? offer.adUnit).slice(0, 100),
      rewardKey: offer.rewardKey,
    })
    .onConflictDoNothing()
    .returning({ id: m.adRewardsTable.transactionId });
  return inserted.length > 0 ? "recorded" : "duplicate";
}

export type ClaimResult =
  | { status: "credited" | "already_claimed"; amount: number; shardsBalance: number }
  | { status: "pending" }
  | { status: "unknown_offer" };

async function consumeReward(m: Db, playerId: string, nonce: string): Promise<number | null> {
  const { eq, and, isNull, sql } = await import("drizzle-orm");
  return m.db.transaction(async (tx) => {
    const [reward] = await tx
      .update(m.adRewardsTable)
      .set({ consumedAt: sql`now()` })
      .where(
        and(
          eq(m.adRewardsTable.nonce, nonce),
          eq(m.adRewardsTable.playerId, playerId),
          isNull(m.adRewardsTable.consumedAt),
        ),
      )
      .returning();
    if (!reward) return null;
    const key = reward.rewardKey;
    const amount = isAdRewardKey(key) ? rewardAmount(key) : 0;
    if (amount > 0) await credit(tx, m, playerId, amount, `ad_${key}`, reward.transactionId);
    return amount;
  });
}

export async function claimAdReward(player: PlayerRef, nonce: string): Promise<ClaimResult> {
  const m = await loadDb();
  const { eq, and } = await import("drizzle-orm");
  const balance = async () => {
    const [row] = await m.db
      .select({ b: m.playersTable.shardsBalance })
      .from(m.playersTable)
      .where(eq(m.playersTable.id, player.id));
    return row?.b ?? 0;
  };

  const amount = await consumeReward(m, player.id, nonce);
  if (amount !== null) return { status: "credited", amount, shardsBalance: await balance() };

  const [reward] = await m.db
    .select()
    .from(m.adRewardsTable)
    .where(and(eq(m.adRewardsTable.nonce, nonce), eq(m.adRewardsTable.playerId, player.id)));
  if (reward) {
    const key = reward.rewardKey;
    return { status: "already_claimed", amount: isAdRewardKey(key) ? rewardAmount(key) : 0, shardsBalance: await balance() };
  }
  const [offer] = await m.db
    .select()
    .from(m.adOffersTable)
    .where(and(eq(m.adOffersTable.nonce, nonce), eq(m.adOffersTable.playerId, player.id)));
  if (offer && offer.expiresAt.getTime() + SSV_GRACE_MS > Date.now()) return { status: "pending" };
  return { status: "unknown_offer" };
}

async function settlePendingAdRewards(playerId: string): Promise<void> {
  const m = await loadDb();
  const { eq, and, isNull } = await import("drizzle-orm");
  const pending = await m.db
    .select({ nonce: m.adRewardsTable.nonce })
    .from(m.adRewardsTable)
    .where(and(eq(m.adRewardsTable.playerId, playerId), isNull(m.adRewardsTable.consumedAt)));
  for (const { nonce } of pending) await consumeReward(m, playerId, nonce);
}

// ── Account deletion (Apple 5.1.1(v), RGPD art. 17) ──────────────────────────

/**
 * Deletes the player's personal data. The players row is kept, anonymised,
 * because finished games refer to it; purchases are kept (no personal data,
 * needed for accounting and refunds) but no longer lead back to anyone.
 */
export async function deleteAccount(playerId: string): Promise<void> {
  const m = await loadDb();
  const { eq, sql } = await import("drizzle-orm");
  await m.db.transaction(async (tx) => {
    for (const table of [m.adRewardsTable, m.adOffersTable, m.inventoryTable, m.equippedTable, m.entitlementsTable, m.walletLedgerTable]) {
      await tx.delete(table).where(eq(table.playerId, playerId));
    }
    await tx
      .update(m.playersTable)
      .set({
        name: "Joueur supprimé",
        tokenHash: `deleted:${randomBytes(16).toString("hex")}`,
        shardsBalance: 0,
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(m.playersTable.id, playerId));
  });
  logger.info({ playerId }, "Account deleted");
}
