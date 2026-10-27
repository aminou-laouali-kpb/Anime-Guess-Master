// Pure state transitions of a game, one action per server event (plus a few
// local ones). No side effects here: toasts, socket emits and localStorage
// stay in GameContext. Anything impure (log entry ids, the local clock) is
// computed by the caller and passed in the action, so this is easy to test.
import type { Character } from "@workspace/api-client-react";
import type {
  GameLogEntry,
  GameOverReason,
  GamePhase,
  MyStatsPayload,
  PlayerState,
  QnaPayload,
  RatingUpdate,
  RoomMode,
  RoomSnapshot,
  TimerPayload,
} from "../lib/socket";

// Deadline converted to the local clock so client/server clock skew doesn't matter.
export interface TurnTimer {
  actingPlayerId: string | null;
  deadline: number;
}

export function toTurnTimer({ actingPlayerId, msLeft }: TimerPayload, now: number): TurnTimer | null {
  return msLeft === null ? null : { actingPlayerId, deadline: now + msLeft };
}

export interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  roomMode: RoomMode | null;
  queuePosition: number | null;
  players: PlayerState[];
  characters: Character[];
  myPlayerId: string | null;
  myCharacterId: string | null; // For playing phase (secret selection)
  myEliminatedIds: string[]; // Restored from the server after a reconnect
  opponentReady: boolean;
  opponentConnected: boolean;
  opponentLeft: boolean;
  currentTurnId: string | null;
  pendingQuestion: string | null; // A question I need to answer
  awaitingAnswerFor: string | null; // A question I asked, waiting for answer
  gameLog: GameLogEntry[];
  winnerId: string | null;
  gameOverReason: GameOverReason | null;
  // When both players found the character: time each spent on their own turns
  // (ms, by player id), which can decide the tiebreak.
  turnMs: Record<string, number> | null;
  lastChanceFor: string | null;
  revealedOpponentCharacterId: string | null;
  rematchRequestedBy: string | null;
  timer: TurnTimer | null;
  myStats: MyStatsPayload | null;
  ratingUpdate: RatingUpdate | null; // result of the game that just ended
  isConnected: boolean;
  hasConnectedOnce: boolean;
  connectionReplaced: boolean; // the server closed our connection: a reload is needed
}

// Everything that belongs to one room/game; cleared when leaving it.
const EMPTY_GAME = {
  roomCode: null,
  roomMode: null,
  queuePosition: null,
  players: [],
  characters: [],
  myCharacterId: null,
  myEliminatedIds: [],
  opponentReady: false,
  opponentConnected: true,
  opponentLeft: false,
  currentTurnId: null,
  pendingQuestion: null,
  awaitingAnswerFor: null,
  gameLog: [],
  winnerId: null,
  gameOverReason: null,
  turnMs: null,
  lastChanceFor: null,
  revealedOpponentCharacterId: null,
  rematchRequestedBy: null,
  timer: null,
  ratingUpdate: null,
} satisfies Partial<GameState>;

export const initialGameState: GameState = {
  ...EMPTY_GAME,
  phase: "home",
  myPlayerId: null,
  myStats: null,
  isConnected: false,
  hasConnectedOnce: false,
  connectionReplaced: false,
};

export const SNAPSHOT_PHASES: Record<RoomSnapshot["phase"], GamePhase> = {
  waiting: "lobby",
  selection: "selection",
  playing: "playing",
  ended: "ended",
};

