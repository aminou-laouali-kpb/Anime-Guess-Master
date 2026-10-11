import React, { useState } from "react";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Heart, Search, MessageSquare, Crosshair, ChevronDown, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSecondsLeft } from "@/hooks/use-seconds-left";

export const Playing: React.FC = () => {
  const {
    players,
    characters,
    currentTurnId,
    pendingQuestion,
    awaitingAnswerFor,
    gameLog,
    askQuestion,
    answerQuestion,
    makeGuess,
    syncEliminations,
    myPlayerId,
    myEliminatedIds,
    opponentConnected,
    timer
  } = useGame();

  const secondsLeft = useSecondsLeft(timer?.deadline);
  const urgent = secondsLeft !== null && secondsLeft <= 10;

  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(() => new Set(myEliminatedIds));
  
  // Modals
  const [showAskModal, setShowAskModal] = useState(false);
  const [questionText, setQuestionText] = useState("");

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
    if (questionText.trim()) {
      askQuestion(questionText.trim());
      setQuestionText("");
      setShowAskModal(false);
    }
  };

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
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Opponent</span>
            <span className="font-display font-black text-lg text-secondary truncate max-w-[150px]">
              {opponent?.name || "Player 2"}
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
          {!opponentConnected ? "Opponent disconnected — waiting for them…" : isMyTurn ? "Your Turn" : "Opponent's Turn"}
          {opponentConnected && secondsLeft !== null && !pendingQuestion && !awaitingAnswerFor && (
            <span className={cn("ml-2 tabular-nums", urgent && "text-red-500 animate-pulse")}>· {secondsLeft}s</span>
          )}
        </div>
      </div>

      {/* Game Board (Grid) */}
      <div className="flex-1 p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 max-w-7xl mx-auto w-full">
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
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">You</span>
            <span className="font-display font-black text-lg text-primary truncate max-w-[150px]">
              {me?.name || "Player 1"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setShowLog(!showLog)} className="font-bold relative">
              <MessageSquare className="w-4 h-4 mr-2" /> Log
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
            <Search className="w-5 h-5 mr-2" /> Ask Question
          </Button>
          <Button 
            className="flex-1 h-12 font-bold text-base bg-red-600 hover:bg-red-700" 
            disabled={!isMyTurn || !!awaitingAnswerFor}
            onClick={() => setShowGuessModal(true)}
          >
            <Crosshair className="w-5 h-5 mr-2" /> Make a Guess
          </Button>
        </div>
      </div>

      {/* OVERLAYS AND MODALS */}

      {/* Pending Question Modal (I am asked) */}
      <Dialog open={!!pendingQuestion} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden pointer-events-none">
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-2xl uppercase text-secondary">Incoming Question!</DialogTitle>
            <DialogDescription className="text-lg font-bold text-foreground mt-4">
              "{pendingQuestion}"
            </DialogDescription>
            {secondsLeft !== null && (
              <p className={cn("text-sm font-bold mt-2 tabular-nums", urgent ? "text-red-500" : "text-muted-foreground")}>
                Answer within {secondsLeft}s or lose a life
              </p>
            )}
          </DialogHeader>
          <div className="flex gap-4 mt-6 pointer-events-auto">
            <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-xl font-bold" onClick={() => answerQuestion("yes")}>
              <Check className="w-6 h-6 mr-2" /> YES
            </Button>
            <Button className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-xl font-bold" onClick={() => answerQuestion("no")}>
              <X className="w-6 h-6 mr-2" /> NO
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Awaiting Answer Overlay */}
      {awaitingAnswerFor && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card border-2 border-primary p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-primary uppercase">Awaiting Answer...</h3>
            <p className="text-lg font-medium">"{awaitingAnswerFor}"</p>
            {secondsLeft !== null && (
              <p className="text-sm text-muted-foreground font-bold tabular-nums">
                Opponent has {secondsLeft}s to answer
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Ask a Question</DialogTitle>
            <DialogDescription>
              Ask a yes/no question about your opponent's character.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAsk} className="space-y-4 mt-4">
            <Input 
              autoFocus
              placeholder="e.g. Does your character use a sword?"
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              className="h-12"
            />
            <DialogFooter>
              <Button type="submit" disabled={!questionText.trim()} className="w-full h-12 text-lg font-bold">
                Ask
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
              <Crosshair className="w-6 h-6 mr-2" /> Make Your Guess
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1 font-bold">
              Warning: A wrong guess will cost you 1 life!
            </p>
            <Input 
              placeholder="Search character name..." 
              value={guessSearch}
              onChange={e => setGuessSearch(e.target.value)}
              className="mt-4"
            />
          </div>
          <ScrollArea className="flex-1 p-4 bg-muted/30">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                  No characters left! Un-eliminate someone first.
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
          <h3 className="font-bold uppercase tracking-wider text-sm">Action Log</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLog(false)}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(40vh-45px)] p-4">
          <div className="space-y-3">
            {gameLog.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No actions yet.</p>
            ) : (
              gameLog.map((log) => {
                if (log.type === "qna") {
                  const askerName = log.askerId === myPlayerId ? "You" : opponent?.name;
                  return (
                    <div key={log.id} className="bg-muted/50 p-3 rounded-lg text-sm border border-border">
                      <div className="font-bold text-primary mb-1">{askerName} asked:</div>
                      <p className="italic mb-2">"{log.question}"</p>
                      <div className="flex items-center gap-2 font-black uppercase">
                        Answer: 
                        <span className={log.answer === "yes" ? "text-green-500" : "text-red-500"}>
                          {log.answer}
                        </span>
                      </div>
                    </div>
                  );
                } else if (log.type === "guess") {
                  const guesserName = log.guesserId === myPlayerId ? "You" : opponent?.name;
                  const guessedChar = characters.find(c => c.id === log.guessedCharacterId);
                  return (
                    <div key={log.id} className="bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/30">
                      <div className="font-bold text-red-500 mb-1">{guesserName} guessed:</div>
                      <p className="font-bold">{guessedChar?.name}</p>
                      <div className="text-red-600 font-black uppercase mt-1">INCORRECT! Lost a life.</div>
                    </div>
                  );
                } else if (log.type === "timeout") {
                  const name = log.playerId === myPlayerId ? "You" : opponent?.name;
                  return (
                    <div key={log.id} className="bg-amber-500/10 p-3 rounded-lg text-sm border border-amber-500/30">
                      <div className="font-bold text-amber-600">{name} ran out of time — lost a life.</div>
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
};
