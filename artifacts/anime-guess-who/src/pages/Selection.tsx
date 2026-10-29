import React, { useCallback, useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { CharacterCard } from "@/components/CharacterCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { LeaveGameButton } from "@/components/LeaveGameButton";
import { usePageHeading } from "@/components/PageHeading";

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
  const pickedName = characters.find(c => c.id === localSelection)?.name;
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
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 sm:py-4 flex flex-col items-center justify-center shadow-sm">
        <LeaveGameButton countsAsLoss={false} className="absolute top-2 right-2 text-muted-foreground" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display font-black text-xl sm:text-2xl uppercase tracking-tight text-center px-10 focus:outline-none"
        >
          {heading}
        </h1>
        {/* Who has chosen: a clear status, announced when the opponent (or the clock) locks a choice in. */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs sm:text-sm font-bold w-full" role="status" aria-live="polite">
          <PlayerStatus name={myName} ready={isLockedIn} tone="text-primary" />
          <span className="text-muted-foreground/50 shrink-0" aria-hidden>VS</span>
          <PlayerStatus name={opponentName} ready={opponentReady} tone="text-secondary" />
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
              <span className="truncate">{pickedName ? `Valider : ${pickedName}` : "Valider mon choix"}</span>
            </Button>
            {!localSelection && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Touche un personnage : c’est lui que ton adversaire devra deviner.
              </p>
            )}
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

const PlayerStatus: React.FC<{ name: string; ready: boolean; tone: string }> = ({ name, ready, tone }) => (
  <span className="flex items-center gap-1.5 min-w-0">
    <span className={`truncate ${ready ? tone : "text-foreground"}`}>{name}</span>
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
        ready ? "bg-green-600/15 text-green-700" : "bg-muted text-muted-foreground"
      }`}
    >
      {ready ? "prêt ✓" : "réfléchit"}
    </span>
  </span>
);
