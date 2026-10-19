import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestServer, TestClient, connectClient, startServer, wait } from "./helpers";

// Needs a Postgres database: set DATABASE_URL to run these (CI provides one).
const hasDatabase = Boolean(process.env["DATABASE_URL"]);

let server: TestServer;
let query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);

// Distinct public-looking addresses (TEST-NET-3), one per player.
let ipCounter = 1;
const newPlayer = async (opts: { ip?: string; profile?: string } = {}) =>
  track(await connectClient(server, { ip: opts.ip ?? `203.0.113.${ipCounter++}`, profile: opts.profile }));

async function myStats(client: TestClient) {
  client.emit("get_my_stats");
  return (await client.next("my_stats"))["stats"] as Record<string, unknown> | null;
}

/** Quick-match `winner` against `loser`; `winner` guesses right. Resolves with `winner`'s rating update. */
async function playQuickGame(winner: TestClient, loser: TestClient, outcome: "win" | "draw" = "win") {
  // Count arrivals rather than checking presence: the same two players may
  // have played before, so an older room_joined is already in their history.
  const joinedBefore = [winner.count("room_joined"), loser.count("room_joined")] as const;
  winner.emit("join_lobby", { name: "W" });
  await winner.next("in_queue");
  loser.emit("join_lobby", { name: "L" });
  await winner.until(
    () => winner.count("room_joined") > joinedBefore[0] && loser.count("room_joined") > joinedBefore[1],
    5000,
    "both players to be matched",
  );
  return finishGame(winner, loser, outcome);
}

async function finishGame(winner: TestClient, loser: TestClient, outcome: "win" | "draw" = "win") {
  const board = winner.last("room_joined")!["characters"] as { id: string }[];
  winner.emit("select_character", { characterId: board[0]!.id });
  loser.emit("select_character", { characterId: board[1]!.id });
  const start = await winner.next("game_start");
  if (outcome === "draw") {
    // The first player finds the character, then the other one does too.
    const winnerFirst = start["currentTurnPlayerId"] === winner.playerId;
    const [first, second] = winnerFirst ? [winner, loser] : [loser, winner];
    const [firstTarget, secondTarget] = winnerFirst ? [board[1]!.id, board[0]!.id] : [board[0]!.id, board[1]!.id];
    first.emit("make_guess", { characterId: firstTarget });
    await second.next("last_chance");
    second.emit("make_guess", { characterId: secondTarget });
    return winner.next("rating_update");
  }
  return guessToWin(winner, loser, start["currentTurnPlayerId"] === winner.playerId, board);
}

/**
 * `winner` finds the loser's character (board[1]). If the winner moved first, the loser
 * gets a last-chance guess, which they miss; otherwise the guess ends the game outright.
 */
async function guessToWin(winner: TestClient, loser: TestClient, winnerMovesFirst: boolean, board: { id: string }[]) {
  if (!winnerMovesFirst) {
    loser.emit("ask_question", { attribute: "gender", value: "male" }); // pass the turn
    await winner.next("question_answered");
  }
  winner.emit("make_guess", { characterId: board[1]!.id });
  if (winnerMovesFirst) {
    await loser.next("last_chance");
    loser.emit("make_guess", { characterId: board[2]!.id }); // a miss (not the winner's board[0])
  }
  return winner.next("rating_update");
}

async function leave(...clients: TestClient[]) {
  for (const c of clients) c.emit("leave_room");
  await wait(150);
}

