import React, { useCallback, useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { LeaveGameButton } from "@/components/LeaveGameButton";
import { usePageHeading } from "@/components/PageHeading";

// ✓ / … next to each name, with words for screen readers.
const ReadyMark: React.FC<{ ready: boolean }> = ({ ready }) => (
  <>
    <span aria-hidden>{ready ? "✓" : "…"}</span>
    <span className="sr-only">{ready ? "prêt" : "en train de choisir"}</span>
  </>
);

export const Selection: React.FC = () => {
  const { characters, selectCharacter, myCharacterId, opponentReady, myName, timer, players, myPlayerId, isConnected } = useGame();
  const opponentName = players.find(p => p.id !== myPlayerId)?.name ?? "Adversaire";
  
  // Local state to hold choice before confirming
  const [localSelection, setLocalSelection] = useState<string | null>(null);

  const handleConfirm = () => {
    if (localSelection) {
      selectCharacter(localSelection);
    }
  };

  const isLockedIn = myCharacterId !== null;
  const pickCharacter = useCallback(
    (id: string) => {
      if (!isLockedIn) setLocalSelection(id);
    },
    [isLockedIn],
  );

  // If the clock ran out and a character was picked for me, forget the one I
  // had tapped without confirming, so only the real choice is highlighted.
  useEffect(() => {
    if (myCharacterId) setLocalSelection(null);
  }, [myCharacterId]);

  const heading = isLockedIn ? "En attente de l’adversaire" : "Choisis ton personnage secret";
  const headingRef = usePageHeading(heading);
  // Confirming removes the button that had the focus: put it on the heading.
  useEffect(() => {
    if (isLockedIn && (!document.activeElement || document.activeElement === document.body)) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [isLockedIn, headingRef]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex flex-col items-center justify-center shadow-sm">
        <LeaveGameButton countsAsLoss={false} className="absolute top-2 right-2 text-muted-foreground" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display font-black text-2xl uppercase tracking-tight text-center px-8 focus:outline-none"
        >
          {heading}
        </h1>
        {/* Announced when the opponent (or the clock) locks a choice in. */}
        <div className="flex items-center gap-4 mt-2 text-sm font-bold" role="status" aria-live="polite">
          <span className={isLockedIn ? "text-primary" : "text-muted-foreground"}>
            {myName} <ReadyMark ready={isLockedIn} />
          </span>
          <span className="text-muted-foreground" aria-hidden>VS</span>
          <span className={opponentReady ? "text-secondary" : "text-muted-foreground"}>
            {opponentName} <ReadyMark ready={opponentReady} />
          </span>
        </div>
        {!isLockedIn && (
          <Countdown deadline={timer?.deadline}>
            {(seconds, urgent) => (
              <p className={`mt-1 text-xs font-bold uppercase tracking-widest tabular-nums ${urgent ? "text-red-600 animate-pulse" : "text-muted-foreground"}`}>
                encore {seconds} s — sinon on choisit pour toi
              </p>
            )}
          </Countdown>
        )}
      </div>

      {/* Grid */}
      <div className="p-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-w-6xl mx-auto w-full">
        {characters.map((char, index) => (
          <div key={char.id} className="card-in" style={{ animationDelay: `${index * 30}ms` }}>
            <CharacterCard
              character={char}
              size="sm"
              selected={(myCharacterId ?? localSelection) === char.id}
              onPick={pickCharacter}
            />
          </div>
        ))}
      </div>

      {/* Action Bar Float */}
      {!isLockedIn && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pt-4 bg-background/90 backdrop-blur-md border-t border-border z-50 animate-in slide-in-from-bottom"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              className="w-full h-14 font-display font-bold text-lg"
              disabled={!localSelection || !isConnected}
              onClick={handleConfirm}
            >
              Valider mon choix
            </Button>
          </div>
        </div>
      )}

      {isLockedIn && !opponentReady && (
        <div
          className="fixed bottom-0 left-0 right-0 px-6 pt-6 flex justify-center items-center gap-3 bg-background/90 backdrop-blur-md border-t border-border z-50"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden />
          <span className="font-bold uppercase tracking-widest text-sm text-muted-foreground">
            En attente de l’adversaire…
          </span>
        </div>
      )}
    </div>
  );
};
