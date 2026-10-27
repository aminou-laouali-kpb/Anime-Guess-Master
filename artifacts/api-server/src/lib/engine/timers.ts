import { logger } from "../logger";
import { driveBot } from "./bot-driver";
import { ANSWER_TIME_MS, DISCONNECT_BUDGET_MS, RECONNECT_GRACE_MS, SELECTION_TIME_MS, TURN_TIME_MS } from "./config";
import { opponentOf, pickRandomCharacterId, timerPayload } from "./rooms";
import { endGame, maybeStartGame } from "./rules";
import { type Engine, type Player, type Room, emitToPlayer, isPlayerConnected } from "./state";

// Selection/turn/answer clocks, and the disconnection budget that keeps a
// player from stalling a game by dropping out.

// Adds the time the acting player has spent since their clock started to
// their turn total (used by the tiebreak), and restarts the count from now.
export function chargeTurnTime(room: Room): void {
  if (room.timerStartedAt === null || room.timerPlayerId === null) return;
  const player = room.players.find((p) => p.id === room.timerPlayerId);
  if (player) player.turnMs += Date.now() - room.timerStartedAt;
  room.timerStartedAt = Date.now();
}

export function clearTimer(room: Room): void {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  room.timerKey = null;
  room.timerDeadline = null;
  room.timerPlayerId = null;
  room.timerStartedAt = null;
}

// Works out who has to act next and (re)arms the deadline. Call it after
// every state change. The clock pauses while a player is disconnected and
// resumes with the time that was left when they come back.
export function updateTimer(ctx: Engine, room: Room): void {
  let key: string | null = null;
  let duration = 0;
  let actingPlayerId: string | null = null;

  const everyoneHere = room.players.length === 2 && room.players.every((p) => isPlayerConnected(ctx, p));
  if (everyoneHere && room.phase === "selection") {
    key = `selection:${room.characterIds[0]}`; // unique per board (rematches)
    duration = SELECTION_TIME_MS;
  } else if (everyoneHere && room.phase === "playing" && room.pendingQuestion) {
    actingPlayerId = room.players.find((p) => p.id !== room.pendingAskerId)?.id ?? null;
    key = `answer:${actingPlayerId}:${room.log.length}`;
    duration = ANSWER_TIME_MS;
  } else if (everyoneHere && room.phase === "playing") {
    actingPlayerId = room.currentTurnPlayerId;
    key = `turn:${actingPlayerId}:${room.log.length}`;
    duration = TURN_TIME_MS;
  }

  // Same step still running (e.g. a tab takeover): keep the current deadline.
  if (key !== null && key === room.timerKey && room.timer) {
    driveBot(ctx, room);
    return;
  }
  const hadTimer = room.timerKey !== null;
  // The step changed (or the clock paused): the acting player's time so far
  // counts towards their turn total; paused time never does.
  chargeTurnTime(room);
  if (key === null && room.timer && room.timerKey && room.timerDeadline !== null) {
    room.pausedTimerKey = room.timerKey;
    room.pausedTimerMs = Math.max(0, room.timerDeadline - Date.now());
  }
  clearTimer(room);

  if (key !== null) {
    if (key === room.pausedTimerKey) duration = room.pausedTimerMs;
    room.pausedTimerKey = null;
    room.timerKey = key;
    room.timerDeadline = Date.now() + duration;
    room.timerPlayerId = actingPlayerId;
    room.timerStartedAt = actingPlayerId ? Date.now() : null;
    room.timer = setTimeout(() => {
      try {
        onTimeout(ctx, room);
      } catch (err) {
        logger.error({ err }, "Turn timeout handler failed");
      }
    }, duration);
  }

  if (key !== null || hadTimer) ctx.io.to(room.code).emit("timer", timerPayload(room));
  driveBot(ctx, room);
}

function onTimeout(ctx: Engine, room: Room): void {
  room.timer = null;
  if (!ctx.rooms.has(room.code)) return;

  if (room.phase === "selection") {
    // Pick a random character for whoever didn't choose in time.
    for (const player of room.players.filter((p) => !p.isReady)) {
      player.selectedCharacterId = pickRandomCharacterId(room);
      player.isReady = true;
      emitToPlayer(ctx, player, "character_assigned", { characterId: player.selectedCharacterId });
      const opponent = opponentOf(room, player);
      if (opponent) emitToPlayer(ctx, opponent, "opponent_ready");
    }
    maybeStartGame(ctx, room);
    updateTimer(ctx, room);
    return;
  }

  if (room.phase !== "playing") return;

  // Out of time on the last-chance guess: the first player's win stands.
  if (room.lastChanceFor && room.firstPlayerId) {
    endGame(ctx, room, room.firstPlayerId, "correct_guess");
    return;
  }

  // Stalling costs a life, like a wrong guess.
  const answering = room.pendingQuestion !== null;
  const staller = room.players.find((p) => p.id === room.timerPlayerId);
  const opponent = staller && opponentOf(room, staller);
  if (!staller || !opponent) return;

  staller.lives -= 1;
  // A silent answerer drops the question and the asker keeps the turn;
  // a silent turn holder passes the turn. Either way the opponent plays.
  room.pendingQuestion = null;
  room.pendingAskerId = null;
  room.currentTurnPlayerId = opponent.id;
  room.log.push({ type: "timeout", playerId: staller.id });

  if (staller.lives <= 0) {
    endGame(ctx, room, opponent.id, "out_of_lives");
    return;
  }

  ctx.io.to(room.code).emit("turn_timeout", {
    playerId: staller.id,
    lives: staller.lives,
    currentTurnPlayerId: room.currentTurnPlayerId,
    while: answering ? "answering" : "playing",
  });
  updateTimer(ctx, room);
}

// A player dropped out: starts counting their absence and returns how long
// their seat is kept. Keep the seat for a while so a reload or a network blip
// isn't a forfeit, within what is left of this game's disconnection budget.
export function startAwayClock(room: Room, player: Player | undefined): number {
  let graceMs = RECONNECT_GRACE_MS;
  if (player && (room.phase === "selection" || room.phase === "playing")) {
    player.awaySince = Date.now();
    graceMs = Math.min(graceMs, Math.max(0, DISCONNECT_BUDGET_MS - player.awayMs));
  }
  return graceMs;
}

// The player is back: charge the time they were away to their budget.
export function stopAwayClock(player: Player): void {
  if (player.awaySince !== null) {
    player.awayMs += Date.now() - player.awaySince;
    player.awaySince = null;
  }
}
