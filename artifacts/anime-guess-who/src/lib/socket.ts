import { io, Socket } from "socket.io-client";
import { Character } from "@workspace/api-client-react";

export type GamePhase = "home" | "queue" | "lobby" | "selection" | "playing" | "ended";

export interface PlayerState {
  id: string;
  name: string;
  lives: number;
}

export interface GameLogEntry {
  id: string;
  type: "qna" | "guess" | "timeout";
  playerId?: string;
  askerId?: string;
  question?: string;
  answer?: "yes" | "no";
  guesserId?: string;
  guessedCharacterId?: string;
}

export type GameOverReason = "correct_guess" | "out_of_lives" | "opponent_left";

type ServerLogEntry =
  | { type: "qna"; question: string; answer: "yes" | "no"; askerId: string }
  | { type: "guess"; guesserId: string; guessedCharacterId: string }
  | { type: "timeout"; playerId: string };

// actingPlayerId: who must act before the deadline (null = both players).
export interface TimerPayload {
  actingPlayerId: string | null;
  msLeft: number | null;
}

export interface RoomSnapshot {
  code: string;
  phase: "waiting" | "selection" | "playing" | "ended";
  players: PlayerState[];
  characters: Character[];
  myCharacterId: string | null;
  myEliminatedIds: string[];
  opponentReady: boolean;
  opponentConnected: boolean;
  currentTurnPlayerId: string | null;
  pendingQuestion: string | null;
  awaitingAnswerFor: string | null;
  log: ServerLogEntry[];
  winnerId: string | null;
  gameOverReason: GameOverReason | null;
  opponentCharacterId: string | null;
  rematchRequestedBy: string | null;
  timer: TimerPayload;
}

export interface ClientToServerEvents {
  join_lobby: (payload: { name: string }) => void;
  create_room: (payload: { name: string }) => void;
  join_room: (payload: { code: string; name: string }) => void;
  leave_room: () => void;
  select_character: (payload: { characterId: string }) => void;
  ask_question: (payload: { question: string }) => void;
  answer_question: (payload: { answer: "yes" | "no" }) => void;
  make_guess: (payload: { characterId: string }) => void;
  sync_eliminations: (payload: { eliminatedIds: string[] }) => void;
  request_rematch: () => void;
  accept_rematch: () => void;
}

export interface ServerToClientEvents {
  session: (payload: { token: string; playerId: string }) => void;
  state_sync: (payload: { room: RoomSnapshot | null }) => void;
  in_queue: (payload: { position: number }) => void;
  room_created: (payload: { code: string }) => void;
  room_joined: (payload: {
    code: string;
    phase: string;
    players: PlayerState[];
    characters: Character[];
  }) => void;
  opponent_ready: () => void;
  game_start: (payload: {
    currentTurnPlayerId: string;
    players: PlayerState[];
  }) => void;
  question_asked: (payload: { question: string; askerId: string }) => void;
  awaiting_answer: (payload: { question: string }) => void;
  question_answered: (payload: {
    question: string;
    answer: "yes" | "no";
    askerId: string;
    currentTurnPlayerId: string;
  }) => void;
  wrong_guess: (payload: {
    guesserId: string;
    guessedCharacterId: string;
    lives: number;
    currentTurnPlayerId: string;
  }) => void;
  game_over: (payload: {
    winnerId: string;
    reason: GameOverReason;
    opponentCharacterId: string | null;
  }) => void;
  opponent_left: () => void;
  timer: (payload: TimerPayload) => void;
  character_assigned: (payload: { characterId: string }) => void;
  turn_timeout: (payload: {
    playerId: string;
    lives: number;
    currentTurnPlayerId: string;
    while: "answering" | "playing";
  }) => void;
  opponent_disconnected: (payload: { graceSeconds: number }) => void;
  opponent_reconnected: () => void;
  rematch_requested: (payload: { byPlayerId: string }) => void;
  rematch_started: (payload: {
    code: string;
    phase: string;
    players: PlayerState[];
    characters: Character[];
  }) => void;
  error: (payload: { message: string }) => void;
}

const SESSION_KEY = "anime_who_session";

export function loadSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    // Private mode / blocked storage: the game still works, it just can't
    // survive a page reload.
  }
}

// Connect to the same origin — the shared proxy routes /api/* (including
// /api/socket.io/*) to the API artifact, so no absolute URL is needed.
// The session token lets the server hand us back our seat after a reload or
// a dropped connection.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  path: "/api/socket.io",
  autoConnect: false,
  transports: ["polling", "websocket"],
  auth: (cb) => cb({ token: loadSessionToken() }),
});
