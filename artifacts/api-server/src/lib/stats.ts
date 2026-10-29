import { randomBytes } from "crypto";
import { logger } from "./logger";
import { databaseEnabled, hashToken, loadDb } from "./database";
import { rankingLimits } from "./limits";

// Player statistics and the leaderboard, stored in Postgres. Everything here
// is optional: without DATABASE_URL the game runs exactly as before and the
// stats features report themselves as disabled.

export const statsEnabled = databaseEnabled;

const START_RATING = 1000;
const MIN_RATING = 100;
const K_FACTOR = 32;
// Players only show up on the leaderboard after this many ranked games.
export const MIN_RANKED_GAMES = 5;
// The same two players can't farm each other: only this many ranked games
// per pair per 24 h count for the leaderboard.
const MAX_RANKED_PER_PAIR_PER_DAY = 2;
const LEADERBOARD_SIZE = 20;
const LEADERBOARD_CACHE_MS = 15_000;

export interface Participant {
  profileToken: string;
  name: string;
}

export interface RatingUpdate {
  ranked: boolean;
  rating: number;
  delta: number;
}

export interface PlayerStats {
  id: string;
  name: string;
  rating: number;
  rank: number | null; // null until MIN_RANKED_GAMES ranked games
  gamesPlayed: number;
  rankedGames: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  rankedGames: number;
}

export async function initStats(): Promise<void> {
  if (!statsEnabled) {
    logger.info("DATABASE_URL not set: player stats and leaderboard are disabled");
    return;
  }
  await loadDb();
  logger.info("Player stats enabled");
}

export function newProfileToken(): string {
  return randomBytes(24).toString("base64url");
}

// Standard Elo: an upset earns more points than an expected win.
export function eloDelta(winnerRating: number, loserRating: number): number {
  const expected = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  return Math.max(1, Math.round(K_FACTOR * (1 - expected)));
}

export async function recordGame(params: {
  winner: Participant;
  loser: Participant;
  ranked: boolean;
  // Both players came from the same public IP, both on the mobile app
  // (carrier CGNAT). Ranked only for established profiles, a few times a day.
  sharedNetwork?: boolean;
  mode: "quick" | "private";
  reason: string;
}): Promise<{ winner: RatingUpdate; loser: RatingUpdate } | null> {
  if (!statsEnabled) return null;
  const { db, playersTable, gamesTable } = await loadDb();
  const { sql, eq, and, or, gt, count } = await import("drizzle-orm");
  const sharedNetwork = params.sharedNetwork ?? false;

  return db.transaction(async (tx) => {
    // Creates the profile on its first finished game; the upsert also locks
    // the row so concurrent results for the same player apply one by one.
    const upsert = async (p: Participant) => {
      const [row] = await tx
        .insert(playersTable)
        .values({
          id: randomBytes(9).toString("base64url"),
          tokenHash: hashToken(p.profileToken),
          name: p.name,
          rating: START_RATING,
        })
        .onConflictDoUpdate({
          target: playersTable.tokenHash,
          set: { name: p.name, updatedAt: sql`now()` },
        })
        .returning();
      return row!;
    };

    // Always lock the two rows in the same order (by token hash): two results
    // for the same pair settling at once could otherwise deadlock.
    const winnerFirst = hashToken(params.winner.profileToken) <= hashToken(params.loser.profileToken);
    const first = await upsert(winnerFirst ? params.winner : params.loser);
    const second = await upsert(winnerFirst ? params.loser : params.winner);
    const winner = winnerFirst ? first : second;
    const loser = winnerFirst ? second : first;

    // Same profile on both sides (two tabs): never ranked.
    let ranked = params.ranked && winner.id !== loser.id;
    if (ranked) {
      const [{ value }] = await tx
        .select({ value: count() })
        .from(gamesTable)
        .where(
          and(
            eq(gamesTable.ranked, true),
            gt(gamesTable.createdAt, sql`now() - interval '24 hours'`),
            or(
              and(eq(gamesTable.winnerId, winner.id), eq(gamesTable.loserId, loser.id)),
              and(eq(gamesTable.winnerId, loser.id), eq(gamesTable.loserId, winner.id)),
            ),
          ),
        );
      if (Number(value) >= MAX_RANKED_PER_PAIR_PER_DAY) ranked = false;
    }
    // Same public IP: the "two different addresses" rule can't tell two
    // strangers behind a carrier's CGNAT from one person with two phones.
    // Fresh profiles (the cheap way to farm) never rank on a shared network,
    // and established ones only a few times a day.
    if (ranked && sharedNetwork) {
      const limits = rankingLimits();
      if (
        winner.rankedGames < limits.sharedNetworkMinRankedGames ||
        loser.rankedGames < limits.sharedNetworkMinRankedGames
      ) {
        ranked = false;
      } else {
        for (const id of [winner.id, loser.id]) {
          const [{ value }] = await tx
            .select({ value: count() })
            .from(gamesTable)
            .where(
              and(
                eq(gamesTable.ranked, true),
                eq(gamesTable.sharedNetwork, true),
                gt(gamesTable.createdAt, sql`now() - interval '24 hours'`),
                or(eq(gamesTable.winnerId, id), eq(gamesTable.loserId, id)),
              ),
            );
          if (Number(value) >= limits.sharedNetworkRankedPerDay) ranked = false;
        }
      }
    }
    const delta = ranked ? eloDelta(winner.rating, loser.rating) : 0;
    const loserRating = Math.max(MIN_RATING, loser.rating - delta);
    const rankedInc = ranked ? 1 : 0;

    await tx
      .update(playersTable)
      .set({
        rating: winner.rating + delta,
        gamesPlayed: sql`${playersTable.gamesPlayed} + 1`,
        rankedGames: sql`${playersTable.rankedGames} + ${rankedInc}`,
        wins: sql`${playersTable.wins} + 1`,
        currentStreak: sql`${playersTable.currentStreak} + 1`,
        bestStreak: sql`greatest(${playersTable.bestStreak}, ${playersTable.currentStreak} + 1)`,
        updatedAt: sql`now()`,
      })
      .where(eq(playersTable.id, winner.id));

    if (loser.id !== winner.id) {
      await tx
        .update(playersTable)
        .set({
          rating: loserRating,
          gamesPlayed: sql`${playersTable.gamesPlayed} + 1`,
          rankedGames: sql`${playersTable.rankedGames} + ${rankedInc}`,
          losses: sql`${playersTable.losses} + 1`,
          currentStreak: 0,
          updatedAt: sql`now()`,
        })
        .where(eq(playersTable.id, loser.id));
    }

    await tx.insert(gamesTable).values({
      mode: params.mode,
      ranked,
      reason: params.reason,
      winnerId: winner.id,
      loserId: loser.id,
      ratingChange: delta,
      sharedNetwork,
    });

    leaderboardCache = null;
    return {
      winner: { ranked, rating: winner.rating + delta, delta },
      loser: { ranked, rating: loserRating, delta: -(loser.rating - loserRating) },
    };
  });
}

