import React from "react";
import type { Character } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/CharacterCard";

// The 24 cards; tapping one crosses it out (or puts it back).
// onToggle must be stable, so the cards don't all redraw on each toggle.
export const Board: React.FC<{
  characters: Character[];
  eliminatedIds: Set<string>;
  onToggle: (id: string) => void;
}> = ({ characters, eliminatedIds, onToggle }) => (
  <div className="p-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-w-6xl mx-auto w-full content-start">
    {characters.map(char => (
      <CharacterCard
        key={char.id}
        character={char}
        size="sm"
        action="eliminate"
        eliminated={eliminatedIds.has(char.id)}
        onPick={onToggle}
      />
    ))}
  </div>
);
