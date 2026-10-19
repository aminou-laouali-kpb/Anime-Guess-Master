import type { GameOverReason, LogEntry, VerifiableAttribute } from "@workspace/game-protocol";
import { logger } from "../logger";
import { networkKey } from "../rate-limit";
import { recordGame, statsEnabled } from "../stats";
import { botReact, cancelBot } from "./bot-driver";
import { MAX_LIVES, MIN_MOVES_FOR_RANKED_FORFEIT } from "./config";
import { allCharacters, boardOf, dealBoard, opponentOf, publicPlayers } from "./rooms";
import { type Engine, type Player, type Room, type Session, emitToPlayer, roomOf, socketOf } from "./state";
import { clearTimer, updateTimer } from "./timers";

// Game actions shared by human players (socket handlers) and the bot, and how
// a game ends and gets recorded.

function movesBy(room: Room, player: Player): number {
  return room.log.filter(
    (e) => (e.type === "qna" && e.askerId === player.id) || (e.type === "guess" && e.guesserId === player.id),
  ).length;
}

function hadRealPlay(room: Room, a: Player, b: Player): boolean {
  return movesBy(room, a) >= MIN_MOVES_FOR_RANKED_FORFEIT && movesBy(room, b) >= MIN_MOVES_FOR_RANKED_FORFEIT;
}

export function maybeStartGame(ctx: Engine, room: Room): void {
  if (room.players.length !== 2 || !room.players.every((p) => p.isReady)) return;

  room.phase = "playing";
  const firstIdx = Math.floor(Math.random() * 2);
  room.currentTurnPlayerId = room.players[firstIdx]!.id;
  room.firstPlayerId = room.currentTurnPlayerId;
  room.lastChanceFor = null;

  ctx.io.to(room.code).emit("game_start", {
    currentTurnPlayerId: room.currentTurnPlayerId,
    players: publicPlayers(room),
  });
}

// Saves the result for stats and tells each player how their rating moved.
function reportResult(ctx: Engine, room: Room, winner: Player, loser: Player, reason: string, draw = false): void {
  if (!statsEnabled || room.mode === "bot") return;
  // Two players on the same network (same IPv4 address or IPv6 /64) could
  // be one person farming wins, and endless rematches between two accounts
  // would farm Elo too. A forfeit only moves the rating once the game was
  // really played: otherwise an alt account could queue, meet its main and
  // quit at once, again and again.
  const ranked =
    room.mode === "quick" &&
    room.round === 1 &&
    networkKey(winner.ip) !== networkKey(loser.ip) &&
    (reason !== "forfeit" || hadRealPlay(room, winner, loser));
  recordGame({
    winner: { profileToken: winner.profileToken, name: winner.name },
    loser: { profileToken: loser.profileToken, name: loser.name },
    ranked,
    mode: room.mode,
    reason,
    draw,
  })
    .then((result) => {
      if (!result) return;
      emitToPlayer(ctx, winner, "rating_update", result.winner);
      emitToPlayer(ctx, loser, "rating_update", result.loser);
    })
    .catch((err) => logger.error({ err }, "Failed to record game result"));
}

// Each player gets their own game_over so "opponentCharacterId" is always
// the *other* player's character.
export function endGame(ctx: Engine, room: Room, winnerId: string | null, reason: GameOverReason): void {
  room.phase = "ended";
  room.lastChanceFor = null;
  room.winnerId = winnerId;
  room.gameOverReason = reason;
  room.pendingQuestion = null;
  room.pendingAskerId = null;
  room.rematchRequestedBy = null;
  updateTimer(ctx, room);

  for (const player of room.players) {
    emitToPlayer(ctx, player, "game_over", {
      winnerId,
      reason,
      opponentCharacterId: opponentOf(room, player)?.selectedCharacterId ?? null,
    });
  }

  if (winnerId === null) {
    const [a, b] = room.players;
    if (a && b) reportResult(ctx, room, a, b, reason, true);
    botReact(ctx, room, "😮", 0.9);
    return;
  }
  const winner = room.players.find((p) => p.id === winnerId);
  const loser = winner && opponentOf(room, winner);
  if (winner && loser) reportResult(ctx, room, winner, loser, reason);
  botReact(ctx, room, winner?.isBot ? "🔥" : "👏", 0.9);
}