export async function getPlayerStats(profileToken: string): Promise<PlayerStats | null> {
  if (!statsEnabled) return null;
  const { db, playersTable } = await loadDb();
  const { eq, and, gt, gte, count, isNull } = await import("drizzle-orm");

  const [row] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.tokenHash, hashToken(profileToken)));
  if (!row) return null;

  let rank: number | null = null;
  if (row.rankedGames >= MIN_RANKED_GAMES) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(playersTable)
      .where(
        and(
          gte(playersTable.rankedGames, MIN_RANKED_GAMES),
          gt(playersTable.rating, row.rating),
          isNull(playersTable.deletedAt),
        ),
      );
    rank = Number(value) + 1;
  }

  return {
    id: row.id,
    name: row.name,
    rating: row.rating,
    rank,
    gamesPlayed: row.gamesPlayed,
    rankedGames: row.rankedGames,
    wins: row.wins,
    losses: row.losses,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
  };
}

let leaderboardCache: { at: number; entries: LeaderboardEntry[] } | null = null;

/** Forget the cached leaderboard (after an account deletion). */
export function invalidateLeaderboard(): void {
  leaderboardCache = null;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!statsEnabled) return [];
  if (leaderboardCache && Date.now() - leaderboardCache.at < LEADERBOARD_CACHE_MS) {
    return leaderboardCache.entries;
  }
  const { db, playersTable } = await loadDb();
  const { gte, desc, asc, and, isNull } = await import("drizzle-orm");

  const rows = await db
    .select()
    .from(playersTable)
    .where(and(gte(playersTable.rankedGames, MIN_RANKED_GAMES), isNull(playersTable.deletedAt)))
    // Ties: whoever reached the rating first (wins also count unranked games, so not used).
    .orderBy(desc(playersTable.rating), asc(playersTable.createdAt))
    .limit(LEADERBOARD_SIZE);

  // Players with the same rating share a rank (1, 2, 2, 4…).
  const entries: LeaderboardEntry[] = [];
  rows.forEach((r, i) => {
    const prev = entries[i - 1];
    entries.push({
      rank: prev && prev.rating === r.rating ? prev.rank : i + 1,
      id: r.id,
      name: r.name,
      rating: r.rating,
      wins: r.wins,
      losses: r.losses,
      rankedGames: r.rankedGames,
    });
  });
  leaderboardCache = { at: Date.now(), entries };
  return entries;
}
