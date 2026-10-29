import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGame } from "@/context/GameContext";
import { usePageHeading } from "@/components/PageHeading";
import { CROSS_OUT_HINT_KEY, CrossOutHint, hasSeen, markSeen } from "@/components/Onboarding";
import { OpponentBar } from "@/components/playing/OpponentBar";
import { TurnBanner } from "@/components/playing/TurnBanner";
import { Board } from "@/components/playing/Board";
import { PlayerBar } from "@/components/playing/PlayerBar";
import { AnswerPrompt } from "@/components/playing/AnswerPrompt";
import { AwaitingAnswer } from "@/components/playing/AwaitingAnswer";
import { AskDialog } from "@/components/playing/AskDialog";
import { GuessDialog } from "@/components/playing/GuessDialog";
import { HistoryDrawer } from "@/components/playing/HistoryDrawer";
import { RULE_OUT_TOAST, useAutoEliminate } from "@/hooks/use-auto-eliminate";
import { plural } from "@/lib/fr";
import { toast } from "sonner";

export const Playing: React.FC = () => {
  const {
    players,
    characters,
    currentTurnId,
    pendingQuestion,
    awaitingAnswerFor,
    gameLog,
    askQuestion,
    askVerifiedQuestion,
    answerQuestion,
    makeGuess,
    syncEliminations,
    myPlayerId,
    myEliminatedIds,
    opponentConnected,
    timer,
    roomMode,
    myCharacterId,
    lastChanceFor,
    isConnected
  } = useGame();
  const myCharacter = characters.find(c => c.id === myCharacterId);
  // The computer only understands verified questions.
  const vsBot = roomMode === "bot";

  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(() => new Set(myEliminatedIds));

  const [showAskModal, setShowAskModal] = useState(false);
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // The board is padded by the bottom bar's real height (it varies with the
  // screen width and the phone's safe area), so the last row is never hidden.
  const hudRef = useRef<HTMLDivElement>(null);
  const [hudHeight, setHudHeight] = useState(150);
  useLayoutEffect(() => {
    const el = hudRef.current;
    if (!el) return;
    const update = () => setHudHeight(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const me = players.find(p => p.id === myPlayerId);
  const opponent = players.find(p => p.id !== myPlayerId);

  const isMyTurn = currentTurnId === myPlayerId;
  const canAct = isMyTurn && !awaitingAnswerFor;
  // Last chance: the only move left is a guess.
  const canAsk = canAct && !lastChanceFor;
  // While the link to the server is down a move would go nowhere: the buttons
  // wait (the dialogs stay open, so nothing typed or picked is lost).
  const offline = !isConnected;

  const turnText = !opponentConnected
    ? "Adversaire déconnecté — on l’attend…"
    : lastChanceFor
      ? (isMyTurn ? "Dernière chance : devine !" : "Dernière chance de l’adversaire")
      : isMyTurn ? "À toi de jouer" : "Tour de l’adversaire";
  // The tab title follows the game, so a player in another tab sees their turn.
  const headingRef = usePageHeading(
    pendingQuestion ? "Question reçue" : awaitingAnswerFor ? "En attente de la réponse" : turnText,
    // A question dialog open on arrival takes the focus itself.
    !pendingQuestion && !awaitingAnswerFor,
  );

  // First game: a one-time tip above the board.
  const [showHint, setShowHint] = useState(() => !hasSeen(CROSS_OUT_HINT_KEY));
  const dismissHint = useCallback(() => {
    markSeen(CROSS_OUT_HINT_KEY);
    setShowHint(false);
  }, []);
  // Crossing out a card means the tip has done its job.
  const initialEliminations = useRef(eliminatedIds);
  useEffect(() => {
    if (showHint && eliminatedIds !== initialEliminations.current) dismissHint();
  }, [eliminatedIds, showHint, dismissHint]);

  // If my turn ends while a dialog is open (time out), close it: acting now
  // would only get "Ce n'est pas ton tour."
  useEffect(() => {
    if (!canAct) {
      setShowAskModal(false);
      setShowGuessModal(false);
    }
  }, [canAct]);

  // One stable function for all 24 cards, so they don't all redraw on each toggle.
  const toggleElimination = useCallback((id: string) => {
    setEliminatedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const eliminate = useCallback((ids: string[]) => {
    setEliminatedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  // Tell the server (so eliminations survive a reconnect) after the state has
  // changed, not from inside the state updater.
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false; // the initial value came from the server
      return;
    }
    // Debounced: a burst of taps must not trip the server's flood limiter.
    const timer = setTimeout(() => syncEliminations(Array.from(eliminatedIds)), 400);
    return () => clearTimeout(timer);
  }, [eliminatedIds, syncEliminations]);

  useAutoEliminate({ gameLog, myPlayerId, characters, eliminatedIds, eliminate });

  // The "Les écarter" offer would sit on top of a dialog: drop it when one opens.
  useEffect(() => {
    if (showAskModal || showGuessModal) toast.dismiss(RULE_OUT_TOAST);
  }, [showAskModal, showGuessModal]);

  // How many are left, and how to cross one out (the board is the main tool).
  const remaining = characters.filter(c => !eliminatedIds.has(c.id)).length;

  // The history dot means "something new since you last looked".
  const [seenLogCount, setSeenLogCount] = useState(gameLog.length);
  useEffect(() => {
    if (showLog) setSeenLogCount(gameLog.length);
  }, [showLog, gameLog.length]);
  const unreadLog = gameLog.length > seenLogCount;

  const toggleLog = useCallback(() => setShowLog(show => !show), []);
  const closeLog = useCallback(() => setShowLog(false), []);
  const openAsk = useCallback(() => setShowAskModal(true), []);
  const openGuess = useCallback(() => setShowGuessModal(true), []);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative" style={{ paddingBottom: hudHeight + 16 }}>

      {/* Top HUD (Opponent) + turn banner stay visible while scrolling the board */}
      <div className="sticky top-0 z-40">
        <OpponentBar opponent={opponent} vsBot={vsBot} headingRef={headingRef} />
        <TurnBanner
          turnText={turnText}
          isMyTurn={isMyTurn}
          showCountdown={opponentConnected && !pendingQuestion && !awaitingAnswerFor}
          deadline={timer?.deadline}
        />
      </div>

      <p className="px-3 pt-3 max-w-6xl mx-auto w-full text-xs font-bold text-muted-foreground" aria-live="polite">
        <span className="text-foreground tabular-nums">{remaining}</span> {plural(remaining, "possible", "possibles")} sur {characters.length}
        <span className="font-medium"> · touche une carte pour l’écarter</span>
      </p>

      {showHint && <CrossOutHint onDismiss={dismissHint} />}

      <Board characters={characters} eliminatedIds={eliminatedIds} onToggle={toggleElimination} />

      <PlayerBar
        ref={hudRef}
        me={me}
        myCharacter={myCharacter}
        unreadLog={unreadLog}
        showLog={showLog}
        onToggleLog={toggleLog}
        canAsk={canAsk && !offline}
        canGuess={canAct && !offline}
        onAsk={openAsk}
        onGuess={openGuess}
      />

      {/* OVERLAYS AND MODALS */}

      <AnswerPrompt
        question={pendingQuestion}
        deadline={timer?.deadline}
        myCharacter={myCharacter}
        offline={offline}
        onAnswer={answerQuestion}
      />

      <AwaitingAnswer question={awaitingAnswerFor} deadline={timer?.deadline} headingRef={headingRef} />

      <AskDialog
        open={showAskModal}
        onOpenChange={setShowAskModal}
        characters={characters}
        eliminatedIds={eliminatedIds}
        vsBot={vsBot}
        offline={offline}
        onAskVerified={askVerifiedQuestion}
        onAskFree={askQuestion}
      />

      <GuessDialog
        open={showGuessModal}
        onOpenChange={setShowGuessModal}
        characters={characters}
        eliminatedIds={eliminatedIds}
        offline={offline}
        onGuess={makeGuess}
      />

      <HistoryDrawer
        open={showLog}
        onClose={closeLog}
        bottom={hudHeight}
        gameLog={gameLog}
        myPlayerId={myPlayerId}
        opponentName={opponent?.name}
        characters={characters}
      />

    </div>
  );
};
