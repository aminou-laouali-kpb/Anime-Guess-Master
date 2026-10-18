import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestServer, TestClient, connectClient, startServer, wait } from "./helpers";

// Needs a Postgres database: set DATABASE_URL to run these (CI provides one).
const hasDatabase = Boolean(process.env["DATABASE_URL"]);

let server: TestServer;
let query: (sql: string) => Promise<{ rows: Record<string, any>[] }>;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);

// Distinct public-looking addresses (TEST-NET-3), one per player.
let ipCounter = 1;
const newPlayer = async (opts: { ip?: string; profile?: string } = {}) =>
  track(await connectClient(server, { ip: opts.ip ?? `203.0.113.${ipCounter++}`, profile: opts.profile }));

async function myStats(client: TestClient) {
  client.emit("get_my_stats");
  return (await client.next("my_stats"))["stats"] as Record<string, any> | null;
}

/** Quick-match `winner` against `loser`; `winner` guesses right. Resolves with `winner`'s rating update. */
async function playQuickGame(winner: TestClient, loser: TestClient) {
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
  return finishGame(winner, loser);
}

async function finishGame(winner: TestClient, loser: TestClient) {
  const board = winner.last("room_joined")!["characters"] as { id: string }[];
  winner.emit("select_character", { characterId: board[0]!.id });
  loser.emit("select_character", { characterId: board[1]!.id });
  const start = await winner.next("game_start");
  if (start["currentTurnPlayerId"] !== winner.playerId) {
    loser.emit("ask_question", { attribute: "gender", value: "male" }); // pass the turn
    await winner.next("question_answered");
  }
  winner.emit("make_guess", { characterId: board[1]!.id });
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

  it("ranks a first quick game: +16 / -16 Elo between new players", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    const update = await playQuickGame(a, b);
    expect(update).toMatchObject({ ranked: true, delta: 16, rating: 1016 });
    await b.until(() => b.has("rating_update"), 3000, "the loser's rating update");
    expect(b.last("rating_update")).toMatchObject({ ranked: true, delta: -16, rating: 984 });
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
    if (start["currentTurnPlayerId"] !== a.playerId) {
      b.emit("ask_question", { attribute: "gender", value: "male" });
      await a.next("question_answered");
    }
    a.emit("make_guess", { characterId: board[1]!.id });
    expect(await a.next("rating_update")).toMatchObject({ ranked: false, delta: 0 });
  });

  it("ranks at most 2 games per pair of players per day", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    const results: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      results.push((await playQuickGame(a, b))["ranked"]);
      await leave(a, b);
    }
    expect(results).toEqual([true, true, false]);
  });

  it("counts leaving mid-game as a loss", async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    a.emit("join_lobby", { name: "A" });
    await a.next("in_queue");
    b.emit("join_lobby", { name: "B" });
    await a.until(() => a.last("room_joined") !== undefined && b.last("room_joined") !== undefined);
    const board = a.last("room_joined")!["characters"] as { id: string }[];
    a.emit("select_character", { characterId: board[0]!.id });
    b.emit("select_character", { characterId: board[1]!.id });
    await a.until(() => a.has("game_start"));
    b.emit("leave_room");
    expect(await a.next("rating_update")).toMatchObject({ ranked: true, delta: 16 });
    expect(await myStats(b)).toMatchObject({ losses: 1, currentStreak: 0 });
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
    const board = (await res.json()) as { enabled: boolean; entries: Record<string, any>[] };
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
