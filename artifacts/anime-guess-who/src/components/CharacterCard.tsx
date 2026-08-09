import React from "react";
import { Character } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { User, Skull, Star, Shield, Zap, Sparkles } from "lucide-react";

interface CharacterCardProps {
  character: Character;
  selected?: boolean;
  eliminated?: boolean;
  onClick?: () => void;
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

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  selected = false,
  eliminated = false,
  onClick,
  className,
  size = "md"
}) => {
  const alignmentClass = alignmentColors[character.alignment?.toLowerCase()] || alignmentColors.neutral;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl border-2 overflow-hidden bg-card text-card-foreground select-none",
        onClick && "cursor-pointer anime-card-hover",
        selected && "border-primary ring-4 ring-primary/20",
        !selected && "border-card-border",
        eliminated && "eliminated-card",
        className
      )}
    >
      {eliminated && (
        <div className="eliminated-overlay font-display text-6xl tracking-tighter">
          X
        </div>
      )}
      
      {/* Top Banner (Anime Name) */}
      <div className={cn(
        "w-full px-2 py-1 text-xs font-bold text-center truncate border-b-2 bg-muted/50 border-card-border uppercase tracking-wider",
        size === "sm" ? "text-[10px] py-0.5" : ""
      )}>
        {character.anime}
      </div>

      <div className={cn("p-3 flex flex-col gap-2", size === "sm" && "p-2 gap-1")}>
        {/* Name & Role */}
        <div className="flex flex-col">
          <h3 className={cn("font-display font-bold leading-tight", size === "sm" ? "text-sm" : "text-lg")}>
            {character.name}
          </h3>
          <span className={cn("text-muted-foreground font-semibold uppercase tracking-wider", size === "sm" ? "text-[8px]" : "text-[10px]")}>
            {character.role} Role
          </span>
        </div>

        {/* Traits Grid */}
        <div className={cn("grid grid-cols-2 gap-1", size === "sm" && "text-[10px]")}>
          <div className="flex flex-col bg-muted/30 rounded p-1">
            <span className="text-[9px] uppercase text-muted-foreground font-bold">Hair</span>
            <span className="font-semibold text-xs capitalize truncate">{character.hairColor}</span>
          </div>
          <div className="flex flex-col bg-muted/30 rounded p-1">
            <span className="text-[9px] uppercase text-muted-foreground font-bold">Eyes</span>
            <span className="font-semibold text-xs capitalize truncate">{character.eyeColor}</span>
          </div>
          <div className="flex flex-col bg-muted/30 rounded p-1 col-span-2">
            <span className="text-[9px] uppercase text-muted-foreground font-bold">Species & Gender</span>
            <span className="font-semibold text-xs capitalize truncate">{character.species} • {character.gender}</span>
          </div>
        </div>

        {/* Alignment Badge */}
        <div className={cn(
          "mt-auto flex items-center justify-center gap-1 py-1 rounded-md text-xs font-bold uppercase",
          alignmentClass,
          size === "sm" && "text-[10px] py-0.5"
        )}>
          {getAlignmentIcon(character.alignment)}
          {character.alignment}
        </div>
      </div>
    </div>
  );
};
