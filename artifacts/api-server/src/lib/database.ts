import { createHash } from "crypto";

// Postgres is optional. Without DATABASE_URL the game runs exactly as before;
// stats, leaderboard and monetisation report themselves as disabled.
export const databaseEnabled = Boolean(process.env["DATABASE_URL"]);

// The db package throws at import time without DATABASE_URL, so load it only
// when the database is enabled.
type DbModule = typeof import("@workspace/db");
let dbModule: Promise<DbModule> | null = null;

export function loadDb(): Promise<DbModule> {
  dbModule ??= import("@workspace/db")
    .then(async (m) => {
      await m.ensureSchema(m.pool);
      return m;
    })
    .catch((err) => {
      // Database down: retry on the next request instead of caching the failure.
      dbModule = null;
      throw err;
    });
  return dbModule;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Profile tokens are 24 random bytes, base64url.
export const PROFILE_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