export type GameAction =
  // Connection
  | { type: "connected" }
  | { type: "disconnected"; replaced: boolean }
  | { type: "session"; playerId: string }
  | { type: "my_stats"; stats: MyStatsPayload }
  | { type: "rating_update"; update: RatingUpdate }
  // room: null means the server has no game for us.
  | { type: "state_sync"; room: RoomSnapshot | null; now: number }
  // Lobby
  | { type: "in_queue"; position: number }
  | { type: "room_created"; code: string }
  | { type: "room_joined"; code: string; mode: RoomMode; players: PlayerState[]; characters: Character[] }
  | { type: "opponent_ready" }
  | { type: "timer"; timer: TimerPayload; now: number }
  | { type: "character_assigned"; characterId: string }
  // Game
  | { type: "game_start"; currentTurnPlayerId: string; players: PlayerState[] }
  | { type: "question_asked"; question: string }
  | { type: "awaiting_answer"; question: string }
  | { type: "question_answered"; entry: QnaPayload; currentTurnPlayerId: string; logId: string }
  | {
      type: "wrong_guess";
      guesserId: string;
      guessedCharacterId: string;
      lives: number;
      currentTurnPlayerId: string;
      logId: string;
    }
  | { type: "turn_timeout"; playerId: string; lives: number; currentTurnPlayerId: string; logId: string }
  | { type: "last_chance"; playerId: string }
  | {
      type: "game_over";
      winnerId: string | null;
      opponentCharacterId: string | null;
      reason: GameOverReason;
      turnMs?: Record<string, number>;
    }
  // Opponent
  | { type: "opponent_disconnected" }
  | { type: "opponent_reconnected" }
  | { type: "opponent_left" }
  | { type: "rematch_requested"; byPlayerId: string }
  | { type: "rematch_started"; mode: RoomMode; players: PlayerState[]; characters: Character[] }
  | { type: "server_error" }
  // Local
  // Leave the current room; `phase` (if given) is the screen to show next.
  | { type: "reset"; phase?: GamePhase }
  | { type: "select_character"; characterId: string };

function startNewRound(state: GameState, players: PlayerState[], characters: Character[]): GameState {
  return {
    ...state,
    phase: "selection",
    ratingUpdate: null,
    players,
    characters,
    opponentReady: false,
    opponentConnected: true,
    opponentLeft: false,
    myCharacterId: null,
    myEliminatedIds: [],
    currentTurnId: null,
    pendingQuestion: null,
    awaitingAnswerFor: null,
    gameLog: [],
    winnerId: null,
    gameOverReason: null,
    turnMs: null,
    lastChanceFor: null,
    revealedOpponentCharacterId: null,
    rematchRequestedBy: null,
  };
}

function applySnapshot(state: GameState, room: RoomSnapshot, now: number): GameState {
  return {
    ...state,
    phase: SNAPSHOT_PHASES[room.phase],
    roomCode: room.code,
    roomMode: room.mode,
    queuePosition: null,
    players: room.players,
    characters: room.characters,
    myCharacterId: room.myCharacterId,
    myEliminatedIds: room.myEliminatedIds,
    opponentReady: room.opponentReady,
    opponentConnected: room.opponentConnected,
    opponentLeft: room.phase !== "waiting" && room.players.length < 2,
    currentTurnId: room.currentTurnPlayerId,
    pendingQuestion: room.pendingQuestion,
    awaitingAnswerFor: room.awaitingAnswerFor,
    // "restored-" ids tell the board these entries are old news.
    gameLog: room.log.map((entry, i) => ({ ...entry, id: `restored-${i}` })),
    winnerId: room.winnerId,
    gameOverReason: room.gameOverReason,
    lastChanceFor: room.lastChanceFor,
    revealedOpponentCharacterId: room.opponentCharacterId,
    rematchRequestedBy: room.rematchRequestedBy,
    timer: toTurnTimer(room.timer, now),
  };
}

