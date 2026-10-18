import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Without a timeout, an unreachable database would hang requests until the
  // OS gives up on the TCP connection (minutes).
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 10,
});

// An idle client can error (database restart, network drop). Without a
// listener Node treats it as an uncaught exception.
pool.on("error", (err) => {
  console.error("Postgres pool error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export { ensureSchema } from "./ensure-schema";
