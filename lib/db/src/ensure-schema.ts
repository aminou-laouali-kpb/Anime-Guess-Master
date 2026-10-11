import type { Pool } from "pg";

// Creates the tables if they don't exist yet, so a fresh deployment database
// works without running `pnpm --filter @workspace/db run push` by hand.
// Keep in sync with ./schema (drizzle-kit push stays the tool for changes).
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
  `);
}
