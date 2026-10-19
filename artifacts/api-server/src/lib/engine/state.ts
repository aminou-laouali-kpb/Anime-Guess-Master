import type { Server, Socket } from "socket.io";
import type {
  BoardCharacter,
  ClientToServerEvents,
  GameOverReason,
  LogEntry,
  RoomMode,
  RoomPhase,
  ServerToClientEvents,
} from "@workspace/game-protocol";
import type { BotLevel } from "../bot";
import { SHUTDOWN_MESSAGE } from "./config";

// ─── Types ────────────────────────────────────────────────────────────────────

// A character as stored in characters.json. Clients get a BoardCharacter: the
// same fields, with the portrait URL resolved by the server.
export type Character = Omit<BoardCharacter, "imageUrl"> & {
  image?: string; // optional manual override for the portrait URL
};

export type CharacterWithImage = BoardCharacter;

export interface Player {
  id: string; // public id, safe to share with the opponent
  token: string; // secret session token, never sent to anyone but its owner
  profileToken: string; // secret, long-lived: links results to stats
  ip: string;
  isBot: boolean;
  name: string;
  selectedCharacterId: string | null;
  eliminatedIds: string[];
  lives: number;
  isReady: boolean;
  // Time spent disconnected during this game (see DISCONNECT_BUDGET_MS), and
  // when the current disconnection started (null while connected).
  awayMs: number;
  awaySince: number | null;
}

export interface Room {
  code: string;
  phase: RoomPhase;
  mode: RoomMode; // only quick-play games count for the leaderboard
  round: number; // 1 for the first game, +1 per rematch (rematches are never ranked)
  botLevel: BotLevel | null;
  botTimer: NodeJS.Timeout | null;
  botKey: string | null; // state the pending bot move was planned for
  characterIds: string[]; // this game's board, a random subset of all characters
  players: Player[];
  currentTurnPlayerId: string | null;
  log: LogEntry[];
  pendingQuestion: string | null;
  pendingAskerId: string | null;
  winnerId: string | null;
  gameOverReason: GameOverReason | null;
  rematchRequestedBy: string | null;
  // The player who got the first turn. Moving first is an edge (they find the
  // character one turn earlier), so their correct guess doesn't end the game
  // outright: see lastChanceFor.
  firstPlayerId: string | null;
  // The second player's one final guess after the first player guessed right.
  lastChanceFor: string | null;
  timer: NodeJS.Timeout | null;
  timerKey: string | null;
  timerDeadline: number | null;
  timerPlayerId: string | null; // who must act before the deadline (null = both)
  // Time left on a clock paused by a disconnect, so a reconnect resumes it
  // instead of granting a fresh full clock (which allowed stalling forever).
  pausedTimerKey: string | null;
  pausedTimerMs: number;
}

// A session outlives a single socket so a player can reload the page or lose
// the network for a moment without forfeiting the game.
export interface Session {
  token: string;
  playerId: string;
  profileToken: string;
  ip: string;
  name: string;
  socketId: string | null;
  roomCode: string | null;
  disconnectTimer: NodeJS.Timeout | null;
  lastReactionAt: number;
}

// The wire contract lives in @workspace/game-protocol, so every emit and
// handler is checked against it.
export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ─── State ─────────────────────────────────────────────────────────────────────

// Process-wide: every Socket.IO server set up in this process shares the same
// games (the tests rely on it to inspect state across servers).
const rooms = new Map<string, Room>();
const sessions = new Map<string, Session>(); // token → session
const matchmakingQueue: string[] = []; // tokens

// Cleared when the process is asked to stop (see index.ts): no new game
// starts, so nobody begins a match that is about to be cut off.
const lifecycle = { acceptingGames: true };

// Everything the engine functions work on, passed explicitly instead of being
// captured by one big closure.
export interface Engine {
  io: GameServer;
  rooms: Map<string, Room>;
  sessions: Map<string, Session>;
  queue: string[];
  lifecycle: { acceptingGames: boolean };
  // Caps how many sockets one network (IPv4 address or IPv6 /64, see
  // networkKey) can hold. One count per Socket.IO server.
  connectionsPerIp: Map<string, number>;
}

export function createEngine(io: GameServer): Engine {
  return { io, rooms, sessions, queue: matchmakingQueue, lifecycle, connectionsPerIp: new Map() };
}

// First step of a graceful shutdown: refuse new games and warn everyone
// connected. index.ts then closes the server.
export function beginShutdown(io: GameServer): void {
  lifecycle.acceptingGames = false;
  matchmakingQueue.length = 0;
  io.emit("error", { message: SHUTDOWN_MESSAGE });
}

// ─── Session/socket lookups ────────────────────────────────────────────────────

export function socketOf(ctx: Engine, session: Session | undefined): GameSocket | undefined {
  return session?.socketId ? ctx.io.sockets.sockets.get(session.socketId) : undefined;
}

export function emitToPlayer<E extends keyof ServerToClientEvents>(
  ctx: Engine,
  player: Player,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  socketOf(ctx, ctx.sessions.get(player.token))?.emit(event, ...args);
}

export function roomOf(ctx: Engine, session: Session): Room | undefined {
  if (!session.roomCode) return undefined;
  const room = ctx.rooms.get(session.roomCode);
  if (!room) session.roomCode = null;
  return room;
}

export function isPlayerConnected(ctx: Engine, player: Player): boolean {
  return player.isBot || ctx.sessions.get(player.token)?.socketId != null;
}
