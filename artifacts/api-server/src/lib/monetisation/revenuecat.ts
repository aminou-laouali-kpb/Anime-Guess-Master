import { timingSafeEqual, createHash } from "crypto";
import { loadDb } from "../database";
import { logger } from "../logger";
import { grantFor } from "./catalog";
import { credit, type PlayerRef } from "./wallet";

// RevenueCat webhooks (https://www.revenuecat.com/docs/integrations/webhooks).
// RevenueCat validates receipts with Apple and Google; this server never
// trusts the app about purchases: it only acts on these webhooks (and on
// RevenueCat's REST API for the manual "sync" fallback).
//
// Idempotency: the event id is inserted into webhook_events in the SAME
// transaction as its effects. A replay finds the id and does nothing; a
// failure rolls everything back and RevenueCat retries.

export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_ids?: string[] | null;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  environment?: string;
  store?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  cancel_reason?: string;
  transferred_from?: string[];
  transferred_to?: string[];
}

export type WebhookOutcome =
  | "granted"
  | "refunded"
  | "expired"
  | "transferred"
  | "updated"
  | "noted"
  | "unknown_user"
  | "unknown_product"
  | "duplicate";

/** Constant-time check of the Authorization header against REVENUECAT_WEBHOOK_AUTH. */
export function webhookAuthorized(header: string | undefined): boolean {
  const secret = process.env["REVENUECAT_WEBHOOK_AUTH"];
  if (!secret || typeof header !== "string") return false;
  // RevenueCat sends the configured value as-is; accept it with or without "Bearer ".
  const candidates = [header, header.replace(/^Bearer\s+/i, "")];
  const digest = (v: string) => createHash("sha256").update(v).digest();
  const expected = digest(secret);
  return candidates.some((c) => timingSafeEqual(digest(c), expected));
}

export function parseEvent(body: unknown): RevenueCatEvent | null {
  const event = (body as { event?: unknown } | null)?.event as Record<string, unknown> | undefined;
  if (!event || typeof event !== "object") return null;
  if (typeof event["id"] !== "string" || !event["id"] || event["id"].length > 200) return null;
  if (typeof event["type"] !== "string" || event["type"].length > 64) return null;
  return event as unknown as RevenueCatEvent;
}

const ENTITLEMENT_RE = /^[a-z0-9_]{1,40}$/;

function entitlementsOf(event: RevenueCatEvent): string[] {
  const grant = event.product_id ? grantFor(event.product_id) : null;
  if (grant?.entitlement) return [grant.entitlement];
  if (grant) return [];
  // Unknown product: trust the entitlements configured in RevenueCat.
  return (event.entitlement_ids ?? []).filter((e) => typeof e === "string" && ENTITLEMENT_RE.test(e));
}

const msToDate = (ms: number | null | undefined) => (typeof ms === "number" && ms > 0 ? new Date(ms) : null);

type Db = Awaited<ReturnType<typeof loadDb>>;
type Tx = Parameters<Parameters<Db["db"]["transaction"]>[0]>[0];

async function findPlayerFor(tx: Tx, m: Db, ids: (string | undefined)[]): Promise<PlayerRef | "deleted" | null> {
  const { inArray } = await import("drizzle-orm");
  const candidates = [...new Set(ids.filter((i): i is string => typeof i === "string" && i.length > 0 && i.length <= 100))];
  if (candidates.length === 0) return null;
  const rows = await tx
    .select({ id: m.playersTable.id, name: m.playersTable.name, shardsBalance: m.playersTable.shardsBalance, deletedAt: m.playersTable.deletedAt })
    .from(m.playersTable)
    .where(inArray(m.playersTable.id, candidates));
  const alive = rows.find((r) => r.deletedAt === null);
  if (alive) return alive;
  return rows.length > 0 ? "deleted" : null;
}

async function upsertEntitlement(
  tx: Tx,
  m: Db,
  playerId: string,
  entitlement: string,
  productId: string | null,
  expiresAt: Date | null,
  source: string,
): Promise<void> {
  const { sql } = await import("drizzle-orm");
  const t = m.entitlementsTable;
  await tx
    .insert(t)
    .values({ playerId, entitlement, productId, expiresAt, source })
    .onConflictDoUpdate({
      target: [t.playerId, t.entitlement],
      set: {
        productId,
        source,
        updatedAt: sql`now()`,
        // Lifetime (null) wins; otherwise keep the later expiry, so events
        // arriving out of order can't shorten a subscription.
        expiresAt: sql`CASE WHEN ${t.expiresAt} IS NULL OR excluded.expires_at IS NULL THEN NULL
                            ELSE greatest(${t.expiresAt}, excluded.expires_at) END`,
      },
    });
}

