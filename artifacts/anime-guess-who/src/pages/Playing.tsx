import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Heart, Search, MessageSquare, Crosshair, ChevronDown, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/Countdown";
import { LogEntryView } from "@/components/LogEntryView";
import { ReactionPicker } from "@/components/Reactions";
import { LeaveGameButton } from "@/components/LeaveGameButton";
import { MyCharacterChip } from "@/components/MyCharacterChip";
import { ATTRIBUTES, VerifiableAttribute, hasTrait, questionText, valueLabel, valuesOnBoard } from "@/lib/questions";
import { plural } from "@/lib/fr";
import { usePageHeading } from "@/components/PageHeading";
import { CROSS_OUT_HINT_KEY, CrossOutHint, hasSeen, markSeen } from "@/components/Onboarding";
import { toast } from "sonner";

const ASK_MODES = ["verified", "free"] as const;

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
  
  // Modals
  const [showAskModal, setShowAskModal] = useState(false);
  const [askMode, setAskMode] = useState<"verified" | "free">("verified");
  const [freeQuestion, setFreeQuestion] = useState("");
  const [askAttribute, setAskAttribute] = useState<VerifiableAttribute>("hairColor");
  const [askValue, setAskValue] = useState<string | null>(null);

  const [showGuessModal, setShowGuessModal] = useState(false);
  const [guessSearch, setGuessSearch] = useState("");
  const [guessCandidate, setGuessCandidate] = useState<string | null>(null);

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
  
  const [showLog, setShowLog] = useState(false);

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

  // Question type tabs: arrow keys move between them (WAI-ARIA tabs pattern).
  const tabsId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const index = ASK_MODES.indexOf(askMode);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % ASK_MODES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + ASK_MODES.length) % ASK_MODES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ASK_MODES.length - 1;
    if (next === null) return;
    e.preventDefault();
    setAskMode(ASK_MODES[next]);
    tabRefs.current[ASK_MODES[next]]?.focus();
  };

  // If my turn ends while a dialog is open (time out), close it: acting now
  // would only get "Ce n'est pas ton tour."
  useEffect(() => {
    if (!canAct) {
      setShowAskModal(false);
      setShowGuessModal(false);
      setGuessCandidate(null);
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

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (askMode === "verified" || vsBot) {
      if (!askValue) return;
      askVerifiedQuestion(askAttribute, askValue);
      setAskValue(null);
      setShowAskModal(false);
    } else if (freeQuestion.trim()) {
      askQuestion(freeQuestion.trim());
      setFreeQuestion("");
      setShowAskModal(false);
    }
  };

  // After one of my verified questions, offer to cross out every character
  // the answer rules out (the answer is guaranteed true, so this is safe).
  const lastLog = gameLog[gameLog.length - 1];
  useEffect(() => {
    if (!lastLog || lastLog.type !== "qna" || !lastLog.verified) return;
    // Entries rebuilt after a reload are old news: don't offer to cross out again.
    if (lastLog.id.startsWith("restored-")) return;
    if (lastLog.askerId !== myPlayerId || !lastLog.attribute || !lastLog.value) return;
    const { attribute, value } = lastLog;
    const keep = lastLog.answer === "yes";
    const ruledOut = characters
      .filter(c => !eliminatedIds.has(c.id) && hasTrait(c, attribute, value) !== keep)
      .map(c => c.id);
    if (ruledOut.length === 0) return;
    toast(`Réponse : ${keep ? "OUI" : "NON"}`, {
      description: `${ruledOut.length} ${plural(ruledOut.length, "personnage ne correspond", "personnages ne correspondent")} pas.`,
      action: {
        label: "Les écarter",
        onClick: () => {
          setEliminatedIds(prev => {
            const next = new Set(prev);
            ruledOut.forEach(id => next.add(id));
            return next;
          });
        },
      },
      duration: 8000,
    });
    // Only react to new log entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLog?.id]);

  // Two steps so a mis-tap while scrolling doesn't cost a life.
  const confirmGuess = () => {
    if (!guessCandidate) return;
    makeGuess(guessCandidate);
    setGuessCandidate(null);
    setShowGuessModal(false);
  };
  const guessCandidateChar = characters.find(c => c.id === guessCandidate);
  const guessable = characters.filter(c => !eliminatedIds.has(c.id));
  const guessResults = guessable.filter(c => c.name.toLowerCase().includes(guessSearch.toLowerCase()));

  // Scroll log to bottom effect could go here if we were showing it inline permanently

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative" style={{ paddingBottom: hudHeight + 16 }}>
      
      {/* Top HUD (Opponent) + turn banner stay visible while scrolling the board */}
      <div className="sticky top-0 z-40">
        <div className="bg-card border-b-4 border-card-border p-3 flex justify-between items-center shadow-sm">
          <div className="flex flex-col">
            {/* Screen-reader heading for the game screen; the focus lands here on arrival. */}
            <h1 ref={headingRef} tabIndex={-1} className="sr-only">
              Partie contre {opponent?.name || "Joueur 2"}
            </h1>
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider" aria-hidden>Adversaire</span>
            <span className="font-display font-black text-lg text-secondary truncate max-w-[150px]" aria-hidden>
              {opponent?.name || "Joueur 2"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1" role="img" aria-label={`Vies de l’adversaire : ${opponent?.lives ?? 0} sur 3`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={cn("w-5 h-5", i < (opponent?.lives || 0) ? "fill-secondary text-secondary" : "fill-muted text-muted-foreground opacity-30")}
                />
              ))}
            </div>
            <LeaveGameButton countsAsLoss={!vsBot} className="text-muted-foreground" />
          </div>
        </div>

        {/* Turn Indicator Banner */}
        <div className={cn(
          "py-1.5 px-4 text-center font-bold uppercase tracking-widest text-xs transition-colors shadow-sm z-30 relative",
          isMyTurn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}>
          {/* Only the turn text is announced: the ticking seconds would talk non-stop. */}
          <span role="status" aria-live="polite">{turnText}</span>
          {opponentConnected && !pendingQuestion && !awaitingAnswerFor && (
            <Countdown deadline={timer?.deadline}>
              {(seconds, urgent) => (
                // Red text on the blue "your turn" banner would be unreadable:
                // a white pill instead. No blinking, which would fade the text.
                <span className={cn(
                  "ml-2 tabular-nums",
                  urgent && (isMyTurn ? "bg-white text-red-700 font-black rounded px-1.5" : "text-red-700 font-black")
                )}>
                  · {seconds} s
                </span>
              )}
            </Countdown>
          )}
        </div>
      </div>

      {showHint && <CrossOutHint onDismiss={dismissHint} />}

      {/* Game Board (Grid) */}
      <div className="p-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-w-6xl mx-auto w-full content-start">
        {characters.map(char => (
          <CharacterCard
            key={char.id}
            character={char}
            size="sm"
            action="eliminate"
            eliminated={eliminatedIds.has(char.id)}
            onPick={toggleElimination}
          />
        ))}
      </div>

      {/* Bottom HUD (Me & Actions) — must fit a 360px-wide phone */}
      <div
        ref={hudRef}
        className="fixed bottom-0 left-0 right-0 bg-card border-t-4 border-card-border z-50 animate-in slide-in-from-bottom"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50 bg-background/50">
          <MyCharacterChip character={myCharacter} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider truncate">
              Toi{myCharacter ? ` · ${myCharacter.name}` : ""}
            </span>
            <span className="font-display font-black text-lg text-primary truncate">
              {me?.name || "Joueur 1"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ReactionPicker />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLog(!showLog)}
              className="font-bold relative px-2"
              aria-label="Historique"
              aria-expanded={showLog}
              aria-controls="game-log"
            >
              <MessageSquare className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Historique</span>
              {gameLog.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full" />
              )}
            </Button>
            <div className="flex gap-0.5" role="img" aria-label={`Tes vies : ${me?.lives ?? 0} sur 3`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={cn("w-5 h-5", i < (me?.lives || 0) ? "fill-primary text-primary" : "fill-muted text-muted-foreground opacity-30")}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 flex gap-2 sm:gap-3 max-w-2xl mx-auto">
          <Button
            className="flex-1 min-w-0 h-12 font-bold text-sm sm:text-base bg-blue-600 hover:bg-blue-700"
            disabled={!canAsk || offline}
            onClick={() => setShowAskModal(true)}
          >
            <Search className="w-5 h-5 mr-1.5 shrink-0" />
            <span className="sm:hidden">Question</span>
            <span className="hidden sm:inline">Poser une question</span>
          </Button>
          <Button
            className="flex-1 min-w-0 h-12 font-bold text-sm sm:text-base bg-red-600 hover:bg-red-700"
            disabled={!canAct || offline}
            onClick={() => setShowGuessModal(true)}
          >
            <Crosshair className="w-5 h-5 mr-1.5 shrink-0" /> Deviner
          </Button>
        </div>
      </div>

      {/* OVERLAYS AND MODALS */}

      {/* Pending Question Modal (I am asked) */}
      <Dialog open={!!pendingQuestion} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden pointer-events-none">
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-2xl uppercase text-secondary">Question reçue !</DialogTitle>
            <DialogDescription className="text-lg font-bold text-foreground mt-4">
              « {pendingQuestion} »
            </DialogDescription>
            <Countdown deadline={timer?.deadline}>
              {(seconds, urgent) => (
                <p className={cn("text-sm font-bold mt-2 tabular-nums", urgent ? "text-red-600" : "text-muted-foreground")}>
                  Réponds dans les {seconds} s ou tu perds une vie
                </p>
              )}
            </Countdown>
            {myCharacter && (
              <p className="text-sm font-bold mt-2">
                Ton personnage : <span className="text-primary">{myCharacter.name}</span>
                <span className="text-muted-foreground font-normal"> ({myCharacter.anime})</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Réponds honnêtement : ton personnage et toutes tes réponses seront révélés à la fin.
            </p>
          </DialogHeader>
          <div className="flex gap-4 mt-6 pointer-events-auto">
            <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-xl font-bold" disabled={offline} onClick={() => answerQuestion("yes")}>
              <Check className="w-6 h-6 mr-2" /> OUI
            </Button>
            <Button className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-xl font-bold" disabled={offline} onClick={() => answerQuestion("no")}>
              <X className="w-6 h-6 mr-2" /> NON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Awaiting Answer Overlay */}
      {/* A real modal that can't be dismissed: the focus stays inside and the
          page behind is hidden from screen readers until the answer comes. */}
      <AlertDialogPrimitive.Root open={!!awaitingAnswerFor} onOpenChange={() => {}}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm animate-in fade-in" />
          <AlertDialogPrimitive.Content
            onEscapeKeyDown={(e) => e.preventDefault()}
            // The button that opened the question is gone by now: back to the heading.
            onCloseAutoFocus={(e) => { e.preventDefault(); headingRef.current?.focus({ preventScroll: true }); }}
            className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-3rem)] max-w-md bg-card border-2 border-primary p-6 rounded-2xl text-center space-y-4 shadow-2xl focus:outline-none animate-in fade-in"
          >
            <AlertDialogPrimitive.Title className="font-display text-xl font-bold text-primary uppercase">
              En attente de la réponse…
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-lg font-medium">
              « {awaitingAnswerFor} »
            </AlertDialogPrimitive.Description>
            <Countdown deadline={timer?.deadline}>
              {(seconds) => (
                <p className="text-sm text-muted-foreground font-bold tabular-nums">
                  L’adversaire a {seconds} s pour répondre
                </p>
              )}
            </Countdown>
            <div className="flex justify-center mt-4" aria-hidden>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      {/* Ask Question Modal */}
      <Dialog open={showAskModal} onOpenChange={setShowAskModal}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Poser une question</DialogTitle>
            <DialogDescription>
              {askMode === "verified"
                ? "Le jeu répond à ta place à partir de la fiche du personnage : impossible de mentir."
                : "C’est ton adversaire qui répond : sa réponse pourra être vérifiée à la fin de la partie."}
            </DialogDescription>
          </DialogHeader>

          {!vsBot && <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg" role="tablist" aria-label="Type de question">
            {ASK_MODES.map(mode => (
              <button
                key={mode}
                ref={el => { tabRefs.current[mode] = el; }}
                id={`${tabsId}-tab-${mode}`}
                type="button"
                role="tab"
                aria-selected={askMode === mode}
                aria-controls={`${tabsId}-panel`}
                // Roving focus: Tab reaches the selected tab, the arrows the other.
                tabIndex={askMode === mode ? 0 : -1}
                onClick={() => setAskMode(mode)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "py-2 rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  askMode === mode ? "bg-background shadow-sm" : "text-foreground/70"
                )}
              >
                {mode === "verified" ? "Question vérifiée" : "Question libre"}
              </button>
            ))}
          </div>}

          <form onSubmit={handleAsk} className="space-y-4 mt-2">
            <div
              {...(vsBot ? {} : { role: "tabpanel", id: `${tabsId}-panel`, "aria-labelledby": `${tabsId}-tab-${askMode}` })}
              className="space-y-4"
            >
            {askMode === "verified" || vsBot ? (
              <>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Caractéristique">
                  {ATTRIBUTES.map(({ key, label }) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={askAttribute === key ? "default" : "outline"}
                      aria-pressed={askAttribute === key}
                      onClick={() => { setAskAttribute(key); setAskValue(null); }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Réponse possible">
                  {valuesOnBoard(characters, askAttribute).map(value => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={askValue === value ? "secondary" : "ghost"}
                      aria-pressed={askValue === value}
                      className={cn("border", askValue === value && "ring-2 ring-secondary")}
                      onClick={() => setAskValue(value)}
                    >
                      {valueLabel(askAttribute, value)}
                    </Button>
                  ))}
                </div>
                <p className="min-h-6 text-center font-bold italic" aria-live="polite">
                  {askValue ? `« ${questionText(askAttribute, askValue)} »` : "Choisis une réponse possible ci-dessus."}
                </p>
              </>
            ) : (
              <Input
                autoFocus
                placeholder="ex. Ton personnage se bat-il avec une épée ?"
                aria-label="Ta question"
                value={freeQuestion}
                onChange={e => setFreeQuestion(e.target.value)}
                maxLength={200}
                className="h-12"
              />
            )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={offline || (askMode === "verified" || vsBot ? !askValue : !freeQuestion.trim())}
                className="w-full h-12 text-lg font-bold"
              >
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Make a Guess Modal */}
      <Dialog open={showGuessModal} onOpenChange={(open) => { setShowGuessModal(open); if (!open) setGuessCandidate(null); }}>
        <DialogContent
          className="max-w-3xl h-[85dvh] flex flex-col p-0 overflow-hidden gap-0"
          // Don't focus the search box: on phones it opens the keyboard over the grid.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-4 border-b bg-card">
            <DialogTitle className="font-display text-2xl text-red-600 flex items-center">
              <Crosshair className="w-6 h-6 mr-2" /> Qui est-ce ?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1 font-bold">
              Choisis un personnage puis confirme. Une mauvaise réponse te coûte 1 vie !
            </DialogDescription>
            <Input
              placeholder="Rechercher un personnage…"
              value={guessSearch}
              onChange={e => setGuessSearch(e.target.value)}
              className="mt-3"
              aria-label="Rechercher un personnage"
            />
          </div>
          <ScrollArea className="flex-1 p-4 bg-muted/30">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {guessResults.map(char => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  size="sm"
                  selected={guessCandidate === char.id}
                  className="cursor-pointer hover:border-red-500 hover:ring-2 ring-red-500/50"
                  onPick={setGuessCandidate}
                />
              ))}
              {guessable.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Plus aucun personnage ! Remets-en un sur ta grille d’abord.
                </div>
              ) : guessResults.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Aucun personnage ne correspond à « {guessSearch} ».
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-3 border-t bg-card flex items-center gap-2">
            <p className="flex-1 min-w-0 text-sm font-bold truncate">
              {guessCandidateChar ? `Deviner ${guessCandidateChar.name} ?` : "Touche un personnage pour le choisir."}
            </p>
            <Button
              className="bg-red-600 hover:bg-red-700 font-bold shrink-0"
              disabled={!guessCandidate || offline}
              onClick={confirmGuess}
            >
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Log Drawer */}
      {/* dvh, not vh: on phones vh ignores the browser bars and the drawer overflowed. */}
      <div id="game-log" className={cn(
        "fixed inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t-2 border-border shadow-2xl transition-transform duration-300 ease-out",
        showLog ? "translate-y-0 h-[40dvh]" : "translate-y-[120%] invisible"
      )} style={{ bottom: hudHeight }} aria-hidden={!showLog}>
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-bold uppercase tracking-wider text-sm">Historique</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLog(false)} aria-label="Fermer l’historique">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(40dvh-45px)] p-4">
          <div className="space-y-3">
            {gameLog.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Aucune action pour l’instant.</p>
            ) : (
              gameLog.map((log) => (
                <LogEntryView
                  key={log.id}
                  log={log}
                  myPlayerId={myPlayerId}
                  opponentName={opponent?.name}
                  characters={characters}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
};