describe.skipIf(!hasDatabase)("player stats and leaderboard (Postgres)", () => {
  beforeAll(async () => {
    server = await startServer();
    const { initStats } = await import("../lib/stats");
    await initStats(); // creates the tables, like index.ts does at startup
    const { pool } = await import("@workspace/db");
    query = (sql) => pool.query(sql);
  });

  afterAll(async () => {
    open.forEach((c) => c.close());
    await server.close();
  });

  beforeEach(async () => {
    await query("TRUNCATE games, players RESTART IDENTITY CASCADE");
  });

  it("issues a profile and has no stats before the first game", async () => {
    const p = await newPlayer();
    expect(p.profile).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await myStats(p)).toBeNull();
  });

  it("ranks a first quick game: +20 / -20 Elo between new players (provisional K = 40)", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    const update = await playQuickGame(a, b);
    expect(update).toMatchObject({ ranked: true, delta: 20, rating: 1020 });
    await b.until(() => b.has("rating_update"), 3000, "the loser's rating update");
    expect(b.last("rating_update")).toMatchObject({ ranked: true, delta: -20, rating: 980 });
  });

  it("settles a draw with a small Elo transfer and no win or loss", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    await playQuickGame(a, b); // a: 1020, b: 980
    await leave(a, b);
    const drawUpdate = await playQuickGame(a, b, "draw");
    await b.until(() => b.count("rating_update") >= 2, 3000, "the second rating update");
    // The higher-rated player gives up two points to the lower-rated one.
    expect(drawUpdate).toMatchObject({ ranked: true, delta: -2, rating: 1018 });
    expect(b.last("rating_update")).toMatchObject({ ranked: true, delta: 2, rating: 982 });
    expect(await myStats(a)).toMatchObject({ gamesPlayed: 2, wins: 1, losses: 0, currentStreak: 0 });
    expect(await myStats(b)).toMatchObject({ gamesPlayed: 2, wins: 0, losses: 1, currentStreak: 0 });
  });

  it("counts private games in the stats but not in the rating", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    a.emit("create_room", { name: "A" });
    const { code } = await a.next("room_created");
    b.emit("join_room", { code, name: "B" });
    await a.until(() => a.last("room_joined") !== undefined);
    const update = await finishGame(a, b);
    expect(update).toMatchObject({ ranked: false, delta: 0 });
    expect(await myStats(a)).toMatchObject({ gamesPlayed: 1, wins: 1, rankedGames: 0, rating: 1000, currentStreak: 1 });
  });

  it("never ranks a game between two players on the same network", async () => {
    const [a, b] = [await newPlayer({ ip: "203.0.113.200" }), await newPlayer({ ip: "203.0.113.200" })];
    expect(await playQuickGame(a, b)).toMatchObject({ ranked: false });
  });

  it("never ranks a game between two tabs of the same profile", async () => {
    const a = await newPlayer();
    const tab2 = await newPlayer({ profile: a.profile });
    expect(await playQuickGame(a, tab2)).toMatchObject({ ranked: false });
  });

  it("doesn't rank a rematch", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    expect(await playQuickGame(a, b)).toMatchObject({ ranked: true });
    a.emit("request_rematch");
    await b.next("rematch_requested");
    b.emit("accept_rematch");
    await a.next("rematch_started");
    await b.until(() => b.count("rematch_started") > 0);
    const board = a.last("rematch_started")!["characters"] as { id: string }[];
    a.emit("select_character", { characterId: board[0]!.id });
    b.emit("select_character", { characterId: board[1]!.id });
    const start = await a.next("game_start");
    const update = await guessToWin(a, b, start["currentTurnPlayerId"] === a.playerId, board);
    expect(update).toMatchObject({ ranked: false, delta: 0 });
  });

  it("ranks at most 2 games per pair of players per day", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    const results: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      results.push((await playQuickGame(a, b))["ranked"] as boolean);
      await leave(a, b);
    }
    expect(results).toEqual([true, true, false]);
  });

  /** Quick-matches a and b and starts the game; resolves with whose turn it is. */
  async function startQuickGame(a: TestClient, b: TestClient) {
    a.emit("join_lobby", { name: "A" });
    await a.next("in_queue");
    b.emit("join_lobby", { name: "B" });
    await a.until(() => a.last("room_joined") !== undefined && b.last("room_joined") !== undefined);
    const board = a.last("room_joined")!["characters"] as { id: string }[];
    a.emit("select_character", { characterId: board[0]!.id });
    b.emit("select_character", { characterId: board[1]!.id });
    const start = await a.next("game_start");
    return start["currentTurnPlayerId"] === a.playerId ? { mover: a, other: b } : { mover: b, other: a };
  }

  it("counts leaving right away as a loss, but doesn't rank it", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    await startQuickGame(a, b);
    b.emit("leave_room");
    expect(await a.next("rating_update")).toMatchObject({ ranked: false, delta: 0 });
    expect(await myStats(b)).toMatchObject({ losses: 1, currentStreak: 0, rankedGames: 0, rating: 1000 });
  });

  it("ranks leaving mid-game once both players have asked two questions", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    const { mover, other } = await startQuickGame(a, b);
    for (const asker of [mover, other, mover, other]) {
      const answered = asker.count("question_answered");
      asker.emit("ask_question", { attribute: "gender", value: "male" });
      await asker.until(() => asker.count("question_answered") > answered, 3000, "the answer");
    }
    b.emit("leave_room");
    expect(await a.next("rating_update")).toMatchObject({ ranked: true, delta: 20 });
    expect(await myStats(b)).toMatchObject({ losses: 1, rankedGames: 1, rating: 980 });
  });

  it("doesn't rank leaving when only one player really played", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    const { mover, other } = await startQuickGame(a, b);
    // Three questions in all: the mover asks two, the other one only one.
    for (const asker of [mover, other, mover]) {
      const answered = asker.count("question_answered");
      asker.emit("ask_question", { attribute: "gender", value: "male" });
      await asker.until(() => asker.count("question_answered") > answered, 3000, "the answer");
    }
    other.emit("leave_room");
    expect(await mover.next("rating_update")).toMatchObject({ ranked: false });
  });

  it("never ranks a game between two addresses of the same IPv6 /64", async () => {
    const [a, b] = [await newPlayer({ ip: "2001:db8:5:6::a" }), await newPlayer({ ip: "2001:db8:5:6:ffff::b" })];
    expect(await playQuickGame(a, b)).toMatchObject({ ranked: false });
  });

  it("doesn't record games against the computer", async () => {
    const h = await newPlayer();
    h.emit("play_vs_bot", { name: "H", level: "easy" });
    const joined = await h.next("room_joined");
    const board = joined["characters"] as { id: string }[];
    await h.until(() => h.has("opponent_ready"), 4000, "computer ready");
    h.emit("select_character", { characterId: board[0]!.id });
    await h.until(() => h.has("game_start"), 3000, "game start");
    h.emit("leave_room");
    await wait(300);
    expect((await query("SELECT count(*)::int AS n FROM games")).rows[0]!["n"]).toBe(0);
  });

  it("lists players on the leaderboard after 5 ranked games, best first, without exposing tokens", async () => {
    const alice = await newPlayer();
    for (let i = 0; i < 5; i++) {
      const opponent = await newPlayer();
      await playQuickGame(alice, opponent);
      await leave(alice, opponent);
    }
    const res = await fetch(`${server.url}/api/leaderboard`, { headers: { "X-Forwarded-For": "203.0.113.250" } });
    const board = (await res.json()) as { enabled: boolean; entries: Record<string, unknown>[] };
    expect(board.enabled).toBe(true);
    expect(board.entries).toHaveLength(1);
    expect(board.entries[0]).toMatchObject({ rank: 1, rankedGames: 5, wins: 5, losses: 0 });
    expect(JSON.stringify(board)).not.toContain(alice.profile);
    expect(board.entries[0]).not.toHaveProperty("tokenHash");

    const mine = await myStats(alice);
    expect(mine).toMatchObject({ rank: 1, rating: board.entries[0]!["rating"] });
  });

  it("keeps stats when the same profile reconnects later", async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    await playQuickGame(a, b);
    const profile = a.profile;
    a.close();
    const again = await newPlayer({ profile });
    expect(await myStats(again)).toMatchObject({ wins: 1, gamesPlayed: 1 });
  });
});
