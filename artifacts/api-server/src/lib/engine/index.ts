// The game engine: in-memory rooms, turns, clocks and the computer opponent,
// driven by Socket.IO events. The server is the referee: secrets never leave
// it before the game is over.
//
// Layout: state (types, shared maps, engine context), config (numbers),
// rooms (creation, board, snapshots), timers (clocks, disconnect budget),
// rules (moves, game end, results), bot-driver (computer turns), matchmaking
// (quick-play queue), sessions, input (payload validation), handlers
// (Socket.IO events).

import { connectionGate, handleConnection } from "./handlers";
import { type GameServer, createEngine } from "./state";

export { VERIFIABLE_ATTRIBUTES, REACTIONS } from "@workspace/game-protocol";
export type { GameOverReason, LogEntry, RoomPhase, VerifiableAttribute } from "@workspace/game-protocol";
export {
  DISCONNECT_BUDGET_MS,
  MIN_MOVES_FOR_RANKED_FORFEIT,
  RECONNECT_GRACE_MS,
  SHUTDOWN_MESSAGE,
} from "./config";
export { cleanName } from "./input";
export { getCharacters } from "./rooms";
export { beginShutdown } from "./state";
export type { Character, CharacterWithImage, GameServer, Player, Room } from "./state";

export function setupGameEngine(io: GameServer): void {
  const ctx = createEngine(io);
  io.use(connectionGate(ctx));
  io.on("connection", (socket) => handleConnection(ctx, socket));
}
