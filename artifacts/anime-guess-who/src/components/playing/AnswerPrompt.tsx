import React from "react";
import { Check, X } from "lucide-react";
import type { Character } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Countdown } from "@/components/Countdown";
import { cn } from "@/lib/utils";

// The opponent asked me a free question: answer yes or no (can't be dismissed).
export const AnswerPrompt: React.FC<{
  question: string | null;
  deadline: number | undefined;
  myCharacter: Character | undefined;
  offline: boolean;
  onAnswer: (answer: "yes" | "no") => void;
}> = ({ question, deadline, myCharacter, offline, onAnswer }) => (
  <Dialog open={!!question} onOpenChange={() => {}}>
    <DialogContent className="sm:max-w-md [&>button]:hidden pointer-events-none">
      <DialogHeader className="text-center">
        <DialogTitle className="font-display text-2xl uppercase text-secondary">Question reçue !</DialogTitle>
        <DialogDescription className="text-lg font-bold text-foreground mt-4">
          « {question} »
        </DialogDescription>
        <Countdown deadline={deadline}>
          {(seconds, urgent) => (
            <p className={cn("text-sm font-bold mt-2 tabular-nums", urgent ? "text-red-600" : "text-muted-foreground")}>
              Réponds dans les {seconds} s ou tu perds une vie
            </p>
          )}
        </Countdown>
        {myCharacter && (
          <p className="text-sm font-bold mt-2">
            Ton personnage : <span className="text-primary">{myCharacter.name}</span>
            <span className="text-muted-foreground font-normal"> ({myCharacter.anime})</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Réponds honnêtement : ton personnage et toutes tes réponses seront révélés à la fin.
        </p>
      </DialogHeader>
      <div className="flex gap-4 mt-6 pointer-events-auto">
        <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-xl font-bold" disabled={offline} onClick={() => onAnswer("yes")}>
          <Check className="w-6 h-6 mr-2" /> OUI
        </Button>
        <Button className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-xl font-bold" disabled={offline} onClick={() => onAnswer("no")}>
          <X className="w-6 h-6 mr-2" /> NON
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
