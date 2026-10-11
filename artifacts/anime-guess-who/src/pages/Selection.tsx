import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSecondsLeft } from "@/hooks/use-seconds-left";
import { LeaveGameButton } from "@/components/LeaveGameButton";

export const Selection: React.FC = () => {
  const { characters, selectCharacter, myCharacterId, opponentReady, myName, timer, players, myPlayerId } = useGame();
  const opponentName = players.find(p => p.id !== myPlayerId)?.name ?? "Adversaire";
  const secondsLeft = useSecondsLeft(timer?.deadline);
  
  // Local state to hold choice before confirming
  const [localSelection, setLocalSelection] = useState<string | null>(null);

  const handleConfirm = () => {
    if (localSelection) {
      selectCharacter(localSelection);
    }
  };

  const isLockedIn = myCharacterId !== null;

  // If the clock ran out and a character was picked for me, forget the one I
  // had tapped without confirming, so only the real choice is highlighted.
  useEffect(() => {
    if (myCharacterId) setLocalSelection(null);
  }, [myCharacterId]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative pb-24">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex flex-col items-center justify-center shadow-sm">
        <LeaveGameButton countsAsLoss={false} className="absolute top-2 right-2 text-muted-foreground" />
        <h2 className="font-display font-black text-2xl uppercase tracking-tight text-center px-8">
          {isLockedIn ? "En attente de l’adversaire" : "Choisis ton personnage secret"}
        </h2>
        <div className="flex items-center gap-4 mt-2 text-sm font-bold">
          <span className={isLockedIn ? "text-primary" : "text-muted-foreground"}>
            {myName} {isLockedIn ? "✓" : "…"}
          </span>
          <span className="text-muted-foreground/30">VS</span>
          <span className={opponentReady ? "text-secondary" : "text-muted-foreground"}>
            {opponentName} {opponentReady ? "✓" : "…"}
          </span>
        </div>
        {!isLockedIn && secondsLeft !== null && (
          <p className={`mt-1 text-xs font-bold uppercase tracking-widest tabular-nums ${secondsLeft <= 10 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
            encore {secondsLeft} s — sinon on choisit pour toi
          </p>
        )}
      </div>

      {/* Grid */}
      <div className="p-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-w-6xl mx-auto w-full">
        {characters.map((char, index) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
          >
            <CharacterCard
              character={char}
              size="sm"
              selected={(myCharacterId ?? localSelection) === char.id}
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
              Valider mon choix
            </Button>
          </div>
        </div>
      )}

      {isLockedIn && !opponentReady && (
        <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center items-center gap-3 bg-background/90 backdrop-blur-md border-t border-border z-50">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="font-bold uppercase tracking-widest text-sm text-muted-foreground">
            En attente de l’adversaire…
          </span>
        </div>
      )}
    </div>
  );
};
