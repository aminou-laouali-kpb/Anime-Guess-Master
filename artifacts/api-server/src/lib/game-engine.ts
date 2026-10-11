import { randomBytes } from "crypto";
import type { Server as SocketIOServer, Socket } from "socket.io";
import characters from "../data/characters.json" assert { type: "json" };
import { imageUrlFor } from "./character-images";
import { logger } from "./logger";
import { TokenBucket, clientIp } from "./rate-limit";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Character {
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
  image?: string; // optional manual override for the portrait URL
}

export interface CharacterWithImage extends Omit<Character, "image"> {
  imageUrl: string | null;
}

export type LogEntry =
  | { type: "qna"; question: string; answer: "yes" | "no"; askerId: string }
  | { type: "guess"; guesserId: string; guessedCharacterId: string }
  | { type: "timeout"; playerId: string };

export interface Player {
  id: string; // public id, safe to share with the opponent
  token: string; // secret session token, never sent to anyone but its owner
  name: string;
  selectedCharacterId: string | null;
  eliminatedIds: string[];
  lives: number;
  isReady: boolean;
}

export type RoomPhase = "waiting" | "selection" | "playing" | "ended";

export type GameOverReason = "correct_guess" | "out_of_lives" | "opponent_left";

export interface Room {
  code: string;
  phase: RoomPhase;
  characterIds: string[]; // this game's board, a random subset of all characters
  players: Player[];
  currentTurnPlayerId: string | null;
  log: LogEntry[];
  pendingQuestion: string | null;
  pendingAskerId: string | null;
  winnerId: string | null;
  gameOverReason: GameOverReason | null;
  rematchRequestedBy: string | null;
  timer: NodeJS.Timeout | null;
  timerKey: string | null;
  timerDeadline: number | null;
  timerPlayerId: string | null; // who must act before the deadline (null = both)
}

// A session outlives a single socket so a player can reload the page or lose
// the network for a moment without forfeiting the game.
interface Session {
  token: string;
  playerId: string;
  name: string;
  socketId: string | null;
  roomCode: string | null;
  disconnectTimer: NodeJS.Timeout | null;
}

// ─── State ─────────────────────────────────────────────────────────────────────

const MAX_LIVES = 3;
// Like the original board game: a smaller board keeps games short and readable.
const BOARD_SIZE = 24;
export const RECONNECT_GRACE_MS = 45_000;

// Nobody can stall a game forever: each step has a deadline.
const SELECTION_TIME_MS = 90_000;
const TURN_TIME_MS = 60_000;
const ANSWER_TIME_MS = 45_000;

// Abuse limits. Rooms only exist while a session holds them, so capping
// sessions caps rooms and the matchmaking queue too.
const MAX_SESSIONS = 2_000;
const MAX_CONNECTIONS_PER_IP = 20;
const EVENT_BURST = 20;
const EVENTS_PER_SECOND = 5;
const MAX_DROPPED_EVENTS = 100;

const rooms = new Map<string, Room>();
const sessions = new Map<string, Session>(); // token → session
const matchmakingQueue: string[] = []; // tokens

const allCharacters = characters as Character[];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

function randomId(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateCode() : code;
}

// Socket payloads come straight from the client: never trust their shape.
function payloadOf(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : {};
}

function readString(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().slice(0, maxLength);
  return value || null;
}

function readName(raw: unknown): string {
  return readString(raw, 24) ?? "Joueur";
}

function readCharacterId(room: Room, raw: unknown): string | null {
  return typeof raw === "string" && room.characterIds.includes(raw) ? raw : null;
}

function createPlayer(session: Session): Player {
  return {
    id: session.playerId,
    token: session.token,
    name: session.name,
    selectedCharacterId: null,
    eliminatedIds: [],
    lives: MAX_LIVES,
    isReady: false,
  };
}

