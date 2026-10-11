import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Heart, Search, MessageSquare, Crosshair, ChevronDown, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSecondsLeft } from "@/hooks/use-seconds-left";
import { LogEntryView } from "@/components/LogEntryView";
import { ReactionPicker } from "@/components/Reactions";
import { ATTRIBUTES, VerifiableAttribute, hasTrait, questionText, valueLabel, valuesOnBoard } from "@/lib/questions";
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
    roomMode
  } = useGame();
  // The computer only understands verified questions.
  const vsBot = roomMode === "bot";

  const secondsLeft = useSecondsLeft(timer?.deadline);
  const urgent = secondsLeft !== null && secondsLeft <= 10;

  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(() => new Set(myEliminatedIds));
  
  // Modals
  const [showAskModal, setShowAskModal] = useState(false);
  const [askMode, setAskMode] = useState<"verified" | "free">("verified");
  const [freeQuestion, setFreeQuestion] = useState("");
  const [askAttribute, setAskAttribute] = useState<VerifiableAttribute>("hairColor");
  const [askValue, setAskValue] = useState<string | null>(null);

  const [showGuessModal, setShowGuessModal] = useState(false);
  const [guessSearch, setGuessSearch] = useState("");
  
  const [showLog, setShowLog] = useState(false);

  const me = players.find(p => p.id === myPlayerId);
  const opponent = players.find(p => p.id !== myPlayerId);

  const isMyTurn = currentTurnId === myPlayerId;

  const toggleElimination = (id: string) => {
    setEliminatedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Sync in background
      syncEliminations(Array.from(next));
      return next;
    });
  };

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
    if (lastLog.askerId !== myPlayerId || !lastLog.attribute || !lastLog.value) return;
    const { attribute, value } = lastLog;
    const keep = lastLog.answer === "yes";
    const ruledOut = characters
      .filter(c => !eliminatedIds.has(c.id) && hasTrait(c, attribute, value) !== keep)
      .map(c => c.id);
    if (ruledOut.length === 0) return;
    toast(`Réponse : ${keep ? "OUI" : "NON"}`, {
      description: `${ruledOut.length} personnage${ruledOut.length > 1 ? "s ne correspondent" : " ne correspond"} pas.`,
      action: {
        label: "Les écarter",
        onClick: () => {
          setEliminatedIds(prev => {
            const next = new Set(prev);
            ruledOut.forEach(id => next.add(id));
            syncEliminations(Array.from(next));
            return next;
          });
        },
      },
      duration: 8000,
    });
    // Only react to new log entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLog?.id]);

  const handleGuess = (id: string) => {
    makeGuess(id);
    setShowGuessModal(false);
  };

  // Scroll log to bottom effect could go here if we were showing it inline permanently

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative pb-28 md:pb-32">
      
      {/* Top HUD (Opponent) + turn banner stay visible while scrolling the board */}
      <div className="sticky top-0 z-40">
        <div className="bg-card border-b-4 border-card-border p-3 flex justify-between items-center shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Adversaire</span>
            <span className="font-display font-black text-lg text-secondary truncate max-w-[150px]">
              {opponent?.name || "Joueur 2"}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart 
                key={i} 
                className={cn("w-5 h-5", i < (opponent?.lives || 0) ? "fill-secondary text-secondary" : "fill-muted text-muted-foreground opacity-30")} 
              />
            ))}
          </div>
        </div>

        {/* Turn Indicator Banner */}
        <div className={cn(
          "py-1.5 px-4 text-center font-bold uppercase tracking-widest text-xs transition-colors shadow-sm z-30 relative",
          isMyTurn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {!opponentConnected ? "Adversaire déconnecté — on l’attend…" : isMyTurn ? "À toi de jouer" : "Tour de l’adversaire"}
          {opponentConnected && secondsLeft !== null && !pendingQuestion && !awaitingAnswerFor && (
            <span className={cn("ml-2 tabular-nums", urgent && "text-red-500 animate-pulse")}>· {secondsLeft} s</span>
          )}
        </div>
      </div>

      {/* Game Board (Grid) */}
      <div className="p-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-w-6xl mx-auto w-full content-start">
        {characters.map(char => (
          <CharacterCard
            key={char.id}
            character={char}
            size="sm"
            eliminated={eliminatedIds.has(char.id)}
            onClick={() => toggleElimination(char.id)}
          />
        ))}
      </div>

      {/* Bottom HUD (Me & Actions) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t-4 border-card-border z-50 animate-in slide-in-from-bottom">
        <div className="p-3 flex justify-between items-center border-b border-border/50 bg-background/50">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Toi</span>
            <span className="font-display font-black text-lg text-primary truncate max-w-[150px]">
              {me?.name || "Joueur 1"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ReactionPicker />
            <Button variant="ghost" size="sm" onClick={() => setShowLog(!showLog)} className="font-bold relative">
              <MessageSquare className="w-4 h-4 mr-2" /> Historique
              {gameLog.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
              )}
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={cn("w-5 h-5", i < (me?.lives || 0) ? "fill-primary text-primary" : "fill-muted text-muted-foreground opacity-30")} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 flex gap-3 max-w-2xl mx-auto">
          <Button 
            className="flex-1 h-12 font-bold text-base bg-blue-600 hover:bg-blue-700" 
            disabled={!isMyTurn || !!awaitingAnswerFor}
            onClick={() => setShowAskModal(true)}
          >
            <Search className="w-5 h-5 mr-2" /> Poser une question
          </Button>
          <Button 
            className="flex-1 h-12 font-bold text-base bg-red-600 hover:bg-red-700" 
            disabled={!isMyTurn || !!awaitingAnswerFor}
            onClick={() => setShowGuessModal(true)}
          >
            <Crosshair className="w-5 h-5 mr-2" /> Deviner
          </Button>
        </div>
      </div>

      {/* OVERLAYS AND MODALS */}

      {/* Pending Question Modal (I am asked) */}
      <Dialog open={!!pendingQuestion} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden pointer-events-none">
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-2xl uppercase text-secondary">Question reçue !</DialogTitle>
            <DialogDescription className="text-lg font-bold text-foreground mt-4">
              « {pendingQuestion} »
            </DialogDescription>
            {secondsLeft !== null && (
              <p className={cn("text-sm font-bold mt-2 tabular-nums", urgent ? "text-red-500" : "text-muted-foreground")}>
                Réponds dans les {secondsLeft} s ou tu perds une vie
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Réponds honnêtement : ton personnage et toutes tes réponses seront révélés à la fin.
            </p>
          </DialogHeader>
          <div className="flex gap-4 mt-6 pointer-events-auto">
            <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-xl font-bold" onClick={() => answerQuestion("yes")}>
              <Check className="w-6 h-6 mr-2" /> OUI
            </Button>
            <Button className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-xl font-bold" onClick={() => answerQuestion("no")}>
              <X className="w-6 h-6 mr-2" /> NON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Awaiting Answer Overlay */}
      {awaitingAnswerFor && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card border-2 border-primary p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-primary uppercase">En attente de la réponse…</h3>
            <p className="text-lg font-medium">« {awaitingAnswerFor} »</p>
            {secondsLeft !== null && (
              <p className="text-sm text-muted-foreground font-bold tabular-nums">
                L’adversaire a {secondsLeft} s pour répondre
              </p>
            )}
            <div className="flex justify-center mt-4">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ask Question Modal */}
      <Dialog open={showAskModal} onOpenChange={setShowAskModal}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Poser une question</DialogTitle>
            <DialogDescription>
              {askMode === "verified"
                ? "Le jeu répond à ta place à partir de la fiche du personnage : impossible de mentir."
                : "C’est ton adversaire qui répond : sa réponse pourra être vérifiée à la fin de la partie."}
            </DialogDescription>
          </DialogHeader>

          {!vsBot && <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg" role="tablist">
            {(["verified", "free"] as const).map(mode => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={askMode === mode}
                onClick={() => setAskMode(mode)}
                className={cn(
                  "py-2 rounded-md text-sm font-bold transition-colors",
                  askMode === mode ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                {mode === "verified" ? "Question vérifiée" : "Question libre"}
              </button>
            ))}
          </div>}

          <form onSubmit={handleAsk} className="space-y-4 mt-2">
            {askMode === "verified" || vsBot ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {ATTRIBUTES.map(({ key, label }) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={askAttribute === key ? "default" : "outline"}
                      onClick={() => { setAskAttribute(key); setAskValue(null); }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {valuesOnBoard(characters, askAttribute).map(value => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={askValue === value ? "secondary" : "ghost"}
                      className={cn("border", askValue === value && "ring-2 ring-secondary")}
                      onClick={() => setAskValue(value)}
                    >
                      {valueLabel(askAttribute, value)}
                    </Button>
                  ))}
                </div>
                <p className="min-h-6 text-center font-bold italic">
                  {askValue ? `« ${questionText(askAttribute, askValue)} »` : "Choisis une réponse possible ci-dessus."}
                </p>
              </>
            ) : (
              <Input
                autoFocus
                placeholder="ex. Ton personnage se bat-il avec une épée ?"
                value={freeQuestion}
                onChange={e => setFreeQuestion(e.target.value)}
                maxLength={200}
                className="h-12"
              />
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={askMode === "verified" || vsBot ? !askValue : !freeQuestion.trim()}
                className="w-full h-12 text-lg font-bold"
              >
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Make a Guess Modal */}
      <Dialog open={showGuessModal} onOpenChange={setShowGuessModal}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
          <div className="p-4 border-b bg-card">
            <DialogTitle className="font-display text-2xl text-red-500 flex items-center">
              <Crosshair className="w-6 h-6 mr-2" /> Qui est-ce ?
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1 font-bold">
              Attention : une mauvaise réponse te coûte 1 vie !
            </p>
            <Input 
              placeholder="Rechercher un personnage…" 
              value={guessSearch}
              onChange={e => setGuessSearch(e.target.value)}
              className="mt-4"
            />
          </div>
          <ScrollArea className="flex-1 p-4 bg-muted/30">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {characters
                .filter(c => !eliminatedIds.has(c.id)) // Only show non-eliminated
                .filter(c => c.name.toLowerCase().includes(guessSearch.toLowerCase()))
                .map(char => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    size="sm"
                    className="cursor-pointer hover:border-red-500 hover:ring-2 ring-red-500/50"
                    onClick={() => handleGuess(char.id)}
                  />
              ))}
              {characters.filter(c => !eliminatedIds.has(c.id)).length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  Plus aucun personnage ! Remets-en un sur ta grille d’abord.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Game Log Drawer */}
      <div className={cn(
        "fixed inset-x-0 bottom-[140px] md:bottom-[130px] z-40 bg-card/95 backdrop-blur-xl border-t-2 border-border shadow-2xl transition-transform duration-300 ease-out",
        showLog ? "translate-y-0 h-[40vh]" : "translate-y-[120%]"
      )}>
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-bold uppercase tracking-wider text-sm">Historique</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLog(false)}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(40vh-45px)] p-4">
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
