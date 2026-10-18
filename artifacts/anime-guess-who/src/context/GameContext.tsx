import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { socket, saveSessionToken, saveProfileToken, MyStatsPayload, RatingUpdate, RoomMode, BotLevel, Reaction, GamePhase, GameOverReason, PlayerState, GameLogEntry, RoomSnapshot, TimerPayload } from "../lib/socket";
import type { Character } from "@workspace/api-client-react";
import type { VerifiableAttribute } from "../lib/questions";
import { toast } from "sonner";

interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  roomMode: RoomMode | null;
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
  lastChanceFor: string | null;
  revealedOpponentCharacterId: string | null;
  rematchRequestedBy: string | null;
  timer: TurnTimer | null;
  reactions: LiveReaction[]; // currently floating on screen
  reactionsMuted: boolean; // hide the opponent's reactions
  myStats: MyStatsPayload | null;
  ratingUpdate: RatingUpdate | null; // result of the game that just ended
  isConnected: boolean;
  hasConnectedOnce: boolean;
  connectionReplaced: boolean; // the server closed our connection: a reload is needed
  myName: string;
}

// Deadline converted to the local clock so client/server clock skew doesn't matter.
export interface TurnTimer {
  actingPlayerId: string | null;
  deadline: number;
}

function toTurnTimer({ actingPlayerId, msLeft }: TimerPayload): TurnTimer | null {
  return msLeft === null ? null : { actingPlayerId, deadline: Date.now() + msLeft };
}

export interface LiveReaction {
  id: number;
  playerId: string;
  emoji: Reaction;
}

const MUTE_KEY = "anime_who_mute_reactions";
const REACTION_LIFETIME_MS = 2600;

