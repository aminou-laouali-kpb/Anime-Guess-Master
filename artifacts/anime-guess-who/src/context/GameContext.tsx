import React, { createContext, useContext, useEffect, useReducer, useState, useCallback, useMemo, useRef } from "react";
import { socket, saveSessionToken, saveProfileToken, BotLevel, Reaction } from "../lib/socket";
import type { VerifiableAttribute } from "../lib/questions";
import { toast } from "sonner";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

export type { TurnTimer } from "./gameReducer";

export interface LiveReaction {
  id: number;
  playerId: string;
  emoji: Reaction;
}

const MUTE_KEY = "anime_who_mute_reactions";
const REACTION_LIFETIME_MS = 2600;

interface GameContextType extends GameState {
  reactionsMuted: boolean; // hide the opponent's reactions
  myName: string;
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

// Floating reactions change several times a second during emoji spam; they get
// their own context so a reaction only redraws the overlay, not the whole game.
interface ReactionsContextType {
  reactions: LiveReaction[]; // currently floating on screen
}

const ReactionsContext = createContext<ReactionsContextType | null>(null);

const NAME_KEY = "anime_who_name";

function readStoredName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

// Log entries only need an id unique within the page (React keys, and telling
// live entries from the "restored-" ones rebuilt after a reconnect).
let logIdCounter = 0;
const newLogId = () => `log-${++logIdCounter}`;

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Game state transitions live in gameReducer (pure); this component only
  // wires the socket to it and runs the side effects (toasts, emits, storage).
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [myName, setMyNameState] = useState(readStoredName);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [reactionsMuted, setReactionsMutedState] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  });
  const reactionsMutedRef = useRef(reactionsMuted);
  reactionsMutedRef.current = reactionsMuted;
  const reactionIdRef = useRef(0);

  // Socket listeners are registered once; their side effects read the live
  // state from here.
  const stateRef = useRef(state);
  stateRef.current = state;
  const myNameRef = useRef(myName);
  myNameRef.current = myName;

  const setMyName = useCallback((name: string) => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // Storage blocked (private mode…): the name just won't be remembered.
    }
    myNameRef.current = name;
    setMyNameState(name);
  }, []);

  useEffect(() => {
    const isMe = (playerId: string) => playerId === stateRef.current.myPlayerId;

    socket.on("connect", () => dispatch({ type: "connected" }));
    socket.on("disconnect", (reason) => {
      // "io server disconnect": the server hung up (e.g. the game was opened
      // in another tab). socket.io won't retry that one by itself.
      dispatch({ type: "disconnected", replaced: reason === "io server disconnect" });
    });

    socket.on("session", ({ token, playerId }) => {
      saveSessionToken(token);
      dispatch({ type: "session", playerId });
    });

    socket.on("profile", ({ token }) => {
      saveProfileToken(token);
      socket.emit("get_my_stats");
    });

    socket.on("my_stats", (stats) => dispatch({ type: "my_stats", stats }));

    socket.on("rating_update", (update) => {
      dispatch({ type: "rating_update", update });
      socket.emit("get_my_stats");
    });

    // Sent on every (re)connection: either our seat in a game, or nothing.
    socket.on("state_sync", ({ room }) => {
      if (!room) {
        const current = stateRef.current.phase;
        if (current === "queue") {
          // The server drops queued players on disconnect: get back in line.
          socket.emit("join_lobby", { name: myNameRef.current });
        } else if (current !== "home") {
          toast.error("Connexion perdue. Ta partie n’a pas pu être récupérée.");
        }
      }
      dispatch({ type: "state_sync", room, now: Date.now() });
    });

    socket.on("in_queue", ({ position }) => dispatch({ type: "in_queue", position }));
    socket.on("room_created", ({ code }) => dispatch({ type: "room_created", code }));
    socket.on("room_joined", ({ code, players, characters, mode }) => {
      dispatch({ type: "room_joined", code, players, characters, mode });
    });
    socket.on("opponent_ready", () => dispatch({ type: "opponent_ready" }));

    socket.on("reaction", ({ playerId, emoji }) => {
      if (!isMe(playerId) && reactionsMutedRef.current) return;
      const id = ++reactionIdRef.current;
      // Keep only the last few on screen so spam can't flood it.
      setReactions(prev => [...prev.slice(-5), { id, playerId, emoji }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), REACTION_LIFETIME_MS);
    });

    socket.on("timer", (timer) => dispatch({ type: "timer", timer, now: Date.now() }));

    socket.on("character_assigned", ({ characterId }) => {
      dispatch({ type: "character_assigned", characterId });
      const name = stateRef.current.characters.find(c => c.id === characterId)?.name;
      toast.info(`Temps écoulé ! Ton personnage, choisi au hasard : ${name ?? "?"}.`, { duration: 6000 });
    });

    socket.on("turn_timeout", ({ playerId, lives, currentTurnPlayerId, while: during }) => {
      dispatch({ type: "turn_timeout", playerId, lives, currentTurnPlayerId, logId: newLogId() });
      if (isMe(playerId)) {
        toast.error(during === "answering"
          ? "Pas de réponse à temps ! Tu perds une vie."
          : "Temps écoulé ! Tu perds une vie et ton tour.");
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
      dispatch({ type: "game_start", currentTurnPlayerId, players });
    });
    socket.on("question_asked", ({ question }) => dispatch({ type: "question_asked", question }));
    socket.on("awaiting_answer", ({ question }) => dispatch({ type: "awaiting_answer", question }));
    socket.on("question_answered", ({ currentTurnPlayerId, ...entry }) => {
      dispatch({ type: "question_answered", entry, currentTurnPlayerId, logId: newLogId() });
    });

    socket.on("wrong_guess", ({ guesserId, guessedCharacterId, lives, currentTurnPlayerId }) => {
      dispatch({ type: "wrong_guess", guesserId, guessedCharacterId, lives, currentTurnPlayerId, logId: newLogId() });
      if (isMe(guesserId)) {
        toast.error("Raté ! Tu perds une vie.");
      } else {
        toast.success("L’adversaire s’est trompé !");
      }
    });

    socket.on("last_chance", ({ playerId }) => {
      dispatch({ type: "last_chance", playerId });
      if (isMe(playerId)) {
        toast.info("L’adversaire a trouvé ton personnage ! Dernière chance : devine le sien.", { duration: 6000 });
      } else {
        toast.success("Tu as trouvé ! L’adversaire a une dernière chance de deviner.", { duration: 6000 });
      }
    });

    socket.on("game_over", ({ winnerId, opponentCharacterId, reason }) => {
      dispatch({ type: "game_over", winnerId, opponentCharacterId, reason });
    });

    socket.on("opponent_disconnected", ({ graceSeconds }) => {
      dispatch({ type: "opponent_disconnected" });
      if (stateRef.current.phase !== "ended") {
        toast.warning(`Ton adversaire a perdu la connexion. On l’attend jusqu’à ${graceSeconds} s…`);
      }
    });

    socket.on("opponent_reconnected", () => {
      dispatch({ type: "opponent_reconnected" });
      if (stateRef.current.phase !== "ended") {
        toast.success("Ton adversaire est de retour !");
      }
    });

    socket.on("opponent_left", () => {
      const current = stateRef.current.phase;
      if (current === "selection" || current === "playing") {
        toast.error("Ton adversaire a quitté la partie.");
      } else if (current === "ended") {
        toast.info("Ton adversaire a quitté la salle.");
      }
      dispatch({ type: "opponent_left" });
    });

    socket.on("rematch_requested", ({ byPlayerId }) => {
      dispatch({ type: "rematch_requested", byPlayerId });
      if (!isMe(byPlayerId)) {
        toast.info("Ton adversaire veut une revanche !");
      }
    });

    socket.on("rematch_started", ({ players, characters, mode }) => {
      dispatch({ type: "rematch_started", players, characters, mode });
    });

    socket.on("error", ({ message }) => {
      toast.error(message);
      dispatch({ type: "server_error" });
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

  // The actions read the name from a ref so they never change identity.
  const joinQueue = useCallback(() => {
    const name = myNameRef.current;
    if (!name) return;
    dispatch({ type: "reset", phase: "queue" });
    socket.emit("join_lobby", { name });
  }, []);

  const joinRoom = useCallback((code: string) => {
    const name = myNameRef.current;
    if (!name) return;
    dispatch({ type: "reset" });
    socket.emit("join_room", { code, name });
  }, []);

  const createPrivateRoom = useCallback(() => {
    const name = myNameRef.current;
    if (!name) return;
    dispatch({ type: "reset", phase: "lobby" });
    socket.emit("create_room", { name });
  }, []);

  const playVsBot = useCallback((level: BotLevel) => {
    const name = myNameRef.current;
    if (!name) return;
    dispatch({ type: "reset" });
    socket.emit("play_vs_bot", { name, level });
  }, []);

  const selectCharacter = useCallback((id: string) => {
    dispatch({ type: "select_character", characterId: id });
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
    if (muted) setReactions(prev => prev.filter(r => r.playerId === stateRef.current.myPlayerId));
  }, []);

  const refreshMyStats = useCallback(() => {
    socket.emit("get_my_stats");
  }, []);

  const leaveGame = useCallback(() => {
    socket.emit("leave_room");
    dispatch({ type: "reset", phase: "home" });
  }, []);

  // The reducer returns the same state object when nothing changed, so the
  // context value (and every consumer) only updates on real changes.
  const value = useMemo<GameContextType>(
    () => ({
      ...state,
      reactionsMuted,
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
    }),
    [
      state,
      reactionsMuted,
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
    ],
  );

  const reactionsValue = useMemo<ReactionsContextType>(() => ({ reactions }), [reactions]);

  return (
    <GameContext.Provider value={value}>
      <ReactionsContext.Provider value={reactionsValue}>{children}</ReactionsContext.Provider>
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


// The emojis currently floating on screen (see ReactionsContext).
export const useReactions = () => {
  const context = useContext(ReactionsContext);
  if (!context) {
    throw new Error("useReactions must be used within GameProvider");
  }
  return context;
};
