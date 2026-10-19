import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Game, type TestServer, connectClient, startPrivateGame, startServer, wait, whoseTurn } from "./helpers";

// GAME_TIME_SCALE=0.05 (see vitest.config.ts): turn 3 s, answer 2.25 s,
// selection 4.5 s, reconnect grace 2.25 s.

let server: TestServer;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);
const trackGame = (g: Game): Game => (track(g.a), track(g.b), g);

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  open.forEach((c) => c.close());
  await server.close();
});

describe("turn clocks", () => {
  it("announces the clock to the player who has to act", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover } = whoseTurn(g);
    const timer = g.a.last("timer")!;
    expect(timer["actingPlayerId"]).toBe(mover.playerId);
    expect(timer["msLeft"]).toBeGreaterThan(2000);
    expect(timer["msLeft"]).toBeLessThanOrEqual(3000);
  });

  it("costs a life and the turn when the player on turn does nothing", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    const timeout = await other.next("turn_timeout", 6000);
    expect(timeout).toMatchObject({ playerId: mover.playerId, lives: 2, while: "playing", currentTurnPlayerId: other.playerId });
  });

  it("costs a life when a question isn't answered, and the asker keeps playing", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    mover.emit("ask_question", { question: "Tu m'entends ?" });
    await other.next("question_asked");
    const timeout = await mover.next("turn_timeout", 6000);
    expect(timeout).toMatchObject({ playerId: other.playerId, lives: 2, while: "answering", currentTurnPlayerId: mover.playerId });
  });

  it("ends the game after three timeouts in a row", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    // `mover` never plays; `other` just passes each of its turns with a verified question.
    for (let i = 0; i < 2; i++) {
      await other.next("turn_timeout", 6000); // mover timed out, `other` now has the turn
      other.emit("ask_question", { attribute: "role", value: "main" });
      await mover.next("question_answered");
    }
    await other.until(() => other.has("game_over"), 6000, "game_over");
    expect(other.last("game_over")).toMatchObject({ winnerId: other.playerId, reason: "out_of_lives" });
    expect(mover.last("game_over")).toBeDefined();
  }, 20_000);

  it("picks a random character for a player who doesn't choose in time", async () => {
    const a = track(await connectClient(server));
    const b = track(await connectClient(server));
    a.emit("create_room", { name: "A" });
    const { code } = await a.next("room_created");
    b.emit("join_room", { code, name: "B" });
    await a.until(() => a.has("room_joined"));
    const board = (a.last("room_joined")!["characters"] as { id: string }[]).map((c) => c.id);

    a.emit("select_character", { characterId: board[0] }); // b stays silent
    const assigned = await b.next("character_assigned", 8000);
    expect(board).toContain(assigned["characterId"]);
    await a.until(() => a.has("game_start") && b.has("game_start"), 3000, "game start");
  });
});

describe("disconnections and the clock", () => {
  it("lets the clock keep running when the same player opens a second tab", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover } = whoseTurn(g);
    await wait(1200);
    const tab2 = track(await connectClient(server, { token: mover.token, profile: mover.profile }));
    const left = (tab2.last("state_sync")!["room"] as { timer: { msLeft: number } }).timer.msLeft;
    // 3000 ms clock, 1200 ms gone: a fresh clock would show ~3000.
    expect(left).toBeLessThan(2100);
    expect(left).toBeGreaterThan(0);
  });

  it("pauses the clock while a player is away and resumes it with the time left", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover } = whoseTurn(g);
    await wait(900);
    mover.socket.disconnect();
    await wait(1000); // the clock is paused during this second
    const back = track(await connectClient(server, { token: mover.token, profile: mover.profile }));
    const left = (back.last("state_sync")!["room"] as { timer: { msLeft: number } }).timer.msLeft;
    // ~3000 - 900 elapsed before leaving ≈ 2100. Not 3000 (restart) and not ~1100 (kept running).
    expect(left).toBeGreaterThan(1500);
    expect(left).toBeLessThan(2700);
  });

  it("turns repeated disconnections into a forfeit once the game's disconnection budget is spent", async () => {
    // Budget 4.5 s per player per game (90 s × 0.05), grace 2.25 s per disconnection.
    const g = trackGame(await startPrivateGame(server));
    const { token, profile } = g.b;
    let staller = g.b;
    for (let i = 0; i < 2; i++) {
      staller.socket.disconnect();
      expect((await g.a.next("opponent_disconnected"))["graceSeconds"]).toBeCloseTo(2.25);
      await wait(1900); // back just before the grace period ends
      const reconnected = g.a.next("opponent_reconnected");
      staller = track(await connectClient(server, { token, profile }));
      await reconnected;
    }
    expect(g.a.has("opponent_left")).toBe(false);

    // ~3.8 s of the 4.5 s budget is gone: this time the seat is only kept for what's left.
    staller.socket.disconnect();
    const grace = (await g.a.next("opponent_disconnected"))["graceSeconds"] as number;
    expect(grace).toBeGreaterThan(0);
    expect(grace).toBeLessThan(0.8);
    await g.a.next("opponent_left", 1500);
  }, 20_000);

  it("makes a player lose by forfeit once the grace period runs out", async () => {
    const g = trackGame(await startPrivateGame(server));
    g.b.socket.disconnect();
    expect(await g.a.next("opponent_disconnected")).toHaveProperty("graceSeconds");
    await g.a.next("opponent_left", 5000);
  });
});
