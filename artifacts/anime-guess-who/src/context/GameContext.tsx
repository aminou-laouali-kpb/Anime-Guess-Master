import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { socket, saveSessionToken, GamePhase, GameOverReason, PlayerState, GameLogEntry, RoomSnapshot } from "../lib/socket";
import { Character, useListCharacters } from "@workspace/api-client-react";
import { toast } from "sonner";

interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  queuePosition: number | null;
  players: PlayerState[];
  characters: Character[];
  myPlayerId: string | null;
  myCharacterId: string | null; // For playing phase (secret selection)
  myEliminatedIds: string[]; // Restored from the server after a reconnect
  opponentReady: boolean;
  opponentConnected: boolean;
  opponentLeft: boolean;
  currentTurnId: string | null;
  pendingQuestion: string | null; // A question I need to answer
  awaitingAnswerFor: string | null; // A question I asked, waiting for answer
  gameLog: GameLogEntry[];
  winnerId: string | null;
  gameOverReason: GameOverReason | null;
  revealedOpponentCharacterId: string | null;
  rematchRequestedBy: string | null;
  isConnected: boolean;
  myName: string;
}

interface GameContextType extends GameState {
  setMyName: (name: string) => void;
  joinQueue: () => void;
  joinRoom: (code: string) => void;
  createPrivateRoom: () => void;
  selectCharacter: (id: string) => void;
  askQuestion: (q: string) => void;
  answerQuestion: (a: "yes" | "no") => void;
  makeGuess: (id: string) => void;
  syncEliminations: (ids: string[]) => void;
  requestRematch: () => void;
  acceptRematch: () => void;
  leaveGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

const SNAPSHOT_PHASES: Record<RoomSnapshot["phase"], GamePhase> = {
  waiting: "lobby",
  selection: "selection",
  playing: "playing",
  ended: "ended",
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pre-fetch characters to satisfy requirements and prime cache
  useListCharacters();

  const [myName, setMyNameState] = useState(() => localStorage.getItem("anime_who_name") || "");
  const [isConnected, setIsConnected] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("home");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);
  const [myEliminatedIds, setMyEliminatedIds] = useState<string[]>([]);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(true);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [awaitingAnswerFor, setAwaitingAnswerFor] = useState<string | null>(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason | null>(null);
  const [revealedOpponentCharacterId, setRevealedOpponentCharacterId] = useState<string | null>(null);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null);

