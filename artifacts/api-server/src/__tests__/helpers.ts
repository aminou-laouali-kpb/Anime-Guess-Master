import type { AddressInfo } from "net";
import { io as connect, type Socket } from "socket.io-client";
import { createGameServer } from "../server";

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

export async function startServer(): Promise<TestServer> {
  const { httpServer, io } = createGameServer();
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => void io.close(() => resolve())),
  };
}

type Payload = Record<string, any>;

export interface ClientOptions {
  /** Fake client address, as a reverse proxy would put it in X-Forwarded-For. */
  ip?: string;
  /** Session token from an earlier connection (to reconnect / take over). */
  token?: string;
  profile?: string;
  origin?: string;
  reconnection?: boolean;
}

let nextIp = 1;

/** A socket.io client that records every event it receives. */
export class TestClient {
  readonly socket: Socket;
  readonly events: [string, Payload][] = [];
  playerId = "";
  token = "";
  profile = "";

  constructor(url: string, opts: ClientOptions = {}) {
    const ip = opts.ip ?? `198.51.${(nextIp >> 8) & 255}.${nextIp++ & 255}`;
    const headers: Record<string, string> = { "X-Forwarded-For": ip };
    if (opts.origin) headers["Origin"] = opts.origin;
    this.socket = connect(url, {
      path: "/api/socket.io",
      transports: ["websocket"],
      forceNew: true,
      reconnection: opts.reconnection ?? false,
      auth: { token: opts.token, profile: opts.profile },
      extraHeaders: headers,
    });
    this.socket.onAny((event: string, payload: Payload) => {
      this.events.push([event, payload]);
      if (event === "session") {
        this.playerId = payload.playerId;
        this.token = payload.token;
      }
      if (event === "profile") this.profile = payload.token;
    });
    this.socket.on("connect_error", (err) => this.events.push(["connect_error", { message: err.message }]));
  }

  get connected() {
    return this.socket.connected;
  }

  emit(event: string, payload?: unknown) {
    this.socket.emit(event, payload);
  }

  /** Most recent payload of an event, if any. */
  last(event: string): Payload | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) if (this.events[i]![0] === event) return this.events[i]![1];
    return undefined;
  }

  has(event: string): boolean {
    return this.events.some(([e]) => e === event);
  }

  count(event: string): number {
    return this.events.filter(([e]) => e === event).length;
  }

  /** Waits until `predicate` holds (polling), or throws after `ms`. */
  async until(predicate: () => boolean, ms = 5000, label = "condition"): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (predicate()) return;
      await wait(25);
    }
    throw new Error(`Timed out after ${ms} ms waiting for ${label}`);
  }

  /** Waits for a *new* occurrence of `event` (after this call). */
  async next(event: string, ms = 5000): Promise<Payload> {
    const before = this.count(event);
    await this.until(() => this.count(event) > before, ms, `event "${event}"`);
    return this.last(event)!;
  }

  async connectedOrFail(): Promise<this> {
    await this.until(() => this.has("session") && this.has("state_sync"), 5000, "session");
    return this;
  }

  close() {
    this.socket.close();
  }
}

export async function connectClient(server: TestServer, opts?: ClientOptions): Promise<TestClient> {
  return new TestClient(server.url, opts).connectedOrFail();
}

export interface Game {
  a: TestClient;
  b: TestClient;
  board: Payload[];
  /** Character picked by `a` / `b`. */
  aChar: string;
  bChar: string;
}

/** Two clients in a private room, both having locked in a character: game running. */
export async function startPrivateGame(server: TestServer): Promise<Game> {
  const a = await connectClient(server);
  const b = await connectClient(server);
  a.emit("create_room", { name: "Alice" });
  const { code } = await a.next("room_created");
  b.emit("join_room", { code, name: "Bob" });
  await a.until(() => a.has("room_joined") && b.has("room_joined"));
  const board = b.last("room_joined")!["characters"] as Payload[];
  a.emit("select_character", { characterId: board[0]!["id"] });
  b.emit("select_character", { characterId: board[1]!["id"] });
  await a.until(() => a.has("game_start") && b.has("game_start"));
  return { a, b, board, aChar: board[0]!["id"], bChar: board[1]!["id"] };
}

/**
 * The first player finds the character, which opens the other player's last
 * chance; the other player then misses, so the first player's win stands.
 */
export async function winAsFirstPlayer(
  winner: TestClient,
  loser: TestClient,
  winnerTarget: string,
  loserMiss: string,
): Promise<void> {
  winner.emit("make_guess", { characterId: winnerTarget });
  await loser.next("last_chance");
  loser.emit("make_guess", { characterId: loserMiss });
  await winner.until(() => winner.has("game_over") && loser.has("game_over"), 5000, "game_over");
}

/** Plays a game to its end: whoever moves first wins (the other player misses their last chance). */
export async function playToFirstPlayerWin(game: Game): Promise<{ mover: TestClient; other: TestClient }> {
  const { mover, other } = whoseTurn(game);
  const moverTarget = mover === game.a ? game.bChar : game.aChar;
  const otherTarget = mover === game.a ? game.aChar : game.bChar;
  const miss = game.board.map((c) => c["id"] as string).find((id) => id !== otherTarget)!;
  await winAsFirstPlayer(mover, other, moverTarget, miss);
  return { mover, other };
}

/** The client whose turn it is, and the other one. */
export function whoseTurn(game: Game): { mover: TestClient; other: TestClient } {
  const turn = game.a.last("game_start")!["currentTurnPlayerId"];
  return turn === game.a.playerId ? { mover: game.a, other: game.b } : { mover: game.b, other: game.a };
}
