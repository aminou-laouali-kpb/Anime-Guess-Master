import React, { useState } from "react";
import { SmilePlus, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGame } from "@/context/GameContext";
import { REACTIONS, Reaction } from "@/lib/socket";
import { cn } from "@/lib/utils";

const LABELS: Record<Reaction, string> = {
  "👍": "Pouce levé",
  "😂": "Mort de rire",
  "😮": "Surpris",
  "😅": "Gêné",
  "🤔": "Je réfléchis",
  "😱": "Choqué",
  "🔥": "En feu",
  "👏": "Bravo",
};

// Hash the id so each reaction drifts from a slightly different spot.
const offsetFor = (id: number) => ((id * 37) % 60) - 30;

// Floating emojis: mine rise from the bottom, the opponent's from the top.
export const FloatingReactions: React.FC = () => {
  const { reactions, myPlayerId, players } = useGame();
  if (players.length < 2) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-live="polite">
      {reactions.map(r => {
        const mine = r.playerId === myPlayerId;
        const who = mine ? "Toi" : players.find(p => p.id === r.playerId)?.name ?? "Adversaire";
        return (
          <div
            key={r.id}
            role="img"
            aria-label={`${who} : ${LABELS[r.emoji]}`}
            className={cn("reaction-float absolute left-1/2 text-5xl drop-shadow-lg select-none", mine ? "bottom-40" : "top-24")}
            style={{ "--rx": `${offsetFor(r.id)}px`, "--dir": mine ? -1 : 1 } as React.CSSProperties}
          >
            {r.emoji}
          </div>
        );
      })}
    </div>
  );
};

// Row of emoji buttons, plus a toggle to mute the opponent's reactions.
export const ReactionRow: React.FC<{ onSent?: () => void; className?: string; showMute?: boolean }> = ({
  onSent,
  className,
  showMute = true,
}) => {
  const { sendReaction, reactionsMuted, setReactionsMuted } = useGame();
  return (
    <div className={cn("flex items-center flex-wrap justify-center", className)}>
      {REACTIONS.map(emoji => (
        <button
          key={emoji}
          type="button"
          aria-label={LABELS[emoji]}
          title={LABELS[emoji]}
          onClick={() => { sendReaction(emoji); onSent?.(); }}
          className="text-2xl w-9 h-9 rounded-full hover:bg-muted active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {emoji}
        </button>
      ))}
      {showMute && <button
        type="button"
        onClick={() => setReactionsMuted(!reactionsMuted)}
        aria-pressed={reactionsMuted}
        aria-label={reactionsMuted ? "Afficher les réactions de l’adversaire" : "Masquer les réactions de l’adversaire"}
        title={reactionsMuted ? "Réactions de l’adversaire masquées" : "Masquer les réactions de l’adversaire"}
        className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
      >
        {reactionsMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>}
    </div>
  );
};

// Compact button for the in-game HUD that opens the emoji row.
export const ReactionPicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Envoyer une réaction" className="rounded-full">
          <SmilePlus className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto p-2 z-[80]">
        <ReactionRow onSent={() => setOpen(false)} className="max-w-[280px]" />
      </PopoverContent>
    </Popover>
  );
};
