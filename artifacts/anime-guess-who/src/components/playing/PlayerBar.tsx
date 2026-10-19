import React from "react";
import { Search, MessageSquare, Crosshair } from "lucide-react";
import type { Character } from "@workspace/api-client-react";
import type { PlayerState } from "@workspace/game-protocol";
import { Button } from "@/components/ui/button";
import { MyCharacterChip } from "@/components/MyCharacterChip";
import { ReactionPicker } from "@/components/Reactions";
import { Lives } from "./Lives";

// Bottom HUD (me & actions) — must fit a 360px-wide phone.
export const PlayerBar: React.FC<{
  ref?: React.Ref<HTMLDivElement>;
  me: PlayerState | undefined;
  myCharacter: Character | undefined;
  hasLog: boolean;
  showLog: boolean;
  onToggleLog: () => void;
  canAsk: boolean;
  canGuess: boolean;
  onAsk: () => void;
  onGuess: () => void;
}> = ({ ref, me, myCharacter, hasLog, showLog, onToggleLog, canAsk, canGuess, onAsk, onGuess }) => (
  <div
    ref={ref}
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
          onClick={onToggleLog}
          className="font-bold relative px-2"
          aria-label="Historique"
          aria-expanded={showLog}
          aria-controls="game-log"
        >
          <MessageSquare className="w-5 h-5 sm:mr-2" />
          <span className="hidden sm:inline">Historique</span>
          {hasLog && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full" />
          )}
        </Button>
        <Lives
          lives={me?.lives}
          label={`Tes vies : ${me?.lives ?? 0} sur 3`}
          className="gap-0.5"
          fullClassName="fill-primary text-primary"
        />
      </div>
    </div>

    <div className="p-3 flex gap-2 sm:gap-3 max-w-2xl mx-auto">
      <Button
        className="flex-1 min-w-0 h-12 font-bold text-sm sm:text-base bg-blue-600 hover:bg-blue-700"
        disabled={!canAsk}
        onClick={onAsk}
      >
        <Search className="w-5 h-5 mr-1.5 shrink-0" />
        <span className="sm:hidden">Question</span>
        <span className="hidden sm:inline">Poser une question</span>
      </Button>
      <Button
        className="flex-1 min-w-0 h-12 font-bold text-sm sm:text-base bg-red-600 hover:bg-red-700"
        disabled={!canGuess}
        onClick={onGuess}
      >
        <Crosshair className="w-5 h-5 mr-1.5 shrink-0" /> Deviner
      </Button>
    </div>
  </div>
);
