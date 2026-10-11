import React, { useState } from "react";
import { Character } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CharacterCard, Portrait } from "@/components/CharacterCard";
import { cn } from "@/lib/utils";

// Small reminder of my own secret character; tap to see the full card.
export const MyCharacterChip: React.FC<{ character: Character | undefined; className?: string }> = ({ character, className }) => {
  const [open, setOpen] = useState(false);
  if (!character) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ton personnage secret : ${character.name}. Voir sa fiche`}
        className={cn(
          "relative shrink-0 w-10 h-[52px] rounded-lg overflow-hidden border-2 border-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        <Portrait character={character} size="sm" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Ton personnage secret</DialogTitle>
            <DialogDescription>C’est lui que ton adversaire doit deviner.</DialogDescription>
          </DialogHeader>
          <div className="mx-auto w-full max-w-[220px]">
            <CharacterCard character={character} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
