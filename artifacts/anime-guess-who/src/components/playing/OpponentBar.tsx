import React from "react";
import type { PlayerState } from "@workspace/game-protocol";
import { LeaveGameButton } from "@/components/LeaveGameButton";
import { Lives } from "./Lives";

// Top of the game screen: the opponent, their lives, and the leave button.
export const OpponentBar: React.FC<{
  opponent: PlayerState | undefined;
  vsBot: boolean;
  headingRef: React.Ref<HTMLHeadingElement>;
}> = ({ opponent, vsBot, headingRef }) => (
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
      <Lives
        lives={opponent?.lives}
        label={`Vies de l’adversaire : ${opponent?.lives ?? 0} sur 3`}
        className="gap-1"
        fullClassName="fill-secondary text-secondary"
      />
      <LeaveGameButton countsAsLoss={!vsBot} className="text-muted-foreground" />
    </div>
  </div>
);