/** Grants what a purchase gives: entitlement, Éclats, items. Idempotent per transaction. */
export async function applyGrant(
  tx: Tx,
  m: Db,
  player: PlayerRef,
  event: { productId: string; transactionId: string; expiresAt: Date | null; source: string; entitlements: string[] },
): Promise<void> {
  const grant = grantFor(event.productId);
  for (const e of event.entitlements) {
    await upsertEntitlement(tx, m, player.id, e, event.productId, event.expiresAt, event.source);
  }
  if (grant && grant.shards > 0) {
    await credit(tx, m, player.id, grant.shards, "purchase", `rc:${event.transactionId}`);
  }
  for (const itemId of grant?.items ?? []) {
    await tx
      .insert(m.inventoryTable)
      .values({ playerId: player.id, itemId, source: "purchase" })
      .onConflictDoNothing();
  }
}

export async function processRevenueCatEvent(event: RevenueCatEvent): Promise<WebhookOutcome> {
  const m = await loadDb();
  const { eq, and, inArray, sql } = await import("drizzle-orm");

  const outcome = await m.db.transaction(async (tx): Promise<WebhookOutcome> => {
    const fresh = await tx
      .insert(m.webhookEventsTable)
      .values({ id: event.id, source: "revenuecat", type: event.type, appUserId: event.app_user_id ?? null, outcome: "processing" })
      .onConflictDoNothing()
      .returning({ id: m.webhookEventsTable.id });
    if (fresh.length === 0) return "duplicate";

    const result = await handle(tx);
    await tx.update(m.webhookEventsTable).set({ outcome: result }).where(eq(m.webhookEventsTable.id, event.id));
    return result;
  });

  logger.info(
    { eventId: event.id, type: event.type, outcome, environment: event.environment, product: event.product_id },
    "RevenueCat webhook",
  );
  return outcome;

  async function handle(tx: Tx): Promise<WebhookOutcome> {
    const transactionId = event.transaction_id || event.id;
    const productId = event.product_id ?? "";

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "NON_RENEWING_PURCHASE":
      case "UNCANCELLATION":
      case "SUBSCRIPTION_EXTENDED":
      case "TEMPORARY_ENTITLEMENT_GRANT":
      case "REFUND_REVERSED": {
        const player = await findPlayerFor(tx, m, [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]);
        if (player === "deleted" || player === null) return "unknown_user";
        const entitlements = entitlementsOf(event);
        const grant = productId ? grantFor(productId) : null;
        if (!grant && entitlements.length === 0) return "unknown_product";

        const isPurchase = ["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"].includes(event.type);
        if (isPurchase && event.transaction_id) {
          await tx
            .insert(m.purchasesTable)
            .values({
              playerId: player.id,
              productId,
              store: (event.store ?? "unknown").toLowerCase(),
              storeTransactionId: event.transaction_id,
              rcEventId: event.id,
              environment: (event.environment ?? "unknown").toLowerCase(),
              status: "active",
              purchasedAt: msToDate(event.purchased_at_ms) ?? new Date(),
            })
            .onConflictDoNothing();
        }
        if (event.type === "REFUND_REVERSED") {
          await tx
            .update(m.purchasesTable)
            .set({ status: "active" })
            .where(eq(m.purchasesTable.storeTransactionId, transactionId));
          // Undo the clawback with its own ledger key.
          if (grant && grant.shards > 0) {
            await credit(tx, m, player.id, grant.shards, "refund_reversed", `rc:${transactionId}`);
          }
          for (const e of entitlements) {
            await upsertEntitlement(tx, m, player.id, e, productId || null, msToDate(event.expiration_at_ms), "revenuecat");
          }
          return "granted";
        }
        await applyGrant(tx, m, player, {
          productId,
          transactionId,
          // Only for purchase events: the others carry no new Éclats.
          expiresAt: msToDate(event.expiration_at_ms),
          source: "revenuecat",
          entitlements,
        });
        // Re-applying a grant for UNCANCELLATION etc. is safe: credits are keyed by transaction.
        return isPurchase ? "granted" : "updated";
      }

      case "CANCELLATION": {
        // Auto-renew turned off: the subscription runs until it expires (EXPIRATION).
        // CUSTOMER_SUPPORT = refunded by Apple / Google.
        if (event.cancel_reason !== "CUSTOMER_SUPPORT") return "noted";
        const player = await findPlayerFor(tx, m, [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]);
        if (player === "deleted" || player === null) return "unknown_user";
        await tx
          .update(m.purchasesTable)
          .set({ status: "refunded" })
          .where(eq(m.purchasesTable.storeTransactionId, transactionId));
        const entitlements = entitlementsOf(event);
        if (entitlements.length > 0) {
          await tx
            .delete(m.entitlementsTable)
            .where(and(eq(m.entitlementsTable.playerId, player.id), inArray(m.entitlementsTable.entitlement, entitlements)));
        }
        const grant = productId ? grantFor(productId) : null;
        if (grant && grant.shards > 0) {
          // May leave the balance negative: the shop then refuses purchases.
          // Items already bought are kept (MONETISATION_SPEC §5.4).
          await credit(tx, m, player.id, -grant.shards, "refund_clawback", `rc:${transactionId}`);
        }
        return "refunded";
      }

      case "EXPIRATION": {
        const player = await findPlayerFor(tx, m, [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]);
        if (player === "deleted" || player === null) return "unknown_user";
        const entitlements = entitlementsOf(event);
        if (entitlements.length === 0) return "noted";
        const at = msToDate(event.expiration_at_ms);
        await tx
          .update(m.entitlementsTable)
          .set({ expiresAt: at ?? sql`now()`, updatedAt: sql`now()` })
          .where(and(eq(m.entitlementsTable.playerId, player.id), inArray(m.entitlementsTable.entitlement, entitlements)));
        return "expired";
      }

      case "TRANSFER": {
        // Purchases moved to another app user (e.g. "Restore" on a new
        // profile). Entitlements follow; the Éclats wallet stays with its profile.
        const from = await findPlayerFor(tx, m, event.transferred_from ?? []);
        const to = await findPlayerFor(tx, m, event.transferred_to ?? []);
        if (to === null || to === "deleted") return "unknown_user";
        if (from !== null && from !== "deleted" && from.id !== to.id) {
          const rows = await tx.select().from(m.entitlementsTable).where(eq(m.entitlementsTable.playerId, from.id));
          for (const r of rows) {
            await upsertEntitlement(tx, m, to.id, r.entitlement, r.productId, r.expiresAt, "transfer");
          }
          await tx.delete(m.entitlementsTable).where(eq(m.entitlementsTable.playerId, from.id));
        }
        return "transferred";
      }

      default:
        // TEST, BILLING_ISSUE, PRODUCT_CHANGE (applies at the next RENEWAL),
        // SUBSCRIPTION_PAUSED, INVOICE_ISSUANCE…: nothing to change.
        return "noted";
    }
  }
}

