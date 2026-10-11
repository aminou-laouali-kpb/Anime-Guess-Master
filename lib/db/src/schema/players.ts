import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// One row per browser profile. There are no accounts: the browser keeps a
// secret profile token and only its SHA-256 hash is stored here.
export const playersTable = pgTable(
  "players",
  {
    id: text("id").primaryKey(), // public id, safe to show to other players
    tokenHash: text("token_hash").notNull().unique(),
    name: text("name").notNull(),
    rating: integer("rating").notNull().default(1000),
    gamesPlayed: integer("games_played").notNull().default(0),
    rankedGames: integer("ranked_games").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("players_rating_idx").on(t.rating)],
);

export type PlayerRow = typeof playersTable.$inferSelect;
