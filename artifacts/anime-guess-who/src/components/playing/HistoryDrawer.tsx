import React from "react";
import { ChevronDown } from "lucide-react";
import type { Character } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntryView } from "@/components/LogEntryView";
import type { GameLogEntry } from "@/lib/socket";
import { cn } from "@/lib/utils";

// The game log, sliding up above the bottom bar (`bottom` = its height).
// dvh, not vh: on phones vh ignores the browser bars and the drawer overflowed.
export const HistoryDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  bottom: number;
  gameLog: GameLogEntry[];
  myPlayerId: string | null;
  opponentName: string | undefined;
  characters: Character[];
}> = ({ open, onClose, bottom, gameLog, myPlayerId, opponentName, characters }) => (
  <div id="game-log" className={cn(
    "fixed inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t-2 border-border shadow-2xl transition-transform duration-300 ease-out",
    open ? "translate-y-0 h-[40dvh]" : "translate-y-[120%] invisible"
  )} style={{ bottom }} aria-hidden={!open}>
    <div className="flex items-center justify-between p-3 border-b">
      <h2 className="font-bold uppercase tracking-wider text-sm">Historique</h2>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fermer l’historique">
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
              opponentName={opponentName}
              characters={characters}
            />
          ))
        )}
      </div>
    </ScrollArea>
  </div>
);
