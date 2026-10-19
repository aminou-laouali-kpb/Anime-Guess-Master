import React, { useState } from "react";
import { Character } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { fr } from "@/lib/fr";
import { User, Skull, Star, Shield } from "lucide-react";

interface CharacterCardProps {
  character: Character;
  selected?: boolean;
  eliminated?: boolean;
  onClick?: () => void;
  // Same as onClick but receives the character's id, so the parent can pass
  // ONE stable function to all 24 cards (and the memoized cards don't redraw).
  onPick?: (id: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const alignmentColors: Record<string, string> = {
  hero: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900",
  villain: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900",
  antihero: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900",
  neutral: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
};

const getAlignmentIcon = (alignment: string) => {
  switch (alignment.toLowerCase()) {
    case "hero": return <Shield className="w-3 h-3" />;
    case "villain": return <Skull className="w-3 h-3" />;
    case "antihero": return <Star className="w-3 h-3" />;
    default: return <User className="w-3 h-3" />;
  }
};

// Stable color per character for the no-image fallback.
function hueFor(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export const Portrait: React.FC<{ character: Character; size: "sm" | "md" | "lg" }> = ({ character, size }) => {
  const [failed, setFailed] = useState(false);
  const hue = hueFor(character.id);

  if (character.imageUrl && !failed) {
    return (
      <img
        src={character.imageUrl}
        alt=""
        // Eager: the 24 cards of a board are on screen (or one scroll away)
        // as soon as it's dealt, and lazy loading waited for layout first.
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center pb-[35%] font-display font-black text-white/90"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 35%))` }}
    >
      <span className={size === "sm" ? "text-3xl" : "text-5xl"}>{initials(character.name)}</span>
    </div>
  );
};

const CharacterCardView: React.FC<CharacterCardProps> = ({
  character,
  selected = false,
  eliminated = false,
  onClick,
  onPick,
  className,
  size = "md"
}) => {
  const interactive = Boolean(onClick || onPick);
  const handleClick = () => {
    onClick?.();
    onPick?.(character.id);
  };
  const alignmentClass = alignmentColors[character.alignment?.toLowerCase()] || alignmentColors.neutral;
  const compact = size === "sm";

  const content = (
    <>
      <div className="relative w-full aspect-[3/4] bg-muted overflow-hidden">
        <Portrait character={character} size={size} />
        {/* Name over the picture, like the board game */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 pt-6 pb-1.5 text-left">
          <h3 className={cn("font-display font-bold leading-tight text-white drop-shadow", compact ? "text-xs" : "text-base")}>
            {character.name}
          </h3>
          <p className={cn("text-white/75 font-semibold uppercase tracking-wider truncate", compact ? "text-[10px]" : "text-[11px]")}>
            {character.anime}
          </p>
        </div>
        {eliminated && (
          <div className="eliminated-overlay font-display text-6xl tracking-tighter" aria-hidden>
            X
          </div>
        )}
      </div>

      {!compact && (
        <div className="p-2 flex flex-col gap-1.5 text-left">
          <div className="grid grid-cols-2 gap-1">
            <div className="flex flex-col bg-muted/30 rounded p-1">
              <span className="text-[11px] uppercase text-muted-foreground font-bold">Cheveux</span>
              <span className="font-semibold text-xs capitalize truncate">{fr.hair(character.hairColor)}</span>
            </div>
            <div className="flex flex-col bg-muted/30 rounded p-1">
              <span className="text-[11px] uppercase text-muted-foreground font-bold">Yeux</span>
              <span className="font-semibold text-xs capitalize truncate">{fr.eyes(character.eyeColor)}</span>
            </div>
          </div>
          <div className="text-xs font-semibold capitalize text-muted-foreground truncate">
            {fr.species(character.species)} • {fr.gender(character.gender)} • rôle {fr.role(character.role)}
          </div>
          <div className={cn("flex items-center justify-center gap-1 py-0.5 rounded-md text-xs font-bold uppercase", alignmentClass)}>
            {getAlignmentIcon(character.alignment)}
            {fr.alignment(character.alignment)}
          </div>
        </div>
      )}
    </>
  );

  const classes = cn(
    "relative block w-full rounded-xl border-2 overflow-hidden bg-card text-card-foreground select-none",
    interactive && "cursor-pointer anime-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50",
    selected && "border-primary ring-4 ring-primary/20",
    !selected && "border-card-border",
    eliminated && "eliminated-card",
    className
  );

  if (!interactive) return <div className={classes}>{content}</div>;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classes}
      aria-label={`${character.name} (${character.anime})${eliminated ? ", éliminé" : ""}`}
      aria-pressed={selected || eliminated}
    >
      {content}
    </button>
  );
};

// Redraw a card only when its own data changes.
export const CharacterCard = React.memo(CharacterCardView);
