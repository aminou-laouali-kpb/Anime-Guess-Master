import type { Pool } from "pg";

// Creates the tables if they don't exist yet, so a fresh deployment database
// works without running `pnpm --filter @workspace/db run push` by hand.
// Keep in sync with ./schema: same names, same constraint names as what
// drizzle-kit generates (drizzle-kit push stays the tool for changes).
// Columns added after the first release use ADD COLUMN IF NOT EXISTS so an
// existing production database is upgraded in place.
export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id text PRIMARY KEY,
      token_hash text NOT NULL CONSTRAINT players_token_hash_unique UNIQUE,
      name text NOT NULL,
      rating integer NOT NULL DEFAULT 1000,
      games_played integer NOT NULL DEFAULT 0,
      ranked_games integer NOT NULL DEFAULT 0,
      wins integer NOT NULL DEFAULT 0,
      losses integer NOT NULL DEFAULT 0,
      current_streak integer NOT NULL DEFAULT 0,
      best_streak integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE players ADD COLUMN IF NOT EXISTS shards_balance integer NOT NULL DEFAULT 0;
    ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    CREATE INDEX IF NOT EXISTS players_rating_idx ON players (rating);

    CREATE TABLE IF NOT EXISTS games (
      id serial PRIMARY KEY,
      mode text NOT NULL,
      ranked boolean NOT NULL,
      reason text NOT NULL,
      winner_id text NOT NULL CONSTRAINT games_winner_id_players_id_fk REFERENCES players(id),
      loser_id text NOT NULL CONSTRAINT games_loser_id_players_id_fk REFERENCES players(id),
      rating_change integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE games ADD COLUMN IF NOT EXISTS shared_network boolean NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS entitlements (
      id serial PRIMARY KEY,
      player_id text NOT NULL CONSTRAINT entitlements_player_id_players_id_fk REFERENCES players(id),
      entitlement text NOT NULL,
      product_id text,
      expires_at timestamptz,
      source text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT entitlements_player_entitlement_unique UNIQUE (player_id, entitlement)
    );

    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id serial PRIMARY KEY,
      player_id text NOT NULL CONSTRAINT wallet_ledger_player_id_players_id_fk REFERENCES players(id),
      delta integer NOT NULL,
      reason text NOT NULL,
      ref text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT wallet_ledger_reason_ref_unique UNIQUE (reason, ref)
    );
    CREATE INDEX IF NOT EXISTS wallet_ledger_player_idx ON wallet_ledger (player_id, created_at);

    CREATE TABLE IF NOT EXISTS purchases (
      id serial PRIMARY KEY,
      player_id text NOT NULL CONSTRAINT purchases_player_id_players_id_fk REFERENCES players(id),
      product_id text NOT NULL,
      store text NOT NULL,
      store_transaction_id text NOT NULL CONSTRAINT purchases_store_transaction_id_unique UNIQUE,
      rc_event_id text NOT NULL CONSTRAINT purchases_rc_event_id_unique UNIQUE,
      environment text NOT NULL,
      status text NOT NULL,
      purchased_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id text PRIMARY KEY,
      source text NOT NULL,
      type text NOT NULL,
      app_user_id text,
      outcome text NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ad_offers (
      nonce text PRIMARY KEY,
      player_id text NOT NULL CONSTRAINT ad_offers_player_id_players_id_fk REFERENCES players(id),
      ad_unit text NOT NULL,
      reward_key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ad_offers_player_idx ON ad_offers (player_id, created_at);

    CREATE TABLE IF NOT EXISTS ad_rewards (
      transaction_id text PRIMARY KEY,
      player_id text NOT NULL CONSTRAINT ad_rewards_player_id_players_id_fk REFERENCES players(id),
      nonce text NOT NULL CONSTRAINT ad_rewards_nonce_unique UNIQUE,
      ad_unit text NOT NULL,
      reward_key text NOT NULL,
      verified_at timestamptz NOT NULL DEFAULT now(),
      consumed_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS ad_rewards_player_idx ON ad_rewards (player_id, verified_at);

    CREATE TABLE IF NOT EXISTS inventory (
      player_id text NOT NULL CONSTRAINT inventory_player_id_players_id_fk REFERENCES players(id),
      item_id text NOT NULL,
      source text NOT NULL,
      acquired_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT inventory_player_id_item_id_pk PRIMARY KEY (player_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS equipped (
      player_id text NOT NULL CONSTRAINT equipped_player_id_players_id_fk REFERENCES players(id),
      slot text NOT NULL,
      item_id text NOT NULL,
      CONSTRAINT equipped_player_id_slot_pk PRIMARY KEY (player_id, slot)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id serial PRIMARY KEY,
      reporter_hash text NOT NULL,
      reported_hash text NOT NULL,
      reason text NOT NULL,
      room_code text,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}
