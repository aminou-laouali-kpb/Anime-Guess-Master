import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, serial, timestamp, index } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

// History of finished games, one row per game.
export const gamesTable = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    mode: text("mode").notNull(), // "quick" | "private"
    ranked: boolean("ranked").notNull(),
    reason: text("reason").notNull(), // correct_guess | out_of_lives | forfeit | draw | tiebreak_lives | tiebreak_time (a draw stores the two players as winner/loser, either order)
    winnerId: text("winner_id").notNull().references(() => playersTable.id),
    loserId: text("loser_id").notNull().references(() => playersTable.id),
    ratingChange: integer("rating_change").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Serves the "ranked games between these two players in the last 24 h"
  // count run at the end of every ranked game (see recordGame in stats.ts).
  // Same definition as ensure-schema.ts.
  (t) => [
    index("games_pair_ranked_idx")
      .on(t.winnerId, t.loserId, t.createdAt)
      .where(sql`ranked`),
  ],
);

export type GameRow = typeof gamesTable.$inferSelect;
