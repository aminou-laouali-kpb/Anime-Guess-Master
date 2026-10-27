// Tunable numbers of the game engine. No imports, so every engine module can
// read these at load time whatever the import order.

export const MAX_LIVES = 3;

export const REACTION_COOLDOWN_MS = 1_000;
// Questions are free, so cap them: a game can't grow (or last) forever.
export const MAX_QUESTIONS_PER_GAME = 60;
// Like the original board game: a smaller board keeps games short and readable.
export const BOARD_SIZE = 24;
// Test hook: GAME_TIME_SCALE=0.05 makes every clock 20x faster. Always 1 in production.
export const TIME_SCALE =
  Number(process.env["GAME_TIME_SCALE"]) > 0 ? Number(process.env["GAME_TIME_SCALE"]) : 1;
export const RECONNECT_GRACE_MS = 45_000 * TIME_SCALE;
// The clocks pause while a player is away, so a player could otherwise stall
// forever by dropping and coming back just before the grace period ends. Each
// player gets this much disconnected time per game, all disconnections added
// up; once it is spent, a disconnection is a forfeit (like grace expiry).
export const DISCONNECT_BUDGET_MS = 90_000 * TIME_SCALE;

// Nobody can stall a game forever: each step has a deadline.
export const SELECTION_TIME_MS = 90_000 * TIME_SCALE;
export const TURN_TIME_MS = 60_000 * TIME_SCALE;
export const ANSWER_TIME_MS = 45_000 * TIME_SCALE;
// Both players found the character with equal lives: the faster one wins, but
// only by a clear margin (a split second is noise, not skill) — else a draw.
// Not scaled by TIME_SCALE: it's about human reaction time, not clock length.
export const TIEBREAK_MIN_GAP_MS = 1_000;

// Abuse limits. Rooms only exist while a session holds them, so capping
// sessions caps rooms and the matchmaking queue too.
export const MAX_SESSIONS = 2_000;
export const MAX_CONNECTIONS_PER_IP = 20;
// A socket that sits doing nothing outside a game (not in a room, not in the
// queue, or alone in a private room nobody joined) is dropped after this
// long, so idle tabs can't hold the per-network and server-wide caps.
export const IDLE_TIMEOUT_MS = 10 * 60_000 * TIME_SCALE;
export const EVENT_BURST = 20;
export const EVENTS_PER_SECOND = 5;
export const MAX_DROPPED_EVENTS = 100;

// A forfeit is only ranked when both players made at least this many moves
// (a question asked or a wrong guess; timeouts don't count). Two questions
// each is roughly a minute of real play: cheap for a genuine game that ends
// in a rage-quit, but it makes "queue, meet my own alt, quit" farming slow.
export const MIN_MOVES_FOR_RANKED_FORFEIT = 2;

export const SHUTDOWN_MESSAGE = "Le serveur redémarre, la partie va être interrompue.";
