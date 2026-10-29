import React, { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import type { Character } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CharacterCard } from "@/components/CharacterCard";

// Guess the opponent's character among those still on my board.
// Two steps (pick, then confirm) so a mis-tap while scrolling doesn't cost a life.
export const GuessDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  eliminatedIds: Set<string>;
  offline: boolean;
  onGuess: (characterId: string) => void;
}> = ({ open, onOpenChange, characters, eliminatedIds, offline, onGuess }) => {
  const [guessSearch, setGuessSearch] = useState("");
  const [guessCandidate, setGuessCandidate] = useState<string | null>(null);

  // However the dialog closes (cancel, confirm, end of my turn), the pick is dropped.
  useEffect(() => {
    if (!open) setGuessCandidate(null);
  }, [open]);

  const confirmGuess = () => {
    if (!guessCandidate) return;
    onGuess(guessCandidate);
    setGuessCandidate(null);
    onOpenChange(false);
  };
  const guessCandidateChar = characters.find(c => c.id === guessCandidate);
  const guessable = characters.filter(c => !eliminatedIds.has(c.id));
  const guessResults = guessable.filter(c => c.name.toLowerCase().includes(guessSearch.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl h-[85dvh] flex flex-col p-0 overflow-hidden gap-0"
        // Don't focus the search box: on phones it opens the keyboard over the grid.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4 border-b bg-card">
          <DialogTitle className="font-display text-2xl text-red-600 flex items-center">
            <Crosshair className="w-6 h-6 mr-2" /> Qui est-ce ?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1 font-bold">
            Choisis un personnage puis confirme. Une mauvaise réponse te coûte 1 vie !
          </DialogDescription>
          <Input
            placeholder="Rechercher un personnage…"
            value={guessSearch}
            onChange={e => setGuessSearch(e.target.value)}
            className="mt-3"
            aria-label="Rechercher un personnage"
          />
        </div>
        <ScrollArea className="flex-1 p-4 bg-muted/30">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {guessResults.map(char => (
              <CharacterCard
                key={char.id}
                character={char}
                size="sm"
                selected={guessCandidate === char.id}
                className="cursor-pointer hover:border-red-500 hover:ring-2 ring-red-500/50"
                onPick={setGuessCandidate}
              />
            ))}
            {guessable.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Plus aucun personnage ! Remets-en un sur ta grille d’abord.
              </div>
            ) : guessResults.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Aucun personnage ne correspond à « {guessSearch} ».
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t bg-card flex items-center gap-2">
          <p className="flex-1 min-w-0 text-sm font-bold truncate">
            {guessCandidateChar ? `Deviner ${guessCandidateChar.name} ?` : "Choisis un personnage"}
          </p>
          <Button
            className="bg-red-600 hover:bg-red-700 font-bold shrink-0"
            disabled={!guessCandidate || offline}
            onClick={confirmGuess}
          >
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
