import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type Game,
  type TestServer,
  connectClient,
  startPrivateGame,
  startServer,
  wait,
  whoseTurn,
} from "./helpers";
import characters from "../data/characters.json" with { type: "json" };

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

describe("robustness", () => {
  it("survives malformed payloads on every event", async () => {
    const bad = track(await connectClient(server));
    const events = [
      "join_lobby", "create_room", "join_room", "play_vs_bot", "leave_room", "select_character", "ask_question",
      "answer_question", "make_guess", "sync_eliminations", "request_rematch", "accept_rematch", "react", "get_my_stats",
    ];
    for (const event of events) {
      bad.emit(event);
      bad.emit(event, null);
      bad.emit(event, 42);
      bad.emit(event, "text");
      bad.emit(event, { code: 5, question: {}, eliminatedIds: "x", characterId: [], emoji: {}, name: {}, level: [] });
    }
    await wait(400);
    const probe = track(await connectClient(server)); // the server is still up
    expect(probe.connected).toBe(true);
  });

  it("cleans player names", async () => {
    const a = track(await connectClient(server));
    a.emit("create_room", { name: "  Al‮ice​ \n  Dupont  " });
    const { code } = await a.next("room_created");
    const b = track(await connectClient(server));
    b.emit("join_room", { code, name: "x".repeat(60) });
    await a.until(() => a.has("room_joined"));
    const names = (a.last("room_joined")!["players"] as { name: string }[]).map((p) => p.name);
    expect(names[0]).toBe("Alice Dupont");
    expect(names[1]).toBe("x".repeat(24));
  });

  it("gives an unknown room code a clear error", async () => {
    const a = track(await connectClient(server));
    a.emit("join_room", { code: "ZZZZZZ", name: "A" });
    const error = await a.next("error");
    expect(error["message"]).toMatch(/introuvable/);
  });
});

