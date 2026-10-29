import { createHash, randomBytes } from "crypto";
import { logger } from "./logger";

// Player statistics and the leaderboard, stored in Postgres. Everything here
// is optional: without DATABASE_URL the game runs exactly as before and the
// stats features report themselves as disabled.

export const statsEnabled = Boolean(process.env["DATABASE_URL"]);

const START_RATING = 1000;
export const MIN_RATING = 100;
// Provisional K: a new player's rating moves fast until it has found its
// level, then settles. Each player's change uses their own K.
export const K_PROVISIONAL = 40;
export const K_ESTABLISHED = 20;
export const PROVISIONAL_GAMES = 10;
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

// The db package throws at import time without DATABASE_URL, so load it only
// when stats are enabled.
type DbModule = typeof import("@workspace/db");
let dbModule: Promise<DbModule> | null = null;

function loadDb(): Promise<DbModule> {
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

export async function initStats(): Promise<void> {
  if (!statsEnabled) {
    logger.info("DATABASE_URL not set: player stats and leaderboard are disabled");
    return;
  }
  await loadDb();
  logger.info("Player stats enabled");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newProfileToken(): string {
  return randomBytes(24).toString("base64url");
}

// K for a player who has played `rankedGames` ranked games before this one.
export function kFactor(rankedGames: number): number {
  return rankedGames < PROVISIONAL_GAMES ? K_PROVISIONAL : K_ESTABLISHED;
}

// Standard Elo: an upset earns more points than an expected win. The size of
// the change for one player with factor `k` (at least 1 point).
export function eloDelta(winnerRating: number, loserRating: number, k = K_ESTABLISHED): number {
  const expected = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  return Math.max(1, Math.round(k * (1 - expected)));
}

// A draw is worth half a win: the higher-rated player gives up a few points,
// the lower-rated one gains them. Positive = points gained by `a` (with a's K).
export function eloDrawDelta(ratingA: number, ratingB: number, k = K_ESTABLISHED): number {
  const expected = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const raw = k * (0.5 - expected);
  // Rounded away from zero on .5 for both signs, so with the same K the two
  // sides mirror exactly (Math.round alone would create a point on .5).
  return (raw < 0 ? -Math.round(-raw) : Math.round(raw)) || 0;
}

export interface RatedPlayer {
  rating: number;
  rankedGames: number; // ranked games played before this one (sets the K)
}

// Rating changes for a ranked game. Each side uses its own K, so the two
// changes may differ in size. Nobody drops below MIN_RATING, and when the
// floor cuts a loss short, the other side gains no more than was actually
// lost: the floor never creates points.
export function ratingChanges(
  winner: RatedPlayer,
  loser: RatedPlayer,
  draw = false,
): { winner: number; loser: number } {
  const changes = draw
    ? {
        winner: eloDrawDelta(winner.rating, loser.rating, kFactor(winner.rankedGames)),
        loser: eloDrawDelta(loser.rating, winner.rating, kFactor(loser.rankedGames)),
      }
    : {
        winner: eloDelta(winner.rating, loser.rating, kFactor(winner.rankedGames)),
        loser: -eloDelta(winner.rating, loser.rating, kFactor(loser.rankedGames)),
      };

  // At most one side loses points: floor that loss, and if the floor cut
  // it short, cap the other side's gain to what was really lost.
  const players = { winner, loser };
  for (const [down, up] of [["winner", "loser"], ["loser", "winner"]] as const) {
    const change = changes[down];
    if (change >= 0) continue;
    const actual = Math.max(change, Math.min(0, MIN_RATING - players[down].rating));
    if (actual !== change) {
      changes[down] = actual;
      changes[up] = Math.min(changes[up], 0 - actual);
    }
  }
  return changes;
}

// For a draw, `winner` and `loser` are simply the two players (either order).
export async function recordGame(params: {
  winner: Participant;
  loser: Participant;
  ranked: boolean;
  mode: "quick" | "private";
  reason: string;
  draw?: boolean;
}): Promise<{ winner: RatingUpdate; loser: RatingUpdate } | null> {
  if (!statsEnabled) return null;
  const { db, playersTable, gamesTable } = await loadDb();
  const { sql, eq, and, or, gt, count } = await import("drizzle-orm");

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
    const draw = params.draw === true;
    const changes = ranked ? ratingChanges(winner, loser, draw) : { winner: 0, loser: 0 };
    const winnerRating = winner.rating + changes.winner;
    const loserRating = loser.rating + changes.loser;
    const rankedInc = ranked ? 1 : 0;

    await tx
      .update(playersTable)
      .set({
        rating: winnerRating,
        gamesPlayed: sql`${playersTable.gamesPlayed} + 1`,
        rankedGames: sql`${playersTable.rankedGames} + ${rankedInc}`,
        ...(draw
          ? { currentStreak: 0 }
          : {
              wins: sql`${playersTable.wins} + 1`,
              currentStreak: sql`${playersTable.currentStreak} + 1`,
              bestStreak: sql`greatest(${playersTable.bestStreak}, ${playersTable.currentStreak} + 1)`,
            }),
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
          ...(draw ? {} : { losses: sql`${playersTable.losses} + 1` }),
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
      // The (first) player's change; the other's may differ (own K, floor).
      ratingChange: changes.winner,
    });

    leaderboardCache = null;
    return {
      winner: { ranked, rating: winnerRating, delta: changes.winner },
      loser: { ranked, rating: loserRating, delta: changes.loser },
    };
  });
}

export async function getPlayerStats(profileToken: string): Promise<PlayerStats | null> {
  if (!statsEnabled) return null;
  const { db, playersTable } = await loadDb();
  const { eq, and, gt, gte, count } = await import("drizzle-orm");

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

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!statsEnabled) return [];
  if (leaderboardCache && Date.now() - leaderboardCache.at < LEADERBOARD_CACHE_MS) {
    return leaderboardCache.entries;
  }
  const { db, playersTable } = await loadDb();
  const { gte, desc, asc } = await import("drizzle-orm");

  const rows = await db
    .select()
    .from(playersTable)
    .where(gte(playersTable.rankedGames, MIN_RANKED_GAMES))
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
