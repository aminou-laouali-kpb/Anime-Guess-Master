import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { socket, GamePhase, PlayerState, GameLogEntry } from "../lib/socket";
import { Character, useListCharacters } from "@workspace/api-client-react";
import { toast } from "sonner";

interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  queuePosition: number | null;
  players: PlayerState[];
  characters: Character[];
  myCharacterId: string | null; // For playing phase (secret selection)
  opponentReady: boolean;
  currentTurnId: string | null;
  pendingQuestion: string | null; // A question I need to answer
  awaitingAnswerFor: string | null; // A question I asked, waiting for answer
  gameLog: GameLogEntry[];
  winnerId: string | null;
  gameOverReason: string | null;
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
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [awaitingAnswerFor, setAwaitingAnswerFor] = useState<string | null>(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [revealedOpponentCharacterId, setRevealedOpponentCharacterId] = useState<string | null>(null);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null);

  const resetGameState = () => {
    setRoomCode(null);
    setQueuePosition(null);
    setPlayers([]);
    setCharacters([]);
    setMyCharacterId(null);
    setOpponentReady(false);
    setCurrentTurnId(null);
    setPendingQuestion(null);
    setAwaitingAnswerFor(null);
    setGameLog([]);
    setWinnerId(null);
    setGameOverReason(null);
    setRevealedOpponentCharacterId(null);
    setRematchRequestedBy(null);
  };

  const setMyName = (name: string) => {
    localStorage.setItem("anime_who_name", name);
    setMyNameState(name);
  };

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("in_queue", ({ position }) => {
      setPhase("queue");
      setQueuePosition(position);
    });

    socket.on("room_created", ({ code }) => {
      setPhase("lobby");
      setRoomCode(code);
    });

    socket.on("room_joined", ({ code, phase, players, characters }) => {
      setRoomCode(code);
      setPhase("selection");
      setPlayers(players);
      setCharacters(characters);
      setOpponentReady(false);
      setMyCharacterId(null);
      setGameLog([]);
      setWinnerId(null);
      setRematchRequestedBy(null);
    });

    socket.on("opponent_ready", () => {
      setOpponentReady(true);
    });

    socket.on("game_start", ({ currentTurnSocketId, players }) => {
      setPhase("playing");
      setCurrentTurnId(currentTurnSocketId);
      setPlayers(players);
    });

    socket.on("question_asked", ({ question, askerSocketId }) => {
      setPendingQuestion(question);
    });

    socket.on("awaiting_answer", ({ question }) => {
      setAwaitingAnswerFor(question);
    });

    socket.on("question_answered", ({ question, answer, askerSocketId, currentTurnSocketId }) => {
      setPendingQuestion(null);
      setAwaitingAnswerFor(null);
      setGameLog(prev => [...prev, {
        id: Math.random().toString(),
        type: "qna",
        question,
        answer,
        askerId: askerSocketId
      }]);
      setCurrentTurnId(currentTurnSocketId);
    });

    socket.on("wrong_guess", ({ guesserSocketId, guessedCharacterId, lives, currentTurnSocketId }) => {
      setGameLog(prev => [...prev, {
        id: Math.random().toString(),
        type: "guess",
        guesserId: guesserSocketId,
        guessedCharacterId,
        correct: false
      }]);
      setPlayers(prev => prev.map(p => 
        p.socketId === guesserSocketId ? { ...p, lives } : p
      ));
      setCurrentTurnId(currentTurnSocketId);
      if (guesserSocketId === socket.id) {
        toast.error("Wrong guess! You lost a life.");
      } else {
        toast.success("Opponent guessed wrong!");
      }
    });

    socket.on("game_over", ({ winnerId, loserOpponentCharacterId, guesserCharacterId, reason }) => {
      setPhase("ended");
      setWinnerId(winnerId);
      setRevealedOpponentCharacterId(loserOpponentCharacterId || guesserCharacterId || null);
      setGameOverReason(reason);
      setPendingQuestion(null);
      setAwaitingAnswerFor(null);
    });

    socket.on("opponent_left", () => {
      if (phase !== "home" && phase !== "ended") {
        toast.error("Opponent disconnected.");
        setPhase("ended");
        setGameOverReason("opponent_left");
        setWinnerId(socket.id || "unknown");
      }
    });

    socket.on("rematch_requested", ({ bySocketId }) => {
      setRematchRequestedBy(bySocketId);
      if (bySocketId !== socket.id) {
        toast.info("Opponent wants a rematch!");
      }
    });

    socket.on("rematch_started", ({ code, phase, players, characters }) => {
      setPhase("selection");
      setPlayers(players);
      setCharacters(characters);
      setOpponentReady(false);
      setMyCharacterId(null);
      setGameLog([]);
      setWinnerId(null);
      setRematchRequestedBy(null);
      setRevealedOpponentCharacterId(null);
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      if (phase === "queue" || phase === "lobby") {
        setPhase("home");
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
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
      socket.off("opponent_left");
      socket.off("rematch_requested");
      socket.off("rematch_started");
      socket.off("error");
    };
  }, [phase]);

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
    setRematchRequestedBy(socket.id as string);
    socket.emit("request_rematch");
  }, []);

  const acceptRematch = useCallback(() => {
    socket.emit("accept_rematch");
  }, []);

  const leaveGame = useCallback(() => {
    socket.disconnect();
    setTimeout(() => socket.connect(), 100);
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
        myCharacterId,
        opponentReady,
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
