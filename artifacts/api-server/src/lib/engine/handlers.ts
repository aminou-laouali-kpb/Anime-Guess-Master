import type { Socket } from "socket.io";
import { REACTIONS, type ClientToServerEvents, type LogEntry } from "@workspace/game-protocol";
import { BOT_LEVELS, BOT_NAMES } from "../bot";
import { logger } from "../logger";
import { TokenBucket, clientIp, networkKey } from "../rate-limit";
import { MIN_RANKED_GAMES, getPlayerStats, statsEnabled } from "../stats";
import { driveBot } from "./bot-driver";
import {
  EVENT_BURST,
  EVENTS_PER_SECOND,
  IDLE_TIMEOUT_MS,
  MAX_CONNECTIONS_PER_IP,
  MAX_DROPPED_EVENTS,
  MAX_LIVES,
  MAX_QUESTIONS_PER_GAME,
  MAX_SESSIONS,
  REACTION_COOLDOWN_MS,
} from "./config";
import { payloadOf, readAttribute, readCharacterId, readName, readString } from "./input";
import { joinQueue, removeFromQueue } from "./matchmaking";
import { addToRoom, createRoom, dealBoard, emitRoomJoined, generateCode, opponentOf, snapshotFor } from "./rooms";
import { askVerified, leaveRoom, makeGuess, selectCharacter, startRematch } from "./rules";
import { attachSession, endSession, randomId } from "./sessions";
import { type Engine, type GameSocket, type Player, type Room, emitToPlayer, roomOf } from "./state";
import { startAwayClock, stopAwayClock, updateTimer } from "./timers";

// Socket.IO entry points: connection limits, then one handler per client event.

// Caps how many sockets one network (IPv4 address or IPv6 /64, see
// networkKey) and the whole server can hold.
export function connectionGate(ctx: Engine) {
  return (socket: GameSocket, next: (err?: Error) => void): void => {
    const ip = clientIp(socket.request);
    const netKey = networkKey(ip);
    if ((ctx.connectionsPerIp.get(netKey) ?? 0) >= MAX_CONNECTIONS_PER_IP) {
      next(new Error("too_many_connections"));
      return;
    }
    const auth = payloadOf(socket.handshake.auth);
    const resuming = typeof auth["token"] === "string" && ctx.sessions.has(auth["token"]);
    if (!resuming && ctx.sessions.size >= MAX_SESSIONS) {
      next(new Error("server_full"));
      return;
    }
    socket.data.ip = ip;
    socket.data.netKey = netKey;
    ctx.connectionsPerIp.set(netKey, (ctx.connectionsPerIp.get(netKey) ?? 0) + 1);
    next();
  };
}

