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
  /** Extra handshake fields (mobile app: client, appVersion, platform, device, blocked, verifiedOnly). */
  auth?: Record<string, unknown>;
}

/** Handshake of the mobile app, as documented in docs/mobile/SERVER_CHANGES.md. */
export function mobileAuth(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { client: "mobile", appVersion: "1.0.0", platform: "android", ...extra };
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
      auth: { token: opts.token, profile: opts.profile, ...opts.auth },
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
    this.socket.on("connect_error", (err) =>
      this.events.push(["connect_error", { message: err.message, data: (err as { data?: unknown }).data }]),
    );
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

/** The client whose turn it is, and the other one. */
export function whoseTurn(game: Game): { mover: TestClient; other: TestClient } {
  const turn = game.a.last("game_start")!["currentTurnPlayerId"];
  return turn === game.a.playerId ? { mover: game.a, other: game.b } : { mover: game.b, other: game.a };
}

/** JSON request against the test server, from a given client address. */
export async function api(
  server: TestServer,
  path: string,
  opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string>; ip?: string } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "X-Forwarded-For": opts.ip ?? "203.0.113.240", ...opts.headers };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${server.url}/api${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: res.status, body };
}
