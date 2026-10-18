import { pgTable, text, integer, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

// History of finished games, one row per game.
export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull(), // "quick" | "private"
  ranked: boolean("ranked").notNull(),
  reason: text("reason").notNull(), // correct_guess | out_of_lives | forfeit | draw (a draw stores the two players as winner/loser, either order)
  winnerId: text("winner_id").notNull().references(() => playersTable.id),
  loserId: text("loser_id").notNull().references(() => playersTable.id),
  ratingChange: integer("rating_change").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameRow = typeof gamesTable.$inferSelect;