const setLives = (players: PlayerState[], playerId: string, lives: number) =>
  players.map((p) => (p.id === playerId ? { ...p, lives } : p));

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "connected":
      return { ...state, isConnected: true, hasConnectedOnce: true, connectionReplaced: false };
    case "disconnected":
      // "io server disconnect": the server hung up (e.g. the game was opened
      // in another tab). socket.io won't retry that one by itself.
      return { ...state, isConnected: false, connectionReplaced: state.connectionReplaced || action.replaced };
    case "session":
      return { ...state, myPlayerId: action.playerId };
    case "my_stats":
      return { ...state, myStats: action.stats };
    case "rating_update":
      return { ...state, ratingUpdate: action.update };

    case "state_sync":
      if (action.room) return applySnapshot(state, action.room, action.now);
      // In the queue the caller rejoins it; at home there is nothing to lose.
      if (state.phase === "queue" || state.phase === "home") return state;
      return { ...state, ...EMPTY_GAME, phase: "home" };

    case "in_queue":
      return { ...state, phase: "queue", queuePosition: action.position };
    case "room_created":
      return { ...state, phase: "lobby", roomCode: action.code };
    case "room_joined":
      return startNewRound(
        { ...state, roomCode: action.code, roomMode: action.mode },
        action.players,
        action.characters,
      );
    case "opponent_ready":
      return { ...state, opponentReady: true };
    case "timer":
      return { ...state, timer: toTurnTimer(action.timer, action.now) };
    case "character_assigned":
      return { ...state, myCharacterId: action.characterId };

    case "game_start":
      return { ...state, phase: "playing", currentTurnId: action.currentTurnPlayerId, players: action.players };
    case "question_asked":
      return { ...state, pendingQuestion: action.question };
    case "awaiting_answer":
      return { ...state, awaitingAnswerFor: action.question };
    case "question_answered":
      return {
        ...state,
        pendingQuestion: null,
        awaitingAnswerFor: null,
        gameLog: [...state.gameLog, { ...action.entry, id: action.logId }],
        currentTurnId: action.currentTurnPlayerId,
      };
    case "wrong_guess":
      return {
        ...state,
        gameLog: [
          ...state.gameLog,
          {
            id: action.logId,
            type: "guess",
            guesserId: action.guesserId,
            guessedCharacterId: action.guessedCharacterId,
          },
        ],
        players: setLives(state.players, action.guesserId, action.lives),
        currentTurnId: action.currentTurnPlayerId,
      };
    case "turn_timeout":
      return {
        ...state,
        pendingQuestion: null,
        awaitingAnswerFor: null,
        gameLog: [...state.gameLog, { id: action.logId, type: "timeout", playerId: action.playerId }],
        players: setLives(state.players, action.playerId, action.lives),
        currentTurnId: action.currentTurnPlayerId,
      };
    case "last_chance":
      return { ...state, lastChanceFor: action.playerId, currentTurnId: action.playerId };
    case "game_over":
      return {
        ...state,
        phase: "ended",
        lastChanceFor: null,
        winnerId: action.winnerId,
        revealedOpponentCharacterId: action.opponentCharacterId,
        gameOverReason: action.reason,
        turnMs: action.turnMs ?? null,
        pendingQuestion: null,
        awaitingAnswerFor: null,
        rematchRequestedBy: null,
      };

    case "opponent_disconnected":
      return { ...state, opponentConnected: false };
    case "opponent_reconnected":
      return { ...state, opponentConnected: true };
    case "opponent_left": {
      const next = { ...state, opponentLeft: true, rematchRequestedBy: null };
      if (state.phase === "selection" || state.phase === "playing") {
        return { ...next, phase: "ended", gameOverReason: "opponent_left", winnerId: state.myPlayerId };
      }
      return next;
    }
    case "rematch_requested":
      return { ...state, rematchRequestedBy: action.byPlayerId };
    case "rematch_started":
      return startNewRound({ ...state, roomMode: action.mode }, action.players, action.characters);
    case "server_error":
      return state.phase === "queue" || state.phase === "lobby" ? { ...state, phase: "home" } : state;

    case "reset":
      return { ...state, ...EMPTY_GAME, phase: action.phase ?? state.phase };
    case "select_character":
      return { ...state, myCharacterId: action.characterId };
  }
}