function createRoom(code: string): Room {
  return {
    code,
    phase: "waiting",
    characterIds: [],
    players: [],
    currentTurnPlayerId: null,
    log: [],
    pendingQuestion: null,
    pendingAskerId: null,
    winnerId: null,
    gameOverReason: null,
    rematchRequestedBy: null,
    timer: null,
    timerKey: null,
    timerDeadline: null,
    timerPlayerId: null,
  };
}

function publicPlayers(room: Room) {
  return room.players.map((p) => ({ id: p.id, name: p.name, lives: p.lives }));
}

function opponentOf(room: Room, player: Player): Player | undefined {
  return room.players.find((p) => p.id !== player.id);
}

export function getCharacters(): CharacterWithImage[] {
  return allCharacters.map(({ image: _image, ...c }) => ({ ...c, imageUrl: imageUrlFor(c.id) }));
}

function dealBoard(): string[] {
  const ids = allCharacters.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids.slice(0, BOARD_SIZE);
}

function boardOf(room: Room): CharacterWithImage[] {
  const byId = new Map(getCharacters().map((c) => [c.id, c]));
  return room.characterIds.map((id) => byId.get(id)!).filter(Boolean);
}

// Everything a player needs to rebuild their screen after a reconnect.
function snapshotFor(room: Room, player: Player) {
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
    opponentConnected: opponent
      ? sessions.get(opponent.token)?.socketId != null
      : false,
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
    timer: timerPayload(room),
  };
}

function timerPayload(room: Room) {
  return room.timerDeadline === null
    ? { actingPlayerId: null, msLeft: null }
    : {
        actingPlayerId: room.timerPlayerId,
        msLeft: Math.max(0, room.timerDeadline - Date.now()),
      };
}

function pickRandomCharacterId(room: Room): string {
  return room.characterIds[Math.floor(Math.random() * room.characterIds.length)]!;
}

// ─── Socket.IO game logic ─────────────────────────────────────────────────────