// ── Manual sync (fallback when a webhook is late) ─────────────────────────────

interface SubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }>;
    non_subscriptions?: Record<string, { id?: string; store_transaction_id?: string }[]>;
  };
}

/**
 * Reads the player's purchases from RevenueCat's REST API (REVENUECAT_API_KEY,
 * a secret key) and applies them. Credits use the same ledger keys as the
 * webhook (rc:<store transaction id>), so the two paths never double-credit.
 */
export async function syncFromRevenueCat(player: PlayerRef): Promise<{ entitlements: number; purchases: number }> {
  const key = process.env["REVENUECAT_API_KEY"];
  if (!key) throw new Error("REVENUECAT_API_KEY not set");
  const base = (process.env["REVENUECAT_API_URL"] || "https://api.revenuecat.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/subscribers/${encodeURIComponent(player.id)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`RevenueCat API: HTTP ${res.status}`);
  const body = (await res.json()) as SubscriberResponse;
  const m = await loadDb();
  let entitlements = 0;
  let purchases = 0;
  await m.db.transaction(async (tx) => {
    for (const [name, e] of Object.entries(body.subscriber?.entitlements ?? {})) {
      if (!ENTITLEMENT_RE.test(name)) continue;
      const expiresAt = e.expires_date ? new Date(e.expires_date) : null;
      if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now())) continue;
      await upsertEntitlement(tx, m, player.id, name, e.product_identifier ?? null, expiresAt, "sync");
      entitlements += 1;
    }
    for (const [productId, list] of Object.entries(body.subscriber?.non_subscriptions ?? {})) {
      const grant = grantFor(productId);
      if (!grant || (grant.shards === 0 && grant.items.length === 0)) continue;
      for (const p of list) {
        const transactionId = p.store_transaction_id || p.id;
        if (!transactionId) continue;
        await applyGrant(tx, m, player, { productId, transactionId, expiresAt: null, source: "sync", entitlements: [] });
        purchases += 1;
      }
    }
  });
  return { entitlements, purchases };
}
