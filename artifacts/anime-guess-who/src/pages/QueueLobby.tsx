import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Copy, CheckCircle2, Bot } from "lucide-react";

export const QueueLobby: React.FC = () => {
  const { phase, queuePosition, roomCode, leaveGame, playVsBot } = useGame();
  const [copied, setCopied] = useState(false);

  // After a while with nobody to play against, offer to practise meanwhile.
  const [waitedSeconds, setWaitedSeconds] = useState(0);
  useEffect(() => {
    if (phase !== "queue") {
      setWaitedSeconds(0);
      return;
    }
    const id = setInterval(() => setWaitedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure page, denied permission…): don't pretend it worked.
      toast.error("Copie impossible : recopie le code à la main.");
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-background relative">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" onClick={leaveGame} className="rounded-full" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center text-center max-w-md w-full gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="w-24 h-24 animate-spin text-primary relative z-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">
            {phase === "queue" ? "Recherche d’un adversaire" : "En attente d’un adversaire"}
          </h2>
          <p className="text-muted-foreground font-medium">
            {phase === "queue" 
              ? `Position dans la file : ${queuePosition || '…'}`
              : "Envoie ce code à la personne avec qui tu veux jouer."}
          </p>
        </div>

        {phase === "queue" && waitedSeconds >= 15 && (
          <div className="w-full flex flex-col gap-2 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">Personne pour l’instant ? Entraîne-toi en attendant.</p>
            <Button variant="outline" size="lg" className="h-12 font-bold border-2" onClick={() => playVsBot("normal")}>
              <Bot className="mr-2 w-5 h-5" /> Jouer contre l’ordinateur
            </Button>
          </div>
        )}

        {phase === "lobby" && roomCode && (
          <div className="w-full flex flex-col gap-2 mt-4">
            <div className="bg-muted border border-border p-4 rounded-xl flex items-center justify-between">
              <span className="font-mono text-3xl tracking-[0.3em] font-bold w-full text-center pl-4">
                {roomCode}
              </span>
              <Button size="icon" variant="ghost" onClick={copyCode} className="shrink-0" aria-label="Copier le code">
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-700" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Code de la partie
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