export function setupGameEngine(io: SocketIOServer): void {
  function socketOf(session: Session | undefined): Socket | undefined {
    return session?.socketId ? io.sockets.sockets.get(session.socketId) : undefined;
  }

  function emitToPlayer(player: Player, event: string, payload?: unknown): void {
    socketOf(sessions.get(player.token))?.emit(event, payload);
  }

  function roomOf(session: Session): Room | undefined {
    if (!session.roomCode) return undefined;
    const room = rooms.get(session.roomCode);
    if (!room) session.roomCode = null;
    return room;
  }

  function removeFromQueue(token: string): void {
    const idx = matchmakingQueue.indexOf(token);
    if (idx !== -1) matchmakingQueue.splice(idx, 1);
  }

  function addToRoom(room: Room, session: Session): void {
    room.players.push(createPlayer(session));
    session.roomCode = room.code;
    socketOf(session)?.join(room.code);
  }

  function emitRoomJoined(room: Room): void {
    io.to(room.code).emit("room_joined", {
      code: room.code,
      phase: room.phase,
      players: publicPlayers(room),
      characters: boardOf(room),
    });
  }

  function isConnected(player: Player): boolean {
    return sessions.get(player.token)?.socketId != null;
  }

  function clearTimer(room: Room): void {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    room.timerKey = null;
    room.timerDeadline = null;
    room.timerPlayerId = null;
  }

  // Works out who has to act next and (re)arms the deadline. Call it after
  // every state change. The clock pauses while a player is disconnected,
  // and restarts in full when they come back (force).
  function updateTimer(room: Room, force = false): void {
    let key: string | null = null;
    let duration = 0;
    let actingPlayerId: string | null = null;

    const everyoneHere = room.players.length === 2 && room.players.every(isConnected);
    if (everyoneHere && room.phase === "selection") {
      key = "selection";
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

    if (!force && key !== null && key === room.timerKey) return;
    const hadTimer = room.timerKey !== null;
    clearTimer(room);

    if (key !== null) {
      room.timerKey = key;
      room.timerDeadline = Date.now() + duration;
      room.timerPlayerId = actingPlayerId;
      room.timer = setTimeout(() => {
        try {
          onTimeout(room);
        } catch (err) {
          logger.error({ err }, "Turn timeout handler failed");
        }
      }, duration);
    }

    if (key !== null || hadTimer) io.to(room.code).emit("timer", timerPayload(room));
  }

  function maybeStartGame(room: Room): void {
    if (room.players.length !== 2 || !room.players.every((p) => p.isReady)) return;

    room.phase = "playing";
    const firstIdx = Math.floor(Math.random() * 2);
    room.currentTurnPlayerId = room.players[firstIdx]!.id;

    io.to(room.code).emit("game_start", {
      currentTurnPlayerId: room.currentTurnPlayerId,
      players: publicPlayers(room),
    });
  }

  function onTimeout(room: Room): void {
    room.timer = null;
    if (!rooms.has(room.code)) return;

    if (room.phase === "selection") {
      // Pick a random character for whoever didn't choose in time.
      for (const player of room.players.filter((p) => !p.isReady)) {
        player.selectedCharacterId = pickRandomCharacterId(room);
        player.isReady = true;
        emitToPlayer(player, "character_assigned", { characterId: player.selectedCharacterId });
        const opponent = opponentOf(room, player);
        if (opponent) emitToPlayer(opponent, "opponent_ready");
      }
      maybeStartGame(room);
      updateTimer(room, true);
      return;
    }

    if (room.phase !== "playing") return;

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
      endGame(room, opponent.id, "out_of_lives");
      return;
    }

    io.to(room.code).emit("turn_timeout", {
      playerId: staller.id,
      lives: staller.lives,
      currentTurnPlayerId: room.currentTurnPlayerId,
      while: answering ? "answering" : "playing",
    });
    updateTimer(room, true);
  }

  // Each player gets their own game_over so "opponentCharacterId" is always
  // the *other* player's character.
  function endGame(room: Room, winnerId: string, reason: GameOverReason): void {
    room.phase = "ended";
    room.winnerId = winnerId;
    room.gameOverReason = reason;
    room.pendingQuestion = null;
    room.pendingAskerId = null;
    room.rematchRequestedBy = null;
    updateTimer(room);

    for (const player of room.players) {
      emitToPlayer(player, "game_over", {
        winnerId,
        reason,
        opponentCharacterId: opponentOf(room, player)?.selectedCharacterId ?? null,
      });
    }
  }

  // Removes the player for good and tells the opponent, whatever the phase.
  function leaveRoom(session: Session): void {
    const room = roomOf(session);
    session.roomCode = null;
    if (!room) return;

    socketOf(session)?.leave(room.code);
    room.players = room.players.filter((p) => p.token !== session.token);

    const remaining = room.players[0];
    if (!remaining) {
      clearTimer(room);
      rooms.delete(room.code);
      return;
    }

    if (room.phase !== "ended") {
      room.phase = "ended";
      room.winnerId = remaining.id;
      room.gameOverReason = "opponent_left";
      room.pendingQuestion = null;
      room.pendingAskerId = null;
    }
    room.rematchRequestedBy = null;
    updateTimer(room);
    emitToPlayer(remaining, "opponent_left");
  }

  function endSession(session: Session): void {
    if (session.disconnectTimer) clearTimeout(session.disconnectTimer);
    removeFromQueue(session.token);
    leaveRoom(session);
    sessions.delete(session.token);
  }

  function attachSession(socket: Socket): Session {
    const auth = payloadOf(socket.handshake.auth);
    const token =
      typeof auth["token"] === "string" && TOKEN_RE.test(auth["token"])
        ? auth["token"]
        : null;
    let session = token ? sessions.get(token) : undefined;

    if (session) {
      if (session.disconnectTimer) {
        clearTimeout(session.disconnectTimer);
        session.disconnectTimer = null;
      }
      // Same player opened the game in another tab: the newest tab wins.
      const previous = socketOf(session);
      session.socketId = socket.id;
      if (previous && previous.id !== socket.id) {
        previous.emit("error", { message: "La partie a été ouverte dans un autre onglet." });
        previous.disconnect(true);
      }
    } else {
      session = {
        token: randomId(24),
        playerId: randomId(12),
        name: "Joueur",
        socketId: socket.id,
        roomCode: null,
        disconnectTimer: null,
      };
      sessions.set(session.token, session);
    }

    return session;
  }

  // Caps how many sockets one IP and the whole server can hold.
  const connectionsPerIp = new Map<string, number>();

  io.use((socket, next) => {
    const ip = clientIp(socket.request);
    if ((connectionsPerIp.get(ip) ?? 0) >= MAX_CONNECTIONS_PER_IP) {
      next(new Error("too_many_connections"));
      return;
    }
    const auth = payloadOf(socket.handshake.auth);
    const resuming = typeof auth["token"] === "string" && sessions.has(auth["token"]);
    if (!resuming && sessions.size >= MAX_SESSIONS) {
      next(new Error("server_full"));
      return;
    }
    socket.data.ip = ip;
    connectionsPerIp.set(ip, (connectionsPerIp.get(ip) ?? 0) + 1);
    next();
  });

  io.on("connection", (socket: Socket) => {
    const session = attachSession(socket);
    const bucket = new TokenBucket(EVENT_BURST, EVENTS_PER_SECOND);
    let droppedEvents = 0;

    // Wraps every handler so a malformed payload or a bug can never crash
    // the process (which would kill every game in progress), and drops
    // events from clients that flood the server.
    function on(event: string, handler: (payload: Record<string, unknown>) => void) {
      socket.on(event, (raw: unknown) => {
        if (!bucket.take()) {
          droppedEvents += 1;
          if (droppedEvents === 1) {
            socket.emit("error", { message: "Doucement ! Trop d’actions d’un coup." });
          }
          if (droppedEvents > MAX_DROPPED_EVENTS) {
            logger.warn({ ip: socket.data.ip }, "Disconnecting flooding client");
            socket.disconnect(true);
          }
          return;
        }
        droppedEvents = 0;
        try {
          handler(payloadOf(raw));
        } catch (err) {
          logger.error({ err, event }, "Socket handler failed");
        }
      });
    }

    function currentRoomAndPlayer(): { room: Room; player: Player } | null {
      const room = roomOf(session);
      if (!room) return null;
      const player = room.players.find((p) => p.token === session.token);
      return player ? { room, player } : null;
    }

    try {
      socket.emit("session", { token: session.token, playerId: session.playerId });

      const restored = currentRoomAndPlayer();
      if (restored) {
        socket.join(restored.room.code);
        const opponent = opponentOf(restored.room, restored.player);
        if (opponent) emitToPlayer(opponent, "opponent_reconnected");
      }
      socket.emit("state_sync", {
        room: restored ? snapshotFor(restored.room, restored.player) : null,
      });
      if (restored) updateTimer(restored.room, true);
    } catch (err) {
      logger.error({ err }, "Failed to restore session");
    }

    // ── Join matchmaking queue ───────────────────────────────────────────────
    on("join_lobby", ({ name }) => {
      session.name = readName(name);
      leaveRoom(session);

      if (matchmakingQueue.includes(session.token)) {
        socket.emit("in_queue", { position: matchmakingQueue.indexOf(session.token) + 1 });
        return;
      }

      // Skip anyone who disconnected while waiting.
      let waiting: Session | undefined;
      while (!waiting && matchmakingQueue.length > 0) {
        const candidate = sessions.get(matchmakingQueue.shift()!);
        if (candidate?.socketId) waiting = candidate;
      }

      if (!waiting) {
        matchmakingQueue.push(session.token);
        socket.emit("in_queue", { position: matchmakingQueue.length });
        return;
      }

      const room = createRoom(generateCode());
      rooms.set(room.code, room);
      addToRoom(room, waiting);
      addToRoom(room, session);
      room.phase = "selection";
      room.characterIds = dealBoard();
      emitRoomJoined(room);
      updateTimer(room);
    });

    // ── Create private room ──────────────────────────────────────────────────
    on("create_room", ({ name }) => {
      session.name = readName(name);
      removeFromQueue(session.token);
      leaveRoom(session);

      const room = createRoom(generateCode());
      rooms.set(room.code, room);
      addToRoom(room, session);
      socket.emit("room_created", { code: room.code });
    });

    // ── Join private room ────────────────────────────────────────────────────
    on("join_room", ({ code, name }) => {
      const roomCode = readString(code, 6)?.toUpperCase();
      const room = roomCode ? rooms.get(roomCode) : undefined;

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
      removeFromQueue(session.token);
      leaveRoom(session);

      addToRoom(room, session);
      room.phase = "selection";
      room.characterIds = dealBoard();
      emitRoomJoined(room);
      updateTimer(room);
    });

    // ── Leave the current room or queue on purpose ───────────────────────────
    on("leave_room", () => {
      removeFromQueue(session.token);
      leaveRoom(session);
    });

    // ── Select character ─────────────────────────────────────────────────────
    on("select_character", ({ characterId }) => {
      const ctx = currentRoomAndPlayer();
      if (!ctx || ctx.room.phase !== "selection") return;
      const { room, player } = ctx;

      const id = readCharacterId(room, characterId);
      if (!id || player.isReady) return;

      player.selectedCharacterId = id;
      player.isReady = true;

      // Tell the other player this player is ready (without revealing the character)
      socket.to(room.code).emit("opponent_ready");

      maybeStartGame(room);
      updateTimer(room);
    });

    // ── Ask a question ───────────────────────────────────────────────────────
    on("ask_question", ({ question }) => {
      const ctx = currentRoomAndPlayer();
      if (!ctx || ctx.room.phase !== "playing") return;
      const { room, player } = ctx;

      if (room.currentTurnPlayerId !== player.id) {
        socket.emit("error", { message: "Ce n’est pas ton tour." });
        return;
      }
      if (room.pendingQuestion) {
        socket.emit("error", { message: "Une question est déjà en attente." });
        return;
      }

      const q = readString(question, 200);
      const opponent = opponentOf(room, player);
      if (!q || !opponent) return;

      room.pendingQuestion = q;
      room.pendingAskerId = player.id;

      emitToPlayer(opponent, "question_asked", { question: q, askerId: player.id });
      socket.emit("awaiting_answer", { question: q });
      updateTimer(room);
    });

    // ── Answer a question ────────────────────────────────────────────────────
    on("answer_question", ({ answer }) => {
      const ctx = currentRoomAndPlayer();
      if (!ctx || ctx.room.phase !== "playing") return;
      const { room, player } = ctx;

      if (!room.pendingQuestion || !room.pendingAskerId) return;
      if (room.pendingAskerId === player.id) {
        socket.emit("error", { message: "Tu ne peux pas répondre à ta propre question." });
        return;
      }
      if (answer !== "yes" && answer !== "no") return;

      const entry: LogEntry = {
        type: "qna",
        question: room.pendingQuestion,
        answer,
        askerId: room.pendingAskerId,
      };
      room.log.push(entry);
      room.pendingQuestion = null;
      room.pendingAskerId = null;
      // The answerer plays next.
      room.currentTurnPlayerId = player.id;

      io.to(room.code).emit("question_answered", {
        question: entry.question,
        answer: entry.answer,
        askerId: entry.askerId,
        currentTurnPlayerId: room.currentTurnPlayerId,
      });
      updateTimer(room);
    });

    // ── Make a guess ─────────────────────────────────────────────────────────
    on("make_guess", ({ characterId }) => {
      const ctx = currentRoomAndPlayer();
      if (!ctx || ctx.room.phase !== "playing") return;
      const { room, player } = ctx;

      if (room.currentTurnPlayerId !== player.id) {
        socket.emit("error", { message: "Ce n’est pas ton tour." });
        return;
      }
      if (room.pendingQuestion) {
        socket.emit("error", { message: "Attends d’abord la réponse à ta question." });
        return;
      }

      const id = readCharacterId(room, characterId);
      const opponent = opponentOf(room, player);
      if (!id || !opponent) return;

      if (opponent.selectedCharacterId === id) {
        endGame(room, player.id, "correct_guess");
        return;
      }

      player.lives -= 1;
      room.log.push({ type: "guess", guesserId: player.id, guessedCharacterId: id });

      if (player.lives <= 0) {
        endGame(room, opponent.id, "out_of_lives");
        return;
      }

      room.currentTurnPlayerId = opponent.id;
      io.to(room.code).emit("wrong_guess", {
        guesserId: player.id,
        guessedCharacterId: id,
        lives: player.lives,
        currentTurnPlayerId: room.currentTurnPlayerId,
      });
      updateTimer(room);
    });

    // ── Remember eliminated characters so they survive a reconnect ──────────
    on("sync_eliminations", ({ eliminatedIds }) => {
      const ctx = currentRoomAndPlayer();
      if (!ctx || !Array.isArray(eliminatedIds)) return;
      ctx.player.eliminatedIds = [
        ...new Set(eliminatedIds.filter((id): id is string => readCharacterId(ctx.room, id) !== null)),
      ];
    });

    // ── Rematch ──────────────────────────────────────────────────────────────
    on("request_rematch", () => {
      const ctx = currentRoomAndPlayer();
      if (!ctx || ctx.room.phase !== "ended" || ctx.room.players.length < 2) return;

      ctx.room.rematchRequestedBy = ctx.player.id;
      io.to(ctx.room.code).emit("rematch_requested", { byPlayerId: ctx.player.id });
    });

    on("accept_rematch", () => {
      const ctx = currentRoomAndPlayer();
      if (!ctx) return;
      const { room, player } = ctx;
      if (room.phase !== "ended" || room.players.length < 2) return;
      // Only the player who did *not* ask can accept.
      if (!room.rematchRequestedBy || room.rematchRequestedBy === player.id) return;

      room.phase = "selection";
      room.characterIds = dealBoard(); // fresh board for the rematch
      room.log = [];
      room.pendingQuestion = null;
      room.pendingAskerId = null;
      room.winnerId = null;
      room.gameOverReason = null;
      room.rematchRequestedBy = null;
      room.currentTurnPlayerId = null;
      for (const p of room.players) {
        p.selectedCharacterId = null;
        p.eliminatedIds = [];
        p.lives = MAX_LIVES;
        p.isReady = false;
      }

      io.to(room.code).emit("rematch_started", {
        code: room.code,
        phase: room.phase,
        players: publicPlayers(room),
        characters: boardOf(room),
      });
      updateTimer(room);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const ip = socket.data.ip as string;
      const count = (connectionsPerIp.get(ip) ?? 1) - 1;
      if (count > 0) connectionsPerIp.set(ip, count);
      else connectionsPerIp.delete(ip);

      try {
        // A newer tab took over this session: nothing to clean up.
        if (session.socketId !== socket.id) return;
        session.socketId = null;
        removeFromQueue(session.token);

        const room = roomOf(session);
        if (!room) {
          sessions.delete(session.token);
          return;
        }

        // Keep the seat for a while so a reload or a network blip isn't a forfeit.
        socket.to(room.code).emit("opponent_disconnected", {
          graceSeconds: RECONNECT_GRACE_MS / 1000,
        });
        updateTimer(room); // pauses the clock until they're back
        session.disconnectTimer = setTimeout(() => {
          session.disconnectTimer = null;
          if (session.socketId) return;
          try {
            endSession(session);
          } catch (err) {
            logger.error({ err }, "Failed to end session");
          }
        }, RECONNECT_GRACE_MS);
      } catch (err) {
        logger.error({ err }, "Disconnect handler failed");
      }
    });
  });
}
