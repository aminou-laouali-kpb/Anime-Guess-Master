import type { Reaction } from "@workspace/game-protocol";
import { type BotMemory, chooseBotMove, remainingCandidates } from "../bot";
import { logger } from "../logger";
import { TIME_SCALE } from "./config";
import { allCharacters, opponentOf, pickRandomCharacterId } from "./rooms";
import { askVerified, makeGuess, selectCharacter, startRematch } from "./rules";
import { type Character, type Engine, type Player, type Room, isPlayerConnected } from "./state";

// The computer opponent, played through the same actions as a human.

// The computer reacts now and then, so it feels less like a machine.
export function botReact(ctx: Engine, room: Room, emoji: Reaction, chance = 0.6): void {
  const bot = room.players.find((p) => p.isBot);
  if (!bot || Math.random() > chance) return;
  setTimeout(() => {
    if (ctx.rooms.has(room.code)) ctx.io.to(room.code).emit("reaction", { playerId: bot.id, emoji });
  }, (700 + Math.random() * 800) * TIME_SCALE);
}

export function cancelBot(room: Room): void {
  if (room.botTimer) clearTimeout(room.botTimer);
  room.botTimer = null;
  room.botKey = null;
}

// Works out whether the bot has something to do in the current state and
// schedules it after a short, human-like pause. Called after every change.
export function driveBot(ctx: Engine, room: Room): void {
  const bot = room.players.find((p) => p.isBot);
  if (!bot) return;
  const human = opponentOf(room, bot);
  // The bot waits while its opponent is disconnected (the clock is paused too).
  if (!human || !isPlayerConnected(ctx, human) || !ctx.rooms.has(room.code)) {
    cancelBot(room);
    return;
  }

  let delay = 0;
  let act: (() => void) | null = null;
  if (room.phase === "selection" && !bot.isReady) {
    delay = 1200 * TIME_SCALE;
    act = () => selectCharacter(ctx, room, bot, pickRandomCharacterId(room));
  } else if (room.phase === "playing" && room.currentTurnPlayerId === bot.id && !room.pendingQuestion) {
    // The pause scales with the clocks, so it can never outlast the turn clock.
    delay = (1800 + Math.random() * 1500) * TIME_SCALE;
    act = () => playBotTurn(ctx, room, bot);
  } else if (room.phase === "ended" && room.rematchRequestedBy === human.id && ctx.lifecycle.acceptingGames) {
    delay = 900 * TIME_SCALE;
    act = () => startRematch(ctx, room);
  }

  const key = `${room.phase}:${room.currentTurnPlayerId}:${room.log.length}:${bot.isReady}:${room.rematchRequestedBy}`;
  if (!act) {
    cancelBot(room);
    return;
  }
  if (room.botTimer && room.botKey === key) return; // already planned
  cancelBot(room);
  room.botKey = key;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    room.botKey = null;
    try {
      act();
    } catch (err) {
      logger.error({ err }, "Bot move failed");
    }
  }, delay);
}

function playBotTurn(ctx: Engine, room: Room, bot: Player): void {
  // Only what the bot legitimately knows: the board and its own answers.
  const memory: BotMemory = { answers: [], wrongGuesses: [], lives: bot.lives };
  for (const entry of room.log) {
    if (entry.type === "qna" && entry.askerId === bot.id && entry.verified && entry.attribute && entry.value) {
      memory.answers.push({ attribute: entry.attribute, value: entry.value, answer: entry.answer });
    } else if (entry.type === "guess" && entry.guesserId === bot.id) {
      memory.wrongGuesses.push(entry.guessedCharacterId);
    }
  }
  const board = room.characterIds
    .map((id) => allCharacters.find((c) => c.id === id))
    .filter((c): c is Character => Boolean(c));

  let move = chooseBotMove(board, memory, room.botLevel ?? "normal");
  if (room.lastChanceFor === bot.id && move.type === "ask") {
    // Last chance: no more questions, so take the best remaining guess.
    const candidates = remainingCandidates(board, memory);
    const pool = candidates.length ? candidates : board;
    move = { type: "guess", characterId: pool[Math.floor(Math.random() * pool.length)]!.id };
  }
  if (move.type === "ask") askVerified(ctx, room, bot, move.attribute, move.value);
  else makeGuess(ctx, room, bot, move.characterId);
}
