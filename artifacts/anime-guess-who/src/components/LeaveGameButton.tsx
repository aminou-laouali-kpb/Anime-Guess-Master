import React from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGame } from "@/context/GameContext";

// Lets a player quit a game in progress, with a confirmation. During play the
// server counts it as a loss (except against the computer).
export const LeaveGameButton: React.FC<{ countsAsLoss: boolean; className?: string }> = ({ countsAsLoss, className }) => {
  const { leaveGame } = useGame();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abandonner la partie" title="Abandonner" className={className}>
          <Flag className="w-5 h-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abandonner la partie ?</AlertDialogTitle>
          <AlertDialogDescription>
            {countsAsLoss
              ? "Ton adversaire gagnera la partie et elle comptera comme une défaite dans tes statistiques."
              : "Tu reviendras à l’accueil et ton adversaire sera prévenu."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer à jouer</AlertDialogCancel>
          <AlertDialogAction onClick={leaveGame} className="bg-red-600 hover:bg-red-700">
            Abandonner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
