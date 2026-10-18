// The real-time contract between the web app and the API server. Both sides
// import from here, so an event or payload can only change in one place.

// Traits the server can check itself, so the answer can't be a lie.
export const VERIFIABLE_ATTRIBUTES = [
  "hairColor",
  "eyeColor",
  "gender",
  "ageRange",
  "species",
  "alignment",
  "role",
  "anime",
] as const;
export type VerifiableAttribute = (typeof VERIFIABLE_ATTRIBUTES)[number];

// Reactions are picked from a fixed set: no free text, nothing to moderate.
export const REACTIONS = ["👍", "😂", "😮", "😅", "🤔", "😱", "🔥", "👏"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const BOT_LEVELS = ["easy", "normal", "hard"] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];

export type RoomMode = "quick" | "private" | "bot";
export type RoomPhase = "waiting" | "selection" | "playing" | "ended";
export type GameOverReason = "correct_guess" | "out_of_lives" | "opponent_left";

export interface PlayerState {
  id: string;
  name: string;
  lives: number;
}

// A character as sent to clients (the server resolves the portrait URL).
export interface BoardCharacter {
  id: string;
  name: string;
  anime: string;
  gender: string;
  hairColor: string;
  eyeColor: string;
  ageRange: string;
  species: string;
  powers: string[];
  alignment: string;
  role: string;
  imageUrl: string | null;
}

export interface QnaPayload {
  type: "qna";
  answer: "yes" | "no";
  askerId: string;
  // Free question: typed by the asker, answered (honestly or not) by the opponent.
  question: string | null;
  // Verified question: a trait/value pair the server answers from the data.
  verified: boolean;
  attribute: VerifiableAttribute | null;
  value: string | null;
}

export type LogEntry =
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
  phase: RoomPhase;
  players: PlayerState[];
  characters: BoardCharacter[];
  myCharacterId: string | null;
  myEliminatedIds: string[];
  opponentReady: boolean;
  opponentConnected: boolean;
  mode: RoomMode;
  currentTurnPlayerId: string | null;
  pendingQuestion: string | null;
  awaitingAnswerFor: string | null;
  log: LogEntry[];
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

export interface RoomStartPayload {
  code: string;
  phase: RoomPhase;
  players: PlayerState[];
  characters: BoardCharacter[];
  mode: RoomMode;
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
  react: (payload: { emoji: Reaction }) => void;
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
  room_joined: (payload: RoomStartPayload) => void;
  opponent_ready: () => void;
  game_start: (payload: { currentTurnPlayerId: string; players: PlayerState[] }) => void;
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
  reaction: (payload: { playerId: string; emoji: Reaction }) => void;
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
  rematch_started: (payload: RoomStartPayload) => void;
  error: (payload: { message: string }) => void;
}