// Removes the player for good and tells the opponent, whatever the phase.
export function leaveRoom(ctx: Engine, session: Session): void {
  const room = roomOf(ctx, session);
  session.roomCode = null;
  if (!room) return;

  socketOf(ctx, session)?.leave(room.code);
  const leaver = room.players.find((p) => p.token === session.token);
  room.players = room.players.filter((p) => p.token !== session.token);

  const remaining = room.players[0];
  if (!remaining || remaining.isBot) {
    clearTimer(room);
    cancelBot(room);
    ctx.rooms.delete(room.code);
    return;
  }

  // Quitting mid-game (or never coming back) counts as a loss.
  if (room.phase === "playing" && leaver) {
    reportResult(ctx, room, remaining, leaver, "forfeit");
  }

  if (room.phase !== "ended") {
    room.phase = "ended";
    room.winnerId = remaining.id;
    room.gameOverReason = "opponent_left";
    room.pendingQuestion = null;
    room.pendingAskerId = null;
  }
  room.rematchRequestedBy = null;
  updateTimer(ctx, room);
  emitToPlayer(ctx, remaining, "opponent_left");
}

export function selectCharacter(ctx: Engine, room: Room, player: Player, characterId: string): void {
  player.selectedCharacterId = characterId;
  player.isReady = true;
  // Tell the other player this player is ready (without revealing the character)
  const opponent = opponentOf(room, player);
  if (opponent) emitToPlayer(ctx, opponent, "opponent_ready");
  maybeStartGame(ctx, room);
  updateTimer(ctx, room);
}

export function askVerified(
  ctx: Engine,
  room: Room,
  player: Player,
  attribute: VerifiableAttribute,
  value: string,
): void {
  if (room.lastChanceFor) return; // the final guess can only be a guess
  const opponent = opponentOf(room, player);
  const secret = allCharacters.find((c) => c.id === opponent?.selectedCharacterId);
  if (!opponent || !secret) return;

  const entry: LogEntry = {
    type: "qna",
    question: null,
    verified: true,
    attribute,
    value,
    answer: secret[attribute].toLowerCase() === value.toLowerCase() ? "yes" : "no",
    askerId: player.id,
  };
  room.log.push(entry);
  room.currentTurnPlayerId = opponent.id;
  ctx.io.to(room.code).emit("question_answered", {
    ...entry,
    currentTurnPlayerId: room.currentTurnPlayerId,
  });
  updateTimer(ctx, room);
}

function startLastChance(ctx: Engine, room: Room, guesser: Player): void {
  room.lastChanceFor = guesser.id;
  room.currentTurnPlayerId = guesser.id;
  room.pendingQuestion = null;
  room.pendingAskerId = null;
  ctx.io.to(room.code).emit("last_chance", { playerId: guesser.id });
  updateTimer(ctx, room);
}

export function makeGuess(ctx: Engine, room: Room, player: Player, characterId: string): void {
  const opponent = opponentOf(room, player);
  if (!opponent) return;

  const correct = opponent.selectedCharacterId === characterId;

  // The second player's final guess settles it: a draw if they find the
  // character too, otherwise the first player's win stands.
  if (room.lastChanceFor === player.id) {
    endGame(ctx, room, correct ? null : opponent.id, correct ? "draw" : "correct_guess");
    return;
  }

  if (correct) {
    // The first player moved first, so they got there a turn earlier: give
    // the other player one last guess before declaring the win.
    if (player.id === room.firstPlayerId) {
      startLastChance(ctx, room, opponent);
      return;
    }
    endGame(ctx, room, player.id, "correct_guess");
    return;
  }

  player.lives -= 1;
  room.log.push({ type: "guess", guesserId: player.id, guessedCharacterId: characterId });
  botReact(ctx, room, player.isBot ? "😅" : "😮");

  if (player.lives <= 0) {
    endGame(ctx, room, opponent.id, "out_of_lives");
    return;
  }

  room.currentTurnPlayerId = opponent.id;
  ctx.io.to(room.code).emit("wrong_guess", {
    guesserId: player.id,
    guessedCharacterId: characterId,
    lives: player.lives,
    currentTurnPlayerId: room.currentTurnPlayerId,
  });
  updateTimer(ctx, room);
}

export function startRematch(ctx: Engine, room: Room): void {
  room.phase = "selection";
  room.round += 1;
  room.characterIds = dealBoard(); // fresh board for the rematch
  room.log = [];
  room.pendingQuestion = null;
  room.pendingAskerId = null;
  room.winnerId = null;
  room.gameOverReason = null;
  room.firstPlayerId = null;
  room.lastChanceFor = null;
  room.rematchRequestedBy = null;
  room.currentTurnPlayerId = null;
  for (const p of room.players) {
    p.selectedCharacterId = null;
    p.eliminatedIds = [];
    p.lives = MAX_LIVES;
    p.isReady = false;
    p.awayMs = 0; // a fresh disconnection budget for the new game
  }

  ctx.io.to(room.code).emit("rematch_started", {
    code: room.code,
    phase: room.phase,
    players: publicPlayers(room),
    characters: boardOf(room),
    mode: room.mode,
  });
  updateTimer(ctx, room);
}
