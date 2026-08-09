import type { Server as SocketIOServer, Socket } from "socket.io";
import characters from "../data/characters.json" assert { type: "json" };

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
}

export interface QAEntry {
  question: string;
  answer: "yes" | "no";
  askerSocketId: string;
}

export interface Player {
  socketId: string;
  name: string;
  selectedCharacterId: string | null;
  eliminatedIds: string[];
  lives: number;
  isReady: boolean;
}

export type RoomPhase = "waiting" | "selection" | "playing" | "ended";

export interface Room {
  code: string;
  phase: RoomPhase;
  players: Player[];
  currentTurnSocketId: string | null;
  qaLog: QAEntry[];
  pendingQuestion: string | null;
  pendingAskerSocketId: string | null;
  winnerId: string | null;
}

// ─── State ─────────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
const matchmakingQueue: string[] = []; // socketIds
const socketToRoom = new Map<string, string>(); // socketId → roomCode

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateCode() : code;
}

function createPlayer(socketId: string, name: string): Player {
  return {
    socketId,
    name,
    selectedCharacterId: null,
    eliminatedIds: [],
    lives: 3,
    isReady: false,
  };
}

function createRoom(code: string): Room {
  return {
    code,
    phase: "waiting",
    players: [],
    currentTurnSocketId: null,
    qaLog: [],
    pendingQuestion: null,
    pendingAskerSocketId: null,
    winnerId: null,
  };
}

export function getRoomPublicState(room: Room) {
  return {
    code: room.code,
    phase: room.phase,
    playerCount: room.players.length,
    hostName: room.players[0]?.name ?? null,
  };
}

export function getCharacters(): Character[] {
  return characters as Character[];
}

// ─── Room management (used by REST routes) ────────────────────────────────────

export function createRoomRest(hostName?: string): Room {
  const code = generateCode();
  const room = createRoom(code);
  rooms.set(code, room);
  return room;
}