interface GameContextType extends GameState {
  setMyName: (name: string) => void;
  joinQueue: () => void;
  joinRoom: (code: string) => void;
  createPrivateRoom: () => void;
  playVsBot: (level: BotLevel) => void;
  selectCharacter: (id: string) => void;
  askQuestion: (q: string) => void;
  askVerifiedQuestion: (attribute: VerifiableAttribute, value: string) => void;
  answerQuestion: (a: "yes" | "no") => void;
  makeGuess: (id: string) => void;
  syncEliminations: (ids: string[]) => void;
  requestRematch: () => void;
  acceptRematch: () => void;
  leaveGame: () => void;
  refreshMyStats: () => void;
  sendReaction: (emoji: Reaction) => void;
  setReactionsMuted: (muted: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

const NAME_KEY = "anime_who_name";

function readStoredName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

const SNAPSHOT_PHASES: Record<RoomSnapshot["phase"], GamePhase> = {
  waiting: "lobby",
  selection: "selection",
  playing: "playing",
  ended: "ended",
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [myName, setMyNameState] = useState(readStoredName);
  const [isConnected, setIsConnected] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [connectionReplaced, setConnectionReplaced] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("home");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomMode, setRoomMode] = useState<RoomMode | null>(null);
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
  const [lastChanceFor, setLastChanceFor] = useState<string | null>(null);
  const [revealedOpponentCharacterId, setRevealedOpponentCharacterId] = useState<string | null>(null);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null);
  const [timer, setTimer] = useState<TurnTimer | null>(null);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [reactionsMuted, setReactionsMutedState] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  });
  const reactionsMutedRef = useRef(reactionsMuted);
  reactionsMutedRef.current = reactionsMuted;
  const reactionIdRef = useRef(0);
  const [myStats, setMyStats] = useState<MyStatsPayload | null>(null);
  const [ratingUpdate, setRatingUpdate] = useState<RatingUpdate | null>(null);

  // Socket listeners are registered once; they read the live phase from here.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const charactersRef = useRef(characters);
  charactersRef.current = characters;
  const myNameRef = useRef(myName);
  myNameRef.current = myName;
  const myPlayerIdRef = useRef(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  const resetGameState = () => {
    setRoomCode(null);
    setRoomMode(null);
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
    setLastChanceFor(null);
    setRevealedOpponentCharacterId(null);
    setRematchRequestedBy(null);
    setTimer(null);
    setRatingUpdate(null);
  };

  const startNewRound = (players: PlayerState[], characters: Character[]) => {
    setPhase("selection");
    setRatingUpdate(null);
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
    setLastChanceFor(null);
    setRevealedOpponentCharacterId(null);
    setRematchRequestedBy(null);
  };

  const applySnapshot = (room: RoomSnapshot) => {
    setPhase(SNAPSHOT_PHASES[room.phase]);
    setRoomCode(room.code);
    setRoomMode(room.mode);
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
    setLastChanceFor(room.lastChanceFor);
    setRevealedOpponentCharacterId(room.opponentCharacterId);
    setRematchRequestedBy(room.rematchRequestedBy);
    setTimer(toTurnTimer(room.timer));
  };

  const setMyName = (name: string) => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // Storage blocked (private mode…): the name just won't be remembered.
    }
    setMyNameState(name);
  };

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      setHasConnectedOnce(true);
      setConnectionReplaced(false);
    });
    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      // "io server disconnect": the server hung up (e.g. the game was opened
      // in another tab). socket.io won't retry that one by itself.
      if (reason === "io server disconnect") setConnectionReplaced(true);
    });

    socket.on("session", ({ token, playerId }) => {
      saveSessionToken(token);
      setMyPlayerId(playerId);
    });

    socket.on("profile", ({ token }) => {
      saveProfileToken(token);
      socket.emit("get_my_stats");
    });

    socket.on("my_stats", (payload) => setMyStats(payload));

    socket.on("rating_update", (update) => {
      setRatingUpdate(update);
      socket.emit("get_my_stats");
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
        toast.error("Connexion perdue. Ta partie n’a pas pu être récupérée.");
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

    socket.on("room_joined", ({ code, players, characters, mode }) => {
      setRoomCode(code);
      setRoomMode(mode);
      startNewRound(players, characters);
    });

    socket.on("opponent_ready", () => {
      setOpponentReady(true);
    });

    socket.on("reaction", ({ playerId, emoji }) => {
      if (playerId !== myPlayerIdRef.current && reactionsMutedRef.current) return;
      const id = ++reactionIdRef.current;
      // Keep only the last few on screen so spam can't flood it.
      setReactions(prev => [...prev.slice(-5), { id, playerId, emoji }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), REACTION_LIFETIME_MS);
    });

    socket.on("timer", (payload) => {
      setTimer(toTurnTimer(payload));
    });

    socket.on("character_assigned", ({ characterId }) => {
      setMyCharacterId(characterId);
      const name = charactersRef.current.find(c => c.id === characterId)?.name;
      toast.info(`Temps écoulé ! Ton personnage, choisi au hasard : ${name ?? "?"}.`, { duration: 6000 });
    });

    socket.on("turn_timeout", ({ playerId, lives, currentTurnPlayerId, while: during }) => {
      setPendingQuestion(null);
      setAwaitingAnswerFor(null);
      setGameLog(prev => [...prev, { id: Math.random().toString(), type: "timeout", playerId }]);
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, lives } : p));
      setCurrentTurnId(currentTurnPlayerId);
      if (playerId === myPlayerIdRef.current) {
        toast.error(during === "answering"
          ? "Pas de réponse à temps ! Tu perds une vie."
          : "Temps écoulé ! Tu perds une vie et ton tour.");
      } else {
        toast.success("Ton adversaire a dépassé le temps et perd une vie.");
      }
    });

    socket.on("connect_error", (err) => {
      if (err.message === "too_many_connections") {
        toast.error("Trop de connexions depuis ton réseau. Ferme quelques onglets et réessaie.");
      } else if (err.message === "server_full") {
        toast.error("Le serveur est complet pour le moment. Réessaie dans un instant.");
      }
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

    socket.on("question_answered", ({ currentTurnPlayerId, ...entry }) => {
      setPendingQuestion(null);
      setAwaitingAnswerFor(null);
      setGameLog(prev => [...prev, { ...entry, id: Math.random().toString() }]);
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
        toast.error("Raté ! Tu perds une vie.");
      } else {
        toast.success("L’adversaire s’est trompé !");
      }
    });

    socket.on("last_chance", ({ playerId }) => {
      setLastChanceFor(playerId);
      setCurrentTurnId(playerId);
      if (playerId === myPlayerIdRef.current) {
        toast.info("L’adversaire a trouvé ton personnage ! Dernière chance : devine le sien.", { duration: 6000 });
      } else {
        toast.success("Tu as trouvé ! L’adversaire a une dernière chance de deviner.", { duration: 6000 });
      }
    });

    socket.on("game_over", ({ winnerId, opponentCharacterId, reason }) => {
      setPhase("ended");
      setLastChanceFor(null);
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
        toast.warning(`Ton adversaire a perdu la connexion. On l’attend jusqu’à ${graceSeconds} s…`);
      }
    });

    socket.on("opponent_reconnected", () => {
      setOpponentConnected(true);
      if (phaseRef.current !== "ended") {
        toast.success("Ton adversaire est de retour !");
      }
    });

    socket.on("opponent_left", () => {
      setOpponentLeft(true);
      setRematchRequestedBy(null);
      const current = phaseRef.current;
      if (current === "selection" || current === "playing") {
        toast.error("Ton adversaire a quitté la partie.");
        setPhase("ended");
        setGameOverReason("opponent_left");
        setWinnerId(myPlayerIdRef.current);
      } else if (current === "ended") {
        toast.info("Ton adversaire a quitté la salle.");
      }
    });

    socket.on("rematch_requested", ({ byPlayerId }) => {
      setRematchRequestedBy(byPlayerId);
      if (byPlayerId !== myPlayerIdRef.current) {
        toast.info("Ton adversaire veut une revanche !");
      }
    });

    socket.on("rematch_started", ({ players, characters, mode }) => {
      setRoomMode(mode);
      startNewRound(players, characters);
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      if (phaseRef.current === "queue" || phaseRef.current === "lobby") {
        setPhase("home");
      }
    });

    // After the error boundary's "Réessayer" this provider is mounted again
    // while the socket is still connected, but with all its state reset: drop
    // the connection and reconnect, so the server sends the game state again
    // (the session token in localStorage gives us our seat back).
    if (socket.connected) socket.disconnect();
    socket.connect();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("session");
      socket.off("profile");
      socket.off("my_stats");
      socket.off("rating_update");
      socket.off("state_sync");
      socket.off("in_queue");
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("opponent_ready");
      socket.off("timer");
      socket.off("reaction");
      socket.off("character_assigned");
      socket.off("turn_timeout");
      socket.off("connect_error");
      socket.off("game_start");
      socket.off("question_asked");
      socket.off("awaiting_answer");
      socket.off("question_answered");
      socket.off("wrong_guess");
      socket.off("last_chance");
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

  const playVsBot = useCallback((level: BotLevel) => {
    if (!myName) return;
    resetGameState();
    socket.emit("play_vs_bot", { name: myName, level });
  }, [myName]);

  const selectCharacter = useCallback((id: string) => {
    setMyCharacterId(id);
    socket.emit("select_character", { characterId: id });
  }, []);

  const askQuestion = useCallback((q: string) => {
    socket.emit("ask_question", { question: q });
  }, []);

  const askVerifiedQuestion = useCallback((attribute: VerifiableAttribute, value: string) => {
    socket.emit("ask_question", { attribute, value });
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

  const sendReaction = useCallback((emoji: Reaction) => {
    socket.emit("react", { emoji });
  }, []);

  const setReactionsMuted = useCallback((muted: boolean) => {
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* storage blocked */ }
    setReactionsMutedState(muted);
    if (muted) setReactions(prev => prev.filter(r => r.playerId === myPlayerIdRef.current));
  }, []);

  const refreshMyStats = useCallback(() => {
    socket.emit("get_my_stats");
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
        roomMode,
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
        lastChanceFor,
        revealedOpponentCharacterId,
        rematchRequestedBy,
        timer,
        reactions,
        reactionsMuted,
        myStats,
        ratingUpdate,
        isConnected,
        hasConnectedOnce,
        connectionReplaced,
        myName,
        setMyName,
        joinQueue,
        joinRoom,
        createPrivateRoom,
        playVsBot,
        selectCharacter,
        askQuestion,
        askVerifiedQuestion,
        answerQuestion,
        makeGuess,
        syncEliminations,
        requestRematch,
        acceptRematch,
        leaveGame,
        refreshMyStats,
        sendReaction,
        setReactionsMuted,
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