export function handleConnection(ctx: Engine, socket: GameSocket): void {
  const { io } = ctx;
  const session = attachSession(ctx, socket);
  const bucket = new TokenBucket(EVENT_BURST, EVENTS_PER_SECOND);
  let droppedEvents = 0;
  let lastActivityAt = Date.now();

  // Idle check: re-armed until the socket is in a game or goes away.
  const isIdle = () => {
    if (ctx.queue.includes(session.token)) return false;
    const room = roomOf(ctx, session);
    return !room || room.phase === "waiting";
  };
  let idleTimer: NodeJS.Timeout | null = null;
  const checkIdle = () => {
    idleTimer = null;
    // Another tab took over: that socket is the one being watched now.
    if (!socket.connected || session.socketId !== socket.id) return;
    const quietFor = Date.now() - lastActivityAt;
    const idle = isIdle();
    if (idle && quietFor >= IDLE_TIMEOUT_MS) {
      socket.emit("error", { message: "Déconnecté après un long moment d’inactivité. Recharge la page pour rejouer." });
      socket.disconnect(true);
      return;
    }
    idleTimer = setTimeout(checkIdle, idle ? IDLE_TIMEOUT_MS - quietFor : IDLE_TIMEOUT_MS);
  };
  idleTimer = setTimeout(checkIdle, IDLE_TIMEOUT_MS);

  // Wraps every handler so a malformed payload or a bug can never crash
  // the process (which would kill every game in progress), and drops
  // events from clients that flood the server.
  // Flood limit on EVERY incoming packet, including event names we don't
  // handle (those used to skip the limit entirely).
  socket.use((_packet, next) => {
    lastActivityAt = Date.now();
    if (bucket.take()) {
      droppedEvents = 0;
      next();
      return;
    }
    droppedEvents += 1;
    if (droppedEvents === 1) {
      socket.emit("error", { message: "Doucement ! Trop d’actions d’un coup." });
    }
    if (droppedEvents > MAX_DROPPED_EVENTS) {
      logger.warn({ ip: socket.data.ip }, "Disconnecting flooding client");
      socket.disconnect(true);
    }
    // Not calling next(): the packet is dropped.
  });

  // The event name must exist in the contract. The payload stays untyped on
  // purpose: it comes from the client, so each handler validates it itself.
  function on(event: keyof ClientToServerEvents, handler: (payload: Record<string, unknown>) => void) {
    (socket as Socket).on(event, (raw: unknown) => {
      try {
        handler(payloadOf(raw));
      } catch (err) {
        logger.error({ err, event }, "Socket handler failed");
      }
    });
  }

  function currentRoomAndPlayer(): { room: Room; player: Player } | null {
    const room = roomOf(ctx, session);
    if (!room) return null;
    const player = room.players.find((p) => p.token === session.token);
    return player ? { room, player } : null;
  }

  try {
    socket.emit("session", { token: session.token, playerId: session.playerId });
    socket.emit("profile", { token: session.profileToken });

    const restored = currentRoomAndPlayer();
    if (restored) {
      stopAwayClock(restored.player);
      socket.join(restored.room.code);
      const opponent = opponentOf(restored.room, restored.player);
      if (opponent) emitToPlayer(ctx, opponent, "opponent_reconnected");
      // Resume the paused clock BEFORE taking the snapshot, so the state we
      // send already carries the time left (instead of "no clock" followed
      // by a separate timer event).
      updateTimer(ctx, restored.room);
    }
    socket.emit("state_sync", {
      room: restored ? snapshotFor(ctx, restored.room, restored.player) : null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to restore session");
  }

  // The server is shutting down: no new game.
  function refuseNewGame(): boolean {
    if (ctx.lifecycle.acceptingGames) return false;
    socket.emit("error", { message: "Le serveur redémarre : réessaie dans un instant." });
    return true;
  }

  // ── Join matchmaking queue ───────────────────────────────────────────────
  on("join_lobby", ({ name }) => {
    if (refuseNewGame()) return;
    session.name = readName(name);
    leaveRoom(ctx, session);

    const position = joinQueue(ctx, session);
    if (position !== null) socket.emit("in_queue", { position });
  });

  // ── Play against the computer ────────────────────────────────────────────
  on("play_vs_bot", ({ name, level }) => {
    if (refuseNewGame()) return;
    const botLevel = BOT_LEVELS.find((l) => l === level) ?? "normal";
    session.name = readName(name);
    removeFromQueue(ctx, session.token);
    leaveRoom(ctx, session);

    const room = createRoom(generateCode(ctx), "bot");
    room.botLevel = botLevel;
    ctx.rooms.set(room.code, room);
    addToRoom(ctx, room, session);
    room.players.push({
      id: randomId(12),
      token: `bot:${randomId(12)}`, // never matches a session
      profileToken: "",
      ip: "",
      isBot: true,
      name: BOT_NAMES[botLevel],
      selectedCharacterId: null,
      eliminatedIds: [],
      lives: MAX_LIVES,
      isReady: false,
      awayMs: 0,
      awaySince: null,
    });
    room.phase = "selection";
    room.characterIds = dealBoard();
    emitRoomJoined(ctx, room);
    updateTimer(ctx, room);
  });

  // ── Create private room ──────────────────────────────────────────────────
  on("create_room", ({ name }) => {
    if (refuseNewGame()) return;
    session.name = readName(name);
    removeFromQueue(ctx, session.token);
    leaveRoom(ctx, session);

    const room = createRoom(generateCode(ctx), "private");
    ctx.rooms.set(room.code, room);
    addToRoom(ctx, room, session);
    socket.emit("room_created", { code: room.code });
  });

  // ── Join private room ────────────────────────────────────────────────────
  on("join_room", ({ code, name }) => {
    if (refuseNewGame()) return;
    const roomCode = readString(code, 6)?.toUpperCase();
    const room = roomCode ? ctx.rooms.get(roomCode) : undefined;

    if (!room || room.players.length === 0) {
      socket.emit("error", { message: "Partie introuvable. Vérifie le code et réessaie." });
      return;
    }
    if (room.code === session.roomCode) return;
    if (room.players.length >= 2) {
      socket.emit("error", { message: "Cette partie est déjà complète." });
      return;
    }
    if (room.phase !== "waiting") {
      socket.emit("error", { message: "La partie a déjà commencé." });
      return;
    }

    session.name = readName(name);
    removeFromQueue(ctx, session.token);
    leaveRoom(ctx, session);

    addToRoom(ctx, room, session);
    room.phase = "selection";
    room.characterIds = dealBoard();
    emitRoomJoined(ctx, room);
    updateTimer(ctx, room);
  });

  // ── Personal stats ───────────────────────────────────────────────────────
  on("get_my_stats", () => {
    if (!statsEnabled) {
      socket.emit("my_stats", { enabled: false, minRankedGames: MIN_RANKED_GAMES, stats: null });
      return;
    }
    getPlayerStats(session.profileToken)
      .then((stats) =>
        socket.emit("my_stats", { enabled: true, minRankedGames: MIN_RANKED_GAMES, stats }),
      )
      .catch((err) => {
        logger.error({ err }, "Failed to load player stats");
        // Database trouble: hide the stats UI until the next successful call.
        socket.emit("my_stats", { enabled: false, minRankedGames: MIN_RANKED_GAMES, stats: null });
      });
  });

  // ── Leave the current room or queue on purpose ───────────────────────────
  on("leave_room", () => {
    removeFromQueue(ctx, session.token);
    leaveRoom(ctx, session);
  });

  // ── Select character ─────────────────────────────────────────────────────
  on("select_character", ({ characterId }) => {
    const current = currentRoomAndPlayer();
    if (!current || current.room.phase !== "selection") return;
    const { room, player } = current;

    const id = readCharacterId(room, characterId);
    if (!id || player.isReady) return;
    selectCharacter(ctx, room, player, id);
  });

  // ── Ask a question ───────────────────────────────────────────────────────
  on("ask_question", ({ question, attribute, value }) => {
    const current = currentRoomAndPlayer();
    if (!current || current.room.phase !== "playing") return;
    const { room, player } = current;

    if (room.currentTurnPlayerId !== player.id) {
      socket.emit("error", { message: "Ce n’est pas ton tour." });
      return;
    }
    if (room.pendingQuestion) {
      socket.emit("error", { message: "Une question est déjà en attente." });
      return;
    }
    if (room.lastChanceFor) {
      socket.emit("error", { message: "Dernière chance : il ne reste qu’à deviner." });
      return;
    }

    const opponent = opponentOf(room, player);
    if (!opponent) return;

    if (room.log.filter((e) => e.type === "qna").length >= MAX_QUESTIONS_PER_GAME) {
      socket.emit("error", { message: "Plus de questions possibles dans cette partie : il faut deviner !" });
      return;
    }

    // Verified question: answered right away from the opponent's real character.
    const attr = readAttribute(attribute);
    if (attr) {
      const asked = readString(value, 60);
      if (asked) askVerified(ctx, room, player, attr, asked);
      return;
    }

    // The computer can't read free text: verified questions only.
    if (opponent.isBot) {
      socket.emit("error", { message: "L’ordinateur ne comprend que les questions vérifiées." });
      return;
    }

    const q = readString(question, 200);
    if (!q) return;

    room.pendingQuestion = q;
    room.pendingAskerId = player.id;

    emitToPlayer(ctx, opponent, "question_asked", { question: q, askerId: player.id });
    socket.emit("awaiting_answer", { question: q });
    updateTimer(ctx, room);
  });

  // ── Answer a question ────────────────────────────────────────────────────
  on("answer_question", ({ answer }) => {
    const current = currentRoomAndPlayer();
    if (!current || current.room.phase !== "playing") return;
    const { room, player } = current;

    if (!room.pendingQuestion || !room.pendingAskerId) return;
    if (room.pendingAskerId === player.id) {
      socket.emit("error", { message: "Tu ne peux pas répondre à ta propre question." });
      return;
    }
    if (answer !== "yes" && answer !== "no") return;

    const entry: LogEntry = {
      type: "qna",
      question: room.pendingQuestion,
      verified: false,
      attribute: null,
      value: null,
      answer,
      askerId: room.pendingAskerId,
    };
    room.log.push(entry);
    room.pendingQuestion = null;
    room.pendingAskerId = null;
    // The answerer plays next.
    room.currentTurnPlayerId = player.id;

    io.to(room.code).emit("question_answered", {
      ...entry,
      currentTurnPlayerId: room.currentTurnPlayerId,
    });
    updateTimer(ctx, room);
  });

  // ── Make a guess ─────────────────────────────────────────────────────────
  on("make_guess", ({ characterId }) => {
    const current = currentRoomAndPlayer();
    if (!current || current.room.phase !== "playing") return;
    const { room, player } = current;

    if (room.currentTurnPlayerId !== player.id) {
      socket.emit("error", { message: "Ce n’est pas ton tour." });
      return;
    }
    if (room.pendingQuestion) {
      socket.emit("error", { message: "Attends d’abord la réponse à ta question." });
      return;
    }

    const id = readCharacterId(room, characterId);
    if (id) makeGuess(ctx, room, player, id);
  });

  // ── Emoji reactions ──────────────────────────────────────────────────────
  on("react", ({ emoji }) => {
    const current = currentRoomAndPlayer();
    if (!current || current.room.players.length < 2) return;
    const reaction = REACTIONS.find((r) => r === emoji);
    const now = Date.now();
    if (!reaction || now - session.lastReactionAt < REACTION_COOLDOWN_MS) return;
    session.lastReactionAt = now;
    io.to(current.room.code).emit("reaction", { playerId: current.player.id, emoji: reaction });
  });

  // ── Remember eliminated characters so they survive a reconnect ──────────
  on("sync_eliminations", ({ eliminatedIds }) => {
    const current = currentRoomAndPlayer();
    if (!current || !Array.isArray(eliminatedIds)) return;
    current.player.eliminatedIds = [
      ...new Set(eliminatedIds.filter((id): id is string => readCharacterId(current.room, id) !== null)),
    ];
  });

  // ── Rematch ──────────────────────────────────────────────────────────────
  on("request_rematch", () => {
    const current = currentRoomAndPlayer();
    if (!current || current.room.phase !== "ended" || current.room.players.length < 2) return;
    if (refuseNewGame()) return;

    current.room.rematchRequestedBy = current.player.id;
    io.to(current.room.code).emit("rematch_requested", { byPlayerId: current.player.id });
    driveBot(ctx, current.room); // the computer always accepts
  });

  on("accept_rematch", () => {
    const current = currentRoomAndPlayer();
    if (!current) return;
    const { room, player } = current;
    if (room.phase !== "ended" || room.players.length < 2) return;
    // Only the player who did *not* ask can accept.
    if (!room.rematchRequestedBy || room.rematchRequestedBy === player.id) return;
    if (refuseNewGame()) return;
    startRematch(ctx, room);
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (idleTimer) clearTimeout(idleTimer);
    const netKey = socket.data.netKey as string;
    const count = (ctx.connectionsPerIp.get(netKey) ?? 1) - 1;
    if (count > 0) ctx.connectionsPerIp.set(netKey, count);
    else ctx.connectionsPerIp.delete(netKey);

    try {
      // A newer tab took over this session: nothing to clean up.
      if (session.socketId !== socket.id) return;
      session.socketId = null;
      removeFromQueue(ctx, session.token);

      const room = roomOf(ctx, session);
      if (!room) {
        ctx.sessions.delete(session.token);
        return;
      }

      const graceMs = startAwayClock(room, room.players.find((p) => p.token === session.token));
      socket.to(room.code).emit("opponent_disconnected", {
        graceSeconds: graceMs / 1000,
      });
      updateTimer(ctx, room); // pauses the clock until they're back
      session.disconnectTimer = setTimeout(() => {
        session.disconnectTimer = null;
        if (session.socketId) return;
        try {
          endSession(ctx, session);
        } catch (err) {
          logger.error({ err }, "Failed to end session");
        }
      }, graceMs);
    } catch (err) {
      logger.error({ err }, "Disconnect handler failed");
    }
  });
}