  // Socket listeners are registered once; they read the live phase from here.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const myNameRef = useRef(myName);
  myNameRef.current = myName;
  const myPlayerIdRef = useRef(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  const resetGameState = () => {
    setRoomCode(null);
    setQueuePosition(null);
    setPlayers([]);
    setCharacters([]);
    setMyCharacterId(null);
    setMyEliminatedIds([]);
    setOpponentReady(false);
    setOpponentConnected(true);
    setOpponentLeft(false);
    setCurrentTurnId(null);
    setPendingQuestion(null);
    setAwaitingAnswerFor(null);
    setGameLog([]);
    setWinnerId(null);
    setGameOverReason(null);
    setRevealedOpponentCharacterId(null);
    setRematchRequestedBy(null);
  };

  const startNewRound = (players: PlayerState[], characters: Character[]) => {
    setPhase("selection");
    setPlayers(players);
    setCharacters(characters);
    setOpponentReady(false);
    setOpponentConnected(true);
    setOpponentLeft(false);
    setMyCharacterId(null);
    setMyEliminatedIds([]);
    setCurrentTurnId(null);
    setPendingQuestion(null);
    setAwaitingAnswerFor(null);
    setGameLog([]);
    setWinnerId(null);
    setGameOverReason(null);
    setRevealedOpponentCharacterId(null);
    setRematchRequestedBy(null);
  };

  const applySnapshot = (room: RoomSnapshot) => {
    setPhase(SNAPSHOT_PHASES[room.phase]);
    setRoomCode(room.code);
    setQueuePosition(null);
    setPlayers(room.players);
    setCharacters(room.characters);
    setMyCharacterId(room.myCharacterId);
    setMyEliminatedIds(room.myEliminatedIds);
    setOpponentReady(room.opponentReady);
    setOpponentConnected(room.opponentConnected);
    setOpponentLeft(room.phase !== "waiting" && room.players.length < 2);
    setCurrentTurnId(room.currentTurnPlayerId);
    setPendingQuestion(room.pendingQuestion);
    setAwaitingAnswerFor(room.awaitingAnswerFor);
    setGameLog(room.log.map((entry, i) => ({ ...entry, id: `restored-${i}` })));
    setWinnerId(room.winnerId);
    setGameOverReason(room.gameOverReason);
    setRevealedOpponentCharacterId(room.opponentCharacterId);
    setRematchRequestedBy(room.rematchRequestedBy);
  };

  const setMyName = (name: string) => {
    localStorage.setItem("anime_who_name", name);
    setMyNameState(name);
  };

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("session", ({ token, playerId }) => {
      saveSessionToken(token);
      setMyPlayerId(playerId);
    });

    // Sent on every (re)connection: either our seat in a game, or nothing.
    socket.on("state_sync", ({ room }) => {
      if (room) {
        applySnapshot(room);
        return;
      }
      const current = phaseRef.current;
      if (current === "queue") {
        // The server drops queued players on disconnect: get back in line.
        socket.emit("join_lobby", { name: myNameRef.current });
      } else if (current !== "home") {
        toast.error("Connection lost. Your game could not be restored.");
        resetGameState();
        setPhase("home");
      }
    });

    socket.on("in_queue", ({ position }) => {
      setPhase("queue");
      setQueuePosition(position);
    });

    socket.on("room_created", ({ code }) => {
      setPhase("lobby");
      setRoomCode(code);
    });

    socket.on("room_joined", ({ code, players, characters }) => {
      setRoomCode(code);
      startNewRound(players, characters);
    });

    socket.on("opponent_ready", () => {
      setOpponentReady(true);
    });

    socket.on("game_start", ({ currentTurnPlayerId, players }) => {
      setPhase("playing");
      setCurrentTurnId(currentTurnPlayerId);
      setPlayers(players);
    });

    socket.on("question_asked", ({ question }) => {
      setPendingQuestion(question);
    });

    socket.on("awaiting_answer", ({ question }) => {
      setAwaitingAnswerFor(question);
    });

    socket.on("question_answered", ({ question, answer, askerId, currentTurnPlayerId }) => {
      setPendingQuestion(null);
      setAwaitingAnswerFor(null);
      setGameLog(prev => [...prev, {
        id: Math.random().toString(),
        type: "qna",
        question,
        answer,
        askerId
      }]);
      setCurrentTurnId(currentTurnPlayerId);
    });

    socket.on("wrong_guess", ({ guesserId, guessedCharacterId, lives, currentTurnPlayerId }) => {
      setGameLog(prev => [...prev, {
        id: Math.random().toString(),
        type: "guess",
        guesserId,
        guessedCharacterId
      }]);
      setPlayers(prev => prev.map(p =>
        p.id === guesserId ? { ...p, lives } : p
      ));
      setCurrentTurnId(currentTurnPlayerId);
      if (guesserId === myPlayerIdRef.current) {
        toast.error("Wrong guess! You lost a life.");
      } else {
        toast.success("Opponent guessed wrong!");
      }
    });

    socket.on("game_over", ({ winnerId, opponentCharacterId, reason }) => {
      setPhase("ended");
      setWinnerId(winnerId);
      setRevealedOpponentCharacterId(opponentCharacterId);
      setGameOverReason(reason);
      setPendingQuestion(null);
      setAwaitingAnswerFor(null);
      setRematchRequestedBy(null);
    });

    socket.on("opponent_disconnected", ({ graceSeconds }) => {
      setOpponentConnected(false);
      if (phaseRef.current !== "ended") {
        toast.warning(`Opponent lost connection. Waiting up to ${graceSeconds}s for them to come back…`);
      }
    });

    socket.on("opponent_reconnected", () => {
      setOpponentConnected(true);
      if (phaseRef.current !== "ended") {
        toast.success("Opponent is back!");
      }
    });

    socket.on("opponent_left", () => {
      setOpponentLeft(true);
      setRematchRequestedBy(null);
      const current = phaseRef.current;
      if (current === "selection" || current === "playing") {
        toast.error("Opponent left the game.");
        setPhase("ended");
        setGameOverReason("opponent_left");
        setWinnerId(myPlayerIdRef.current);
      } else if (current === "ended") {
        toast.info("Opponent left the room.");
      }
    });

    socket.on("rematch_requested", ({ byPlayerId }) => {
      setRematchRequestedBy(byPlayerId);
      if (byPlayerId !== myPlayerIdRef.current) {
        toast.info("Opponent wants a rematch!");
      }
    });

    socket.on("rematch_started", ({ players, characters }) => {
      startNewRound(players, characters);
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      if (phaseRef.current === "queue" || phaseRef.current === "lobby") {
        setPhase("home");
      }
    });

    socket.connect();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("session");
      socket.off("state_sync");
      socket.off("in_queue");
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("opponent_ready");
      socket.off("game_start");
      socket.off("question_asked");
      socket.off("awaiting_answer");
      socket.off("question_answered");
      socket.off("wrong_guess");
      socket.off("game_over");
      socket.off("opponent_disconnected");
      socket.off("opponent_reconnected");
      socket.off("opponent_left");
      socket.off("rematch_requested");
      socket.off("rematch_started");
      socket.off("error");
    };
  }, []);

  const joinQueue = useCallback(() => {
    if (!myName) return;
    resetGameState();
    setPhase("queue");
    socket.emit("join_lobby", { name: myName });
  }, [myName]);

  const joinRoom = useCallback((code: string) => {
    if (!myName) return;
    resetGameState();
    socket.emit("join_room", { code, name: myName });
  }, [myName]);

  const createPrivateRoom = useCallback(() => {
    if (!myName) return;
    resetGameState();
    setPhase("lobby");
    socket.emit("create_room", { name: myName });
  }, [myName]);

  const selectCharacter = useCallback((id: string) => {
    setMyCharacterId(id);
    socket.emit("select_character", { characterId: id });
  }, []);

  const askQuestion = useCallback((q: string) => {
    socket.emit("ask_question", { question: q });
  }, []);

  const answerQuestion = useCallback((a: "yes" | "no") => {
    socket.emit("answer_question", { answer: a });
  }, []);

  const makeGuess = useCallback((id: string) => {
    socket.emit("make_guess", { characterId: id });
  }, []);

  const syncEliminations = useCallback((ids: string[]) => {
    socket.emit("sync_eliminations", { eliminatedIds: ids });
  }, []);

  const requestRematch = useCallback(() => {
    socket.emit("request_rematch");
  }, []);

  const acceptRematch = useCallback(() => {
    socket.emit("accept_rematch");
  }, []);

  const leaveGame = useCallback(() => {
    socket.emit("leave_room");
    resetGameState();
    setPhase("home");
  }, []);

  return (
    <GameContext.Provider
      value={{
        phase,
        roomCode,
        queuePosition,
        players,
        characters,
        myPlayerId,
        myCharacterId,
        myEliminatedIds,
        opponentReady,
        opponentConnected,
        opponentLeft,
        currentTurnId,
        pendingQuestion,
        awaitingAnswerFor,
        gameLog,
        winnerId,
        gameOverReason,
        revealedOpponentCharacterId,
        rematchRequestedBy,
        isConnected,
        myName,
        setMyName,
        joinQueue,
        joinRoom,
        createPrivateRoom,
        selectCharacter,
        askQuestion,
        answerQuestion,
        makeGuess,
        syncEliminations,
        requestRematch,
        acceptRematch,
        leaveGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};
