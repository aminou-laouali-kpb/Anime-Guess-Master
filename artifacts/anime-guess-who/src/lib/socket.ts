import { io, Socket } from "socket.io-client";
import { Character } from "@workspace/api-client-react";
import type { VerifiableAttribute } from "./questions";

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
  question?: string | null;
  verified?: boolean;
  attribute?: VerifiableAttribute | null;
  value?: string | null;
  answer?: "yes" | "no";
  guesserId?: string;
  guessedCharacterId?: string;
}

export interface QnaPayload {
  type: "qna";
  answer: "yes" | "no";
  askerId: string;
  question: string | null;
  verified: boolean;
  attribute: VerifiableAttribute | null;
  value: string | null;
}

export type RoomMode = "quick" | "private" | "bot";
export type BotLevel = "easy" | "normal" | "hard";

export type GameOverReason = "correct_guess" | "out_of_lives" | "opponent_left";

type ServerLogEntry =
  | QnaPayload
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
  mode: RoomMode;
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

export interface PlayerStats {
  id: string;
  name: string;
  rating: number;
  rank: number | null;
  gamesPlayed: number;
  rankedGames: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}

export interface MyStatsPayload {
  enabled: boolean;
  minRankedGames: number;
  stats: PlayerStats | null; // null until the first finished game
}

export interface RatingUpdate {
  ranked: boolean;
  rating: number;
  delta: number;
}

export interface ClientToServerEvents {
  join_lobby: (payload: { name: string }) => void;
  create_room: (payload: { name: string }) => void;
  play_vs_bot: (payload: { name: string; level: BotLevel }) => void;
  join_room: (payload: { code: string; name: string }) => void;
  leave_room: () => void;
  select_character: (payload: { characterId: string }) => void;
  ask_question: (
    payload: { question: string } | { attribute: VerifiableAttribute; value: string },
  ) => void;
  answer_question: (payload: { answer: "yes" | "no" }) => void;
  make_guess: (payload: { characterId: string }) => void;
  sync_eliminations: (payload: { eliminatedIds: string[] }) => void;
  request_rematch: () => void;
  get_my_stats: () => void;
  accept_rematch: () => void;
}

export interface ServerToClientEvents {
  session: (payload: { token: string; playerId: string }) => void;
  profile: (payload: { token: string }) => void;
  my_stats: (payload: MyStatsPayload) => void;
  rating_update: (payload: RatingUpdate) => void;
  state_sync: (payload: { room: RoomSnapshot | null }) => void;
  in_queue: (payload: { position: number }) => void;
  room_created: (payload: { code: string }) => void;
  room_joined: (payload: {
    code: string;
    phase: string;
    players: PlayerState[];
    characters: Character[];
    mode: RoomMode;
  }) => void;
  opponent_ready: () => void;
  game_start: (payload: {
    currentTurnPlayerId: string;
    players: PlayerState[];
  }) => void;
  question_asked: (payload: { question: string; askerId: string }) => void;
  awaiting_answer: (payload: { question: string }) => void;
  question_answered: (payload: QnaPayload & { currentTurnPlayerId: string }) => void;
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
    mode: RoomMode;
  }) => void;
  error: (payload: { message: string }) => void;
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
