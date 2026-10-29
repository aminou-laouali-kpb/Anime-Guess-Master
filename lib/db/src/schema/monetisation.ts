import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

// Monetisation (see docs/business-plan/MONETISATION_SPEC.md §5). The server is
// the only source of truth for entitlements, the Éclats balance and the
// inventory. Every table that receives external events has a unique key so
// a replayed webhook or a double claim never credits twice.

// Active rights (no_ads, plus, theme_<slug>, pass_s01…). expires_at null = lifetime.
export const entitlementsTable = pgTable(
  "entitlements",
  {
    id: serial("id").primaryKey(),
    playerId: text("player_id").notNull().references(() => playersTable.id),
    entitlement: text("entitlement").notNull(),
    productId: text("product_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    source: text("source").notNull(), // "revenuecat" | "sync" | "grant"
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("entitlements_player_entitlement_unique").on(t.playerId, t.entitlement)],
);

// Append-only Éclats ledger. (reason, ref) is unique: the same game, purchase
// or ad reward can only be credited once.
export const walletLedgerTable = pgTable(
  "wallet_ledger",
  {
    id: serial("id").primaryKey(),
    playerId: text("player_id").notNull().references(() => playersTable.id),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    ref: text("ref").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("wallet_ledger_reason_ref_unique").on(t.reason, t.ref),
    index("wallet_ledger_player_idx").on(t.playerId, t.createdAt),
  ],
);

// Store purchases as reported by RevenueCat (no payment data).
export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  playerId: text("player_id").notNull().references(() => playersTable.id),
  productId: text("product_id").notNull(),
  store: text("store").notNull(),
  storeTransactionId: text("store_transaction_id").notNull().unique(),
  rcEventId: text("rc_event_id").notNull().unique(),
  environment: text("environment").notNull(),
  status: text("status").notNull(), // "active" | "refunded"
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
});

// Every webhook event processed, by its provider id: the idempotency key.
export const webhookEventsTable = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // "revenuecat"
  type: text("type").notNull(),
  appUserId: text("app_user_id"),
  outcome: text("outcome").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// A rewarded-video proposal: the nonce goes to AdMob as custom_data and
// comes back, signed, in the SSV callback.
export const adOffersTable = pgTable(
  "ad_offers",
  {
    nonce: text("nonce").primaryKey(),
    playerId: text("player_id").notNull().references(() => playersTable.id),
    adUnit: text("ad_unit").notNull(),
    rewardKey: text("reward_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("ad_offers_player_idx").on(t.playerId, t.createdAt)],
);

// Rewards whose AdMob SSV signature was verified. transaction_id (from
// AdMob) and nonce (one reward per offer) are unique.
export const adRewardsTable = pgTable(
  "ad_rewards",
  {
    transactionId: text("transaction_id").primaryKey(),
    playerId: text("player_id").notNull().references(() => playersTable.id),
    nonce: text("nonce").notNull().unique(),
    adUnit: text("ad_unit").notNull(),
    rewardKey: text("reward_key").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [index("ad_rewards_player_idx").on(t.playerId, t.verifiedAt)],
);

// Cosmetics owned. The catalogue itself lives in the server code
// (artifacts/api-server/src/lib/monetisation/catalog.ts).
export const inventoryTable = pgTable(
  "inventory",
  {
    playerId: text("player_id").notNull().references(() => playersTable.id),
    itemId: text("item_id").notNull(),
    source: text("source").notNull(), // "shop" | "starter_pack" | "grant"
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: "inventory_player_id_item_id_pk", columns: [t.playerId, t.itemId] })],
);

// Cosmetics equipped, one per slot. Read by the server, never sent by the client.
export const equippedTable = pgTable(
  "equipped",
  {
    playerId: text("player_id").notNull().references(() => playersTable.id),
    slot: text("slot").notNull(), // card_back | frame | reaction_pack | victory_fx | board
    itemId: text("item_id").notNull(),
  },
  (t) => [primaryKey({ name: "equipped_player_id_slot_pk", columns: [t.playerId, t.slot] })],
);

// Reports of free questions / players (Apple guideline 1.2). Reporter and
// reported are SHA-256 hashes of profile tokens: no row needed in players.
export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterHash: text("reporter_hash").notNull(),
  reportedHash: text("reported_hash").notNull(),
  reason: text("reason").notNull(),
  roomCode: text("room_code"),
  content: text("content").notNull(), // free questions the reported player sent, JSON
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EntitlementRow = typeof entitlementsTable.$inferSelect;
export type WalletLedgerRow = typeof walletLedgerTable.$inferSelect;
