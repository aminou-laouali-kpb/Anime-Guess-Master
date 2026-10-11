import React, { useState } from "react";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSecondsLeft } from "@/hooks/use-seconds-left";

export const Selection: React.FC = () => {
  const { characters, selectCharacter, myCharacterId, opponentReady, myName, timer } = useGame();
  const secondsLeft = useSecondsLeft(timer?.deadline);
  
  // Local state to hold choice before confirming
  const [localSelection, setLocalSelection] = useState<string | null>(null);

  const handleConfirm = () => {
    if (localSelection) {
      selectCharacter(localSelection);
    }
  };

  const isLockedIn = myCharacterId !== null;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative pb-24">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex flex-col items-center justify-center shadow-sm">
        <h2 className="font-display font-black text-2xl uppercase tracking-tight text-center">
          {isLockedIn ? "Waiting for Opponent" : "Pick Your Secret Character"}
        </h2>
        <div className="flex items-center gap-4 mt-2 text-sm font-bold">
          <span className={isLockedIn ? "text-primary" : "text-muted-foreground"}>
            {myName} {isLockedIn ? "✓" : "..."}
          </span>
          <span className="text-muted-foreground/30">VS</span>
          <span className={opponentReady ? "text-secondary" : "text-muted-foreground"}>
            Opponent {opponentReady ? "✓" : "..."}
          </span>
        </div>
        {!isLockedIn && secondsLeft !== null && (
          <p className={`mt-1 text-xs font-bold uppercase tracking-widest tabular-nums ${secondsLeft <= 10 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
            {secondsLeft}s left — then we pick for you
          </p>
        )}
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-w-7xl mx-auto w-full">
        {characters.map((char, index) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
          >
            <CharacterCard
              character={char}
              selected={localSelection === char.id || myCharacterId === char.id}
              onClick={() => {
                if (!isLockedIn) {
                  setLocalSelection(char.id);
                }
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Action Bar Float */}
      {!isLockedIn && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border z-50 animate-in slide-in-from-bottom">
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              className="w-full h-14 font-display font-bold text-lg"
              disabled={!localSelection}
              onClick={handleConfirm}
            >
              Lock In Selection
            </Button>
          </div>
        </div>
      )}

      {isLockedIn && !opponentReady && (
        <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center items-center gap-3 bg-background/90 backdrop-blur-md border-t border-border z-50">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="font-bold uppercase tracking-widest text-sm text-muted-foreground">
            Awaiting Opponent...
          </span>
        </div>
      )}
    </div>
  );
};