describe("a full game", () => {
  it("deals the same 24 distinct characters to both players", async () => {
    const g = trackGame(await startPrivateGame(server));
    const boardA = g.a.last("room_joined")!["characters"] as { id: string }[];
    expect(boardA).toHaveLength(24);
    expect(new Set(boardA.map((c) => c.id)).size).toBe(24);
    expect(JSON.stringify(g.a.last("room_joined")!["characters"])).toBe(JSON.stringify(g.b.last("room_joined")!["characters"]));
    for (const c of g.board) expect(c).toHaveProperty("imageUrl");
  });

  it("refuses a character that is not on the board", async () => {
    const a = track(await connectClient(server));
    const b = track(await connectClient(server));
    a.emit("create_room", { name: "A" });
    const { code } = await a.next("room_created");
    b.emit("join_room", { code, name: "B" });
    await a.until(() => a.has("room_joined"));
    const board = (a.last("room_joined")!["characters"] as { id: string }[]).map((c) => c.id);
    const offBoard = characters.find((c) => !board.includes(c.id))!;
    a.emit("select_character", { characterId: offBoard.id });
    await wait(200);
    expect(b.has("opponent_ready")).toBe(false);
  });

  it("answers verified questions from the real data, for both players", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    const secret = characters.find((c) => c.id === (mover === g.a ? g.bChar : g.aChar))!;

    mover.emit("ask_question", { attribute: "hairColor", value: secret.hairColor.toUpperCase() });
    const answer = await mover.next("question_answered");
    expect(answer).toMatchObject({ verified: true, answer: "yes", attribute: "hairColor", askerId: mover.playerId });
    expect(other.has("question_asked")).toBe(false); // the opponent is never asked
    await other.until(() => other.has("question_answered"));
    expect(other.last("question_answered")).toEqual(answer);
    expect(answer["currentTurnPlayerId"]).toBe(other.playerId); // turn passes

    other.emit("ask_question", { attribute: "anime", value: "A Show That Does Not Exist" });
    expect((await other.next("question_answered"))["answer"]).toBe("no");
  });

  it("only answers questions about whitelisted traits", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover } = whoseTurn(g);
    const before = mover.count("question_answered");
    for (const attribute of ["name", "id", "selectedCharacterId", "powers", "__proto__", "constructor"]) {
      mover.emit("ask_question", { attribute, value: "x" });
    }
    await wait(300);
    expect(mover.count("question_answered")).toBe(before);
  });

  it("runs the free-question flow, marked unverified", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    mover.emit("ask_question", { question: "Il porte un chapeau ?" });
    expect((await other.next("question_asked"))["question"]).toBe("Il porte un chapeau ?");
    expect(mover.has("awaiting_answer")).toBe(true);
    other.emit("answer_question", { answer: "no" });
    const result = await mover.next("question_answered");
    expect(result).toMatchObject({ verified: false, question: "Il porte un chapeau ?", answer: "no" });
    expect(result["currentTurnPlayerId"]).toBe(other.playerId);
  });

  it("enforces turns and pending questions", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);

    other.emit("ask_question", { attribute: "role", value: "main" });
    expect((await other.next("error"))["message"]).toMatch(/pas ton tour/);
    other.emit("make_guess", { characterId: g.board[2]!["id"] });
    expect((await other.next("error"))["message"]).toMatch(/pas ton tour/);

    mover.emit("ask_question", { question: "Question libre ?" });
    await other.next("question_asked");
    mover.emit("make_guess", { characterId: g.board[2]!["id"] });
    expect((await mover.next("error"))["message"]).toMatch(/Attends/);
    mover.emit("answer_question", { answer: "yes" });
    expect((await mover.next("error"))["message"]).toMatch(/propre question/);
  });

  it("ends on a correct guess and shows each player the OTHER player's character", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    const moverTarget = mover === g.a ? g.bChar : g.aChar;
    const otherTarget = mover === g.a ? g.aChar : g.bChar;

    mover.emit("make_guess", { characterId: moverTarget });
    await mover.until(() => mover.has("game_over") && other.has("game_over"));
    expect(mover.last("game_over")).toMatchObject({ winnerId: mover.playerId, reason: "correct_guess", opponentCharacterId: moverTarget });
    expect(other.last("game_over")).toMatchObject({ winnerId: mover.playerId, opponentCharacterId: otherTarget });
  });

  it("costs a life per wrong guess, and the third ends the game", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    const target = mover === g.a ? g.bChar : g.aChar;
    const wrong = g.board.map((c) => c["id"] as string).filter((id) => id !== target && id !== (mover === g.a ? g.aChar : g.bChar));
    const wrongGuess = async (guess: string) => {
      mover.emit("make_guess", { characterId: guess });
      return mover.next("wrong_guess");
    };
    const otherPlays = async () => {
      other.emit("ask_question", { attribute: "role", value: "main" });
      await mover.next("question_answered");
    };

    expect((await wrongGuess(wrong[0]!))["lives"]).toBe(2);
    await otherPlays();
    expect((await wrongGuess(wrong[1]!))["lives"]).toBe(1);
    await otherPlays();
    mover.emit("make_guess", { characterId: wrong[2]! });
    await mover.until(() => mover.has("game_over"));
    expect(mover.last("game_over")).toMatchObject({ winnerId: other.playerId, reason: "out_of_lives" });
  });

  it("keeps the opponent's character secret until the game ends", async () => {
    const g = trackGame(await startPrivateGame(server));
    g.a.socket.disconnect();
    const back = track(await connectClient(server, { token: g.a.token, profile: g.a.profile }));
    const snapshot = back.last("state_sync")!["room"] as Record<string, unknown>;
    expect(snapshot["opponentCharacterId"]).toBeNull();
    expect(snapshot["myCharacterId"]).toBe(g.aChar);
    // The board lists every character; nothing else in the snapshot may name the opponent's.
    const { characters: _board, ...rest } = snapshot;
    expect(JSON.stringify(rest)).not.toContain(g.bChar);
  });
});

describe("reconnection", () => {
  it("restores the game, including a pending question, with the session token", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    mover.emit("ask_question", { question: "Une épée ?" });
    await other.next("question_asked");

    other.socket.disconnect();
    await mover.next("opponent_disconnected");
    const back = track(await connectClient(server, { token: other.token, profile: other.profile }));
    const room = back.last("state_sync")!["room"] as Record<string, any>;
    expect(room["phase"]).toBe("playing");
    expect(room["pendingQuestion"]).toBe("Une épée ?");
    expect(room["opponentConnected"]).toBe(true);
    await mover.until(() => mover.has("opponent_reconnected"), 3000, "opponent_reconnected");
  });

  it("does not accept a public player id as a session token", async () => {
    const g = trackGame(await startPrivateGame(server));
    const impostor = track(await connectClient(server, { token: g.a.playerId }));
    expect(impostor.last("state_sync")!["room"]).toBeNull();
  });

  it("lets the newest tab win and closes the old one", async () => {
    const g = trackGame(await startPrivateGame(server));
    const tab2 = track(await connectClient(server, { token: g.a.token, profile: g.a.profile }));
    await g.a.until(() => !g.a.connected, 3000, "old tab to be disconnected");
    expect((tab2.last("state_sync")!["room"] as Record<string, unknown>)["phase"]).toBe("playing");
  });

  it("tells the opponent when a player leaves, even after the game ended", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    mover.emit("make_guess", { characterId: mover === g.a ? g.bChar : g.aChar });
    await other.until(() => other.has("game_over"));
    mover.emit("leave_room");
    await other.next("opponent_left");
  });
});

