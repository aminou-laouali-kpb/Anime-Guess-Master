import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  VerifiableAttribute,
} from "@workspace/game-protocol";

export type {
  BotLevel,
  GameOverReason,
  MyStatsPayload,
  PlayerState,
  PlayerStats,
  QnaPayload,
  RatingUpdate,
  Reaction,
  RoomMode,
  RoomSnapshot,
  TimerPayload,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@workspace/game-protocol";
export { REACTIONS } from "@workspace/game-protocol";

export type GamePhase = "home" | "queue" | "lobby" | "selection" | "playing" | "ended";

// A log entry as the client keeps it: every field optional, filled per type.
export interface GameLogEntry {
  id: string;
  type: "qna" | "guess" | "timeout";
  playerId?: string;
  askerId?: string;
  question?: string | null;
  verified?: boolean;
  attribute?: VerifiableAttribute | null;
  value?: string | null;
  answer?: "yes" | "no";
  guesserId?: string;
  guessedCharacterId?: string;
}

const SESSION_KEY = "anime_who_session";
// Long-lived: ties this browser's results to its stats and leaderboard spot.
const PROFILE_KEY = "anime_who_profile";

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage: the game still works, it just can't
    // survive a page reload (and stats start over each visit).
  }
}

export const loadSessionToken = () => load(SESSION_KEY);
export const saveSessionToken = (token: string) => save(SESSION_KEY, token);
export const saveProfileToken = (token: string) => save(PROFILE_KEY, token);

// Connect to the same origin — the shared proxy routes /api/* (including
// /api/socket.io/*) to the API artifact, so no absolute URL is needed.
// The session token lets the server hand us back our seat after a reload or
// a dropped connection.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  path: "/api/socket.io",
  autoConnect: false,
  transports: ["polling", "websocket"],
  auth: (cb) => cb({ token: loadSessionToken(), profile: load(PROFILE_KEY) }),
});