export function getRoomByCode(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

// ─── Socket.IO game logic ─────────────────────────────────────────────────────

export function setupGameEngine(io: SocketIOServer): void {
  io.on("connection", (socket: Socket) => {
    // ── Join matchmaking queue ───────────────────────────────────────────────
    socket.on("join_lobby", ({ name }: { name: string }) => {
      const playerName = (name || "Player").slice(0, 24);

      if (matchmakingQueue.length > 0) {
        // Pair with the waiting player
        const waitingId = matchmakingQueue.shift()!;
        const code = generateCode();
        const room = createRoom(code);

        const waitingSocket = io.sockets.sockets.get(waitingId);
        const waitingName =
          (waitingSocket?.data as { name?: string })?.name ?? "Player";

        room.players.push(createPlayer(waitingId, waitingName));
        room.players.push(createPlayer(socket.id, playerName));
        room.phase = "selection";

        rooms.set(code, room);
        socketToRoom.set(waitingId, code);
        socketToRoom.set(socket.id, code);

        socket.data = { name: playerName };

        waitingSocket?.join(code);
        socket.join(code);

        io.to(code).emit("room_joined", {
          code,
          phase: room.phase,
          players: room.players.map((p) => ({
            socketId: p.socketId,
            name: p.name,
            lives: p.lives,
          })),
          characters: getCharacters(),
          yourSocketId: null, // clients will use their own socket.id
        });
      } else {
        // Wait in queue
        socket.data = { name: playerName };
        matchmakingQueue.push(socket.id);
        socket.emit("in_queue", { position: matchmakingQueue.length });
      }
    });

    // ── Create private room ──────────────────────────────────────────────────
    socket.on("create_room", ({ name }: { name: string }) => {
      const playerName = (name || "Player").slice(0, 24);
      socket.data = { name: playerName };

      const code = generateCode();
      const room = createRoom(code);
      room.players.push(createPlayer(socket.id, playerName));
      rooms.set(code, room);
      socketToRoom.set(socket.id, code);

      socket.join(code);
      socket.emit("room_created", { code });
    });

    // ── Join private room ────────────────────────────────────────────────────
    socket.on(
      "join_room",
      ({ code, name }: { code: string; name: string }) => {
        const roomCode = code.toUpperCase().trim();
        const room = rooms.get(roomCode);

        if (!room) {
          socket.emit("error", { message: "Room not found. Check the code and try again." });
          return;
        }
        if (room.players.length >= 2) {
          socket.emit("error", { message: "Room is already full." });
          return;
        }
        if (room.phase !== "waiting") {
          socket.emit("error", { message: "Game has already started." });
          return;
        }

        const playerName = (name || "Player").slice(0, 24);
        socket.data = { name: playerName };

        room.players.push(createPlayer(socket.id, playerName));
        room.phase = "selection";
        socketToRoom.set(socket.id, roomCode);

        socket.join(roomCode);

        io.to(roomCode).emit("room_joined", {
          code: roomCode,
          phase: room.phase,
          players: room.players.map((p) => ({
            socketId: p.socketId,
            name: p.name,
            lives: p.lives,
          })),
          characters: getCharacters(),
          yourSocketId: null,
        });
      },
    );

    // ── Select character ─────────────────────────────────────────────────────
    socket.on("select_character", ({ characterId }: { characterId: string }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "selection") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const char = getCharacters().find((c) => c.id === characterId);
      if (!char) return;

      player.selectedCharacterId = characterId;
      player.isReady = true;

      // Tell the other player this player is ready (without revealing the character)
      socket.to(code).emit("opponent_ready");

      // If both players are ready, start the game
      if (room.players.every((p) => p.isReady)) {
        room.phase = "playing";
        // Randomly pick who goes first
        const firstIdx = Math.floor(Math.random() * 2);
        room.currentTurnSocketId = room.players[firstIdx]!.socketId;

        io.to(code).emit("game_start", {
          currentTurnSocketId: room.currentTurnSocketId,
          players: room.players.map((p) => ({
            socketId: p.socketId,
            name: p.name,
            lives: p.lives,
            eliminatedIds: p.eliminatedIds,
          })),
        });
      }
    });

    // ── Ask a question ───────────────────────────────────────────────────────
    socket.on("ask_question", ({ question }: { question: string }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "playing") return;
      if (room.currentTurnSocketId !== socket.id) {
        socket.emit("error", { message: "It's not your turn." });
        return;
      }
      if (room.pendingQuestion) {
        socket.emit("error", { message: "A question is already pending." });
        return;
      }

      const q = question.slice(0, 200).trim();
      if (!q) return;

      room.pendingQuestion = q;
      room.pendingAskerSocketId = socket.id;

      // Forward question to the other player to answer
      const opponent = room.players.find((p) => p.socketId !== socket.id);
      if (!opponent) return;

      io.to(opponent.socketId).emit("question_asked", {
        question: q,
        askerSocketId: socket.id,
      });
      // Tell the asker to wait
      socket.emit("awaiting_answer", { question: q });
    });

    // ── Answer a question ────────────────────────────────────────────────────
    socket.on("answer_question", ({ answer }: { answer: "yes" | "no" }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "playing") return;
      if (room.pendingAskerSocketId === socket.id) {
        socket.emit("error", { message: "You can't answer your own question." });
        return;
      }
      if (!room.pendingQuestion) return;
      if (answer !== "yes" && answer !== "no") return;

      const entry: QAEntry = {
        question: room.pendingQuestion,
        answer,
        askerSocketId: room.pendingAskerSocketId!,
      };
      room.qaLog.push(entry);
      room.pendingQuestion = null;
      room.pendingAskerSocketId = null;

      // Switch turns
      const nextPlayer = room.players.find(
        (p) => p.socketId !== room.currentTurnSocketId,
      );
      room.currentTurnSocketId = nextPlayer?.socketId ?? room.currentTurnSocketId;

      io.to(code).emit("question_answered", {
        question: entry.question,
        answer: entry.answer,
        askerSocketId: entry.askerSocketId,
        currentTurnSocketId: room.currentTurnSocketId,
      });
    });

    // ── Make a guess ─────────────────────────────────────────────────────────
    socket.on("make_guess", ({ characterId }: { characterId: string }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "playing") return;
      if (room.currentTurnSocketId !== socket.id) {
        socket.emit("error", { message: "It's not your turn." });
        return;
      }

      const opponent = room.players.find((p) => p.socketId !== socket.id);
      if (!opponent) return;

      const correct = opponent.selectedCharacterId === characterId;
      const guesser = room.players.find((p) => p.socketId === socket.id)!;

      if (correct) {
        room.phase = "ended";
        room.winnerId = socket.id;

        io.to(code).emit("game_over", {
          winnerId: socket.id,
          loserOpponentCharacterId: opponent.selectedCharacterId,
          guesserCharacterId: guesser.selectedCharacterId,
          reason: "correct_guess",
        });
      } else {
        guesser.lives -= 1;

        if (guesser.lives <= 0) {
          room.phase = "ended";
          room.winnerId = opponent.socketId;

          io.to(code).emit("game_over", {
            winnerId: opponent.socketId,
            loserOpponentCharacterId: opponent.selectedCharacterId,
            guesserCharacterId: guesser.selectedCharacterId,
            reason: "out_of_lives",
          });
        } else {
          // Wrong guess — switch turns
          room.currentTurnSocketId = opponent.socketId;

          io.to(code).emit("wrong_guess", {
            guesserSocketId: socket.id,
            guessedCharacterId: characterId,
            lives: guesser.lives,
            currentTurnSocketId: room.currentTurnSocketId,
          });
        }
      }
    });

    // ── Sync eliminated characters (client-side state, broadcast for UI) ────
    socket.on("sync_eliminations", ({ eliminatedIds }: { eliminatedIds: string[] }) => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.eliminatedIds = eliminatedIds;
      }
    });

    // ── Rematch ──────────────────────────────────────────────────────────────
    socket.on("request_rematch", () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "ended") return;

      socket.to(code).emit("rematch_requested", { bySocketId: socket.id });
    });

    socket.on("accept_rematch", () => {
      const code = socketToRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "ended") return;

      // Reset room for a new game
      room.phase = "selection";
      room.qaLog = [];
      room.pendingQuestion = null;
      room.pendingAskerSocketId = null;
      room.winnerId = null;
      room.currentTurnSocketId = null;
      for (const p of room.players) {
        p.selectedCharacterId = null;
        p.eliminatedIds = [];
        p.lives = 3;
        p.isReady = false;
      }

      io.to(code).emit("rematch_started", {
        code,
        phase: room.phase,
        players: room.players.map((p) => ({
          socketId: p.socketId,
          name: p.name,
          lives: p.lives,
        })),
        characters: getCharacters(),
      });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      // Remove from matchmaking queue
      const qIdx = matchmakingQueue.indexOf(socket.id);
      if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);

      // Notify room
      const code = socketToRoom.get(socket.id);
      if (code) {
        const room = rooms.get(code);
        if (room && room.phase !== "ended") {
          room.phase = "ended";
          socket.to(code).emit("opponent_left", { socketId: socket.id });
        }
        socketToRoom.delete(socket.id);

        // Clean up room after a delay if both players are gone
        setTimeout(() => {
          const r = rooms.get(code);
          if (!r) return;
          const activePlayers = r.players.filter((p) =>
            io.sockets.sockets.has(p.socketId),
          );
          if (activePlayers.length === 0) {
            rooms.delete(code);
          }
        }, 30_000);
      }
    });
  });
}
