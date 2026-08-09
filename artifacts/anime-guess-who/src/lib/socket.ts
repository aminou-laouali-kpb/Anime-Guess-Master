import { io, Socket } from "socket.io-client";
import { Character } from "@workspace/api-client-react";

export type GamePhase = "home" | "queue" | "lobby" | "selection" | "playing" | "ended";

export interface PlayerState {
  socketId: string;
  name: string;
  lives: number;
  eliminatedIds?: string[];
}

export interface GameLogEntry {
  id: string;
  type: "qna" | "guess";
  askerId?: string;
  question?: string;
  answer?: "yes" | "no";
  guesserId?: string;
  guessedCharacterId?: string;
  correct?: boolean;
}

export interface ClientToServerEvents {
  join_lobby: (payload: { name: string }) => void;
  create_room: (payload: { name: string }) => void;
  join_room: (payload: { code: string; name: string }) => void;
  select_character: (payload: { characterId: string }) => void;
  ask_question: (payload: { question: string }) => void;
  answer_question: (payload: { answer: "yes" | "no" }) => void;
  make_guess: (payload: { characterId: string }) => void;
  sync_eliminations: (payload: { eliminatedIds: string[] }) => void;
  request_rematch: () => void;
  accept_rematch: () => void;
}

export interface ServerToClientEvents {
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
    currentTurnSocketId: string;
    players: PlayerState[];
  }) => void;
  question_asked: (payload: { question: string; askerSocketId: string }) => void;
  awaiting_answer: (payload: { question: string }) => void;
  question_answered: (payload: {
    question: string;
    answer: "yes" | "no";
    askerSocketId: string;
    currentTurnSocketId: string;
  }) => void;
  wrong_guess: (payload: {
    guesserSocketId: string;
    guessedCharacterId: string;
    lives: number;
    currentTurnSocketId: string;
  }) => void;
  game_over: (payload: {
    winnerId: string;
    loserOpponentCharacterId?: string;
    guesserCharacterId?: string;
    reason: "correct_guess" | "out_of_lives" | "opponent_left";
  }) => void;
  opponent_left: () => void;
  rematch_requested: (payload: { bySocketId: string }) => void;
  rematch_started: (payload: {
    code: string;
    phase: string;
    players: PlayerState[];
    characters: Character[];
  }) => void;
  error: (payload: { message: string }) => void;
}

// Connect to the same origin — the shared proxy routes /api/* (including
// /api/socket.io/*) to the API artifact, so no absolute URL is needed.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  path: "/api/socket.io",
  autoConnect: false,
  transports: ["polling", "websocket"],
});