describe("rematch", () => {
  it("can't be forced, and deals a new board when accepted", async () => {
    const g = trackGame(await startPrivateGame(server));
    const { mover, other } = whoseTurn(g);
    mover.emit("make_guess", { characterId: mover === g.a ? g.bChar : g.aChar });
    await other.until(() => other.has("game_over"));

    other.emit("accept_rematch"); // nobody asked
    await wait(200);
    expect(other.has("rematch_started")).toBe(false);

    mover.emit("request_rematch");
    await other.next("rematch_requested");
    mover.emit("accept_rematch"); // the one who asked can't accept
    await wait(200);
    expect(mover.has("rematch_started")).toBe(false);

    other.emit("accept_rematch");
    const started = await mover.next("rematch_started");
    expect(started["characters"]).toHaveLength(24);
    expect(started["characters"].map((c: { id: string }) => c.id).join()).not.toBe(g.board.map((c) => c["id"]).join());
  });
});

describe("emoji reactions", () => {
  it("relays only the 8 allowed emojis, once per second, to a full room", async () => {
    const lonely = track(await connectClient(server));
    lonely.emit("create_room", { name: "Solo" });
    await lonely.next("room_created");
    lonely.emit("react", { emoji: "👍" });
    await wait(150);
    expect(lonely.count("reaction")).toBe(0);

    const g = trackGame(await startPrivateGame(server));
    g.a.emit("react", { emoji: "🔥" });
    expect(await g.b.next("reaction")).toEqual({ playerId: g.a.playerId, emoji: "🔥" });
    expect(g.a.count("reaction")).toBe(1); // the sender sees it too

    g.a.emit("react", { emoji: "😂" }); // within the cooldown
    await wait(200);
    expect(g.b.count("reaction")).toBe(1);

    await wait(900);
    for (const bad of ["💩", "<script>", "🔥🔥", 42, null, {}]) g.a.emit("react", { emoji: bad });
    await wait(200);
    expect(g.b.count("reaction")).toBe(1);
  });
});

describe("computer opponent", () => {
  it("plays a whole turn on its own, with verified questions only", async () => {
    const h = track(await connectClient(server));
    h.emit("play_vs_bot", { name: "Hana", level: "hard" });
    const joined = await h.next("room_joined");
    expect(joined["mode"]).toBe("bot");
    expect(joined["players"][1].name).toBe("Ordinateur (difficile)");
    await h.until(() => h.has("opponent_ready"), 4000, "the computer to pick a character");

    h.emit("select_character", { characterId: joined["characters"][0].id });
    const start = await h.next("game_start");
    if (start["currentTurnPlayerId"] === h.playerId) {
      h.emit("ask_question", { question: "Une épée ?" });
      expect((await h.next("error"))["message"]).toMatch(/vérifiées/);
      h.emit("ask_question", { attribute: "gender", value: "male" });
      await h.next("question_answered");
    }
    // The computer's move: a verified question, or a guess.
    await h.until(
      () => h.events.some(([e, p]) => (e === "question_answered" && p["askerId"] !== h.playerId) || e === "wrong_guess" || e === "game_over"),
      9000,
      "the computer to play",
    );
    const botQuestion = h.events.find(([e, p]) => e === "question_answered" && p["askerId"] !== h.playerId);
    if (botQuestion) expect(botQuestion[1]["verified"]).toBe(true);
  }, 20_000);

  it("deletes the room when the human leaves", async () => {
    const h = track(await connectClient(server));
    h.emit("play_vs_bot", { name: "Hana", level: "easy" });
    const { code } = await h.next("room_joined");
    h.emit("leave_room");
    await wait(200);
    const other = track(await connectClient(server));
    other.emit("join_room", { code, name: "X" });
    expect((await other.next("error"))["message"]).toMatch(/introuvable/);
  });
});
