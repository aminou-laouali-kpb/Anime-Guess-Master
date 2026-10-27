import { randomInt } from "crypto";
import type { RoomSnapshot, TimerPayload } from "@workspace/game-protocol";
import characters from "../../data/characters.json" with { type: "json" };
import { imageUrlFor } from "../character-images";
import { BOARD_SIZE, MAX_LIVES } from "./config";
import {
  type Character,
  type CharacterWithImage,
  type Engine,
  type Player,
  type Room,
  type Session,
  isPlayerConnected,
  socketOf,
} from "./state";

// Room creation, board dealing and what players are shown of a room.

export const allCharacters = characters as Character[];

export function getCharacters(): CharacterWithImage[] {
  return allCharacters.map(({ image: _image, ...c }) => ({ ...c, imageUrl: imageUrlFor(c.id) }));
}

// Private room codes are the only thing keeping strangers out of a private
// game, so they come from the CSPRNG (Math.random is predictable).
export function generateCode(ctx: Engine): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[randomInt(chars.length)];
  }
  return ctx.rooms.has(code) ? generateCode(ctx) : code;
}

export function createPlayer(session: Session): Player {
  return {
    id: session.playerId,
    token: session.token,
    profileToken: session.profileToken,
    ip: session.ip,
    isBot: false,
    name: session.name,
    selectedCharacterId: null,
    eliminatedIds: [],
    lives: MAX_LIVES,
    isReady: false,
    awayMs: 0,
    awaySince: null,
    turnMs: 0,
  };
}

export function createRoom(code: string, mode: Room["mode"]): Room {
  return {
    code,
    phase: "waiting",
    mode,
    round: 1,
    botLevel: null,
    botTimer: null,
    botKey: null,
    characterIds: [],
    players: [],
    currentTurnPlayerId: null,
    log: [],
    pendingQuestion: null,
    pendingAskerId: null,
    winnerId: null,
    firstPlayerId: null,
    lastChanceFor: null,
    gameOverReason: null,
    rematchRequestedBy: null,
    timer: null,
    timerKey: null,
    timerDeadline: null,
    timerPlayerId: null,
    pausedTimerKey: null,
    pausedTimerMs: 0,
    timerStartedAt: null,
  };
}

export function addToRoom(ctx: Engine, room: Room, session: Session): void {
  room.players.push(createPlayer(session));
  session.roomCode = room.code;
  socketOf(ctx, session)?.join(room.code);
}

export function publicPlayers(room: Room) {
  return room.players.map((p) => ({ id: p.id, name: p.name, lives: p.lives }));
}

export function opponentOf(room: Room, player: Player): Player | undefined {
  return room.players.find((p) => p.id !== player.id);
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// Each gender gets its fair share of the board (proportional to the whole
// roster), so a random draw can't produce an all-male board.
export function dealBoard(): string[] {
  const byGender = new Map<string, string[]>();
  for (const c of shuffle(allCharacters)) {
    byGender.set(c.gender, [...(byGender.get(c.gender) ?? []), c.id]);
  }

  const board: string[] = [];
  for (const ids of byGender.values()) {
    const share = Math.floor((ids.length / allCharacters.length) * BOARD_SIZE);
    board.push(...ids.splice(0, share));
  }
  // Rounding leaves a few seats: fill them from whatever is left.
  const rest = shuffle([...byGender.values()].flat());
  board.push(...rest.slice(0, BOARD_SIZE - board.length));
  return shuffle(board);
}

export function boardOf(room: Room): CharacterWithImage[] {
  const byId = new Map(getCharacters().map((c) => [c.id, c]));
  return room.characterIds.map((id) => byId.get(id)!).filter(Boolean);
}

export function pickRandomCharacterId(room: Room): string {
  return room.characterIds[Math.floor(Math.random() * room.characterIds.length)]!;
}

export function emitRoomJoined(ctx: Engine, room: Room): void {
  ctx.io.to(room.code).emit("room_joined", {
    code: room.code,
    phase: room.phase,
    players: publicPlayers(room),
    characters: boardOf(room),
    mode: room.mode,
  });
}

export function timerPayload(room: Room): TimerPayload {
  return room.timerDeadline === null
    ? { actingPlayerId: null, msLeft: null }
    : {
        actingPlayerId: room.timerPlayerId,
        msLeft: Math.max(0, room.timerDeadline - Date.now()),
      };
}

// Everything a player needs to rebuild their screen after a reconnect.
export function snapshotFor(ctx: Engine, room: Room, player: Player): RoomSnapshot {
  const opponent = opponentOf(room, player);
  const iAsked = room.pendingAskerId === player.id;
  return {
    code: room.code,
    phase: room.phase,
    players: publicPlayers(room),
    characters: boardOf(room),
    myCharacterId: player.selectedCharacterId,
    myEliminatedIds: player.eliminatedIds,
    opponentReady: opponent?.isReady ?? false,
    opponentConnected: opponent ? isPlayerConnected(ctx, opponent) : false,
    mode: room.mode,
    currentTurnPlayerId: room.currentTurnPlayerId,
    pendingQuestion: room.pendingQuestion && !iAsked ? room.pendingQuestion : null,
    awaitingAnswerFor: room.pendingQuestion && iAsked ? room.pendingQuestion : null,
    log: room.log,
    winnerId: room.winnerId,
    gameOverReason: room.gameOverReason,
    // Only reveal the opponent's character once the game is over.
    opponentCharacterId:
      room.phase === "ended" ? (opponent?.selectedCharacterId ?? null) : null,
    rematchRequestedBy: room.rematchRequestedBy,
    lastChanceFor: room.lastChanceFor,
    timer: timerPayload(room),
  };
}
