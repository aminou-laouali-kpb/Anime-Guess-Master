import React, { useId, useRef, useState } from "react";
import type { Character } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ATTRIBUTES, VerifiableAttribute, hasTrait, questionText, valueLabel, valuesOnBoard } from "@/lib/questions";

const ASK_MODES = ["verified", "free"] as const;

// Ask a verified question (a trait and a value, answered by the game) or a
// free one (answered by the opponent). What was picked or typed survives
// closing the dialog.
export const AskDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  // Cards I have crossed out: the counts next to each answer only cover the rest.
  eliminatedIds: Set<string>;
  // The computer only understands verified questions.
  vsBot: boolean;
  offline: boolean;
  onAskVerified: (attribute: VerifiableAttribute, value: string) => void;
  onAskFree: (question: string) => void;
}> = ({ open, onOpenChange, characters, eliminatedIds, vsBot, offline, onAskVerified, onAskFree }) => {
  const [askMode, setAskMode] = useState<"verified" | "free">("verified");
  const [freeQuestion, setFreeQuestion] = useState("");
  const [askAttribute, setAskAttribute] = useState<VerifiableAttribute>("hairColor");
  const [askValue, setAskValue] = useState<string | null>(null);

  // Question type tabs: arrow keys move between them (WAI-ARIA tabs pattern).
  const tabsId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const index = ASK_MODES.indexOf(askMode);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % ASK_MODES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + ASK_MODES.length) % ASK_MODES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ASK_MODES.length - 1;
    if (next === null) return;
    e.preventDefault();
    setAskMode(ASK_MODES[next]);
    tabRefs.current[ASK_MODES[next]]?.focus();
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (askMode === "verified" || vsBot) {
      if (!askValue) return;
      onAskVerified(askAttribute, askValue);
      setAskValue(null);
      onOpenChange(false);
    } else if (freeQuestion.trim()) {
      onAskFree(freeQuestion.trim());
      setFreeQuestion("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Poser une question</DialogTitle>
          <DialogDescription>
            {askMode === "verified"
              ? "Le jeu répond à ta place à partir de la fiche du personnage : impossible de mentir."
              : "C’est ton adversaire qui répond : sa réponse pourra être vérifiée à la fin de la partie."}
          </DialogDescription>
        </DialogHeader>

        {!vsBot && <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg" role="tablist" aria-label="Type de question">
          {ASK_MODES.map(mode => (
            <button
              key={mode}
              ref={el => { tabRefs.current[mode] = el; }}
              id={`${tabsId}-tab-${mode}`}
              type="button"
              role="tab"
              aria-selected={askMode === mode}
              aria-controls={`${tabsId}-panel`}
              // Roving focus: Tab reaches the selected tab, the arrows the other.
              tabIndex={askMode === mode ? 0 : -1}
              onClick={() => setAskMode(mode)}
              onKeyDown={onTabKeyDown}
              className={cn(
                "py-2 rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                askMode === mode ? "bg-background shadow-sm" : "text-foreground/70"
              )}
            >
              {mode === "verified" ? "Question vérifiée" : "Question libre"}
            </button>
          ))}
        </div>}

        <form onSubmit={handleAsk} className="space-y-4 mt-2">
          <div
            {...(vsBot ? {} : { role: "tabpanel", id: `${tabsId}-panel`, "aria-labelledby": `${tabsId}-tab-${askMode}` })}
            className="space-y-4"
          >
          {askMode === "verified" || vsBot ? (
            <>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Caractéristique">
                {ATTRIBUTES.map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={askAttribute === key ? "default" : "outline"}
                    aria-pressed={askAttribute === key}
                    onClick={() => { setAskAttribute(key); setAskValue(null); }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {/* The count is how many of MY remaining cards have this trait:
                  it shows at a glance which question splits the board best. */}
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Réponse à tester</p>
              <div className="flex flex-wrap gap-1.5 -mt-2" role="group" aria-label="Réponse possible">
                {valuesOnBoard(characters, askAttribute).map(value => {
                  const count = characters.filter(c => !eliminatedIds.has(c.id) && hasTrait(c, askAttribute, value)).length;
                  return (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={askValue === value ? "secondary" : "outline"}
                      aria-pressed={askValue === value}
                      className={cn(askValue === value && "ring-2 ring-secondary/40", count === 0 && askValue !== value && "opacity-60")}
                      onClick={() => setAskValue(value)}
                    >
                      {valueLabel(askAttribute, value)}
                      <span className="ml-1 tabular-nums opacity-70">({count})</span>
                    </Button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">Entre parenthèses : combien de tes personnages restants ont ce trait.</p>
              <p className="min-h-6 text-center font-bold italic" aria-live="polite">
                {askValue ? `« ${questionText(askAttribute, askValue)} »` : "Choisis une réponse possible ci-dessus."}
              </p>
            </>
          ) : (
            <Input
              autoFocus
              placeholder="ex. Ton personnage se bat-il avec une épée ?"
              aria-label="Ta question"
              value={freeQuestion}
              onChange={e => setFreeQuestion(e.target.value)}
              maxLength={200}
              className="h-12"
            />
          )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={offline || (askMode === "verified" || vsBot ? !askValue : !freeQuestion.trim())}
              className="w-full h-12 text-lg font-bold"
            >
              Envoyer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
