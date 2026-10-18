import React from "react";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/context/GameContext";

// Tells the player when the link to the server is down, instead of letting
// taps silently go nowhere.
export const ConnectionStatus: React.FC = () => {
  const { isConnected, hasConnectedOnce, connectionReplaced } = useGame();

  // The server closed this connection (the game was opened in another tab, or
  // the server cut us off): socket.io doesn't reconnect by itself in that case.
  if (connectionReplaced) {
    return (
      <div role="alertdialog" aria-modal="true" aria-labelledby="conn-title" className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-card border-2 border-border rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <WifiOff className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden />
          <h2 id="conn-title" className="font-display text-2xl font-black">Connexion interrompue</h2>
          <p className="text-sm text-muted-foreground">
            Cette partie est peut-être ouverte dans un autre onglet. Recharge la page pour reprendre ici.
          </p>
          <Button className="w-full h-12 font-bold" onClick={() => window.location.reload()}>
            Recharger
          </Button>
        </div>
      </div>
    );
  }

  if (isConnected || !hasConnectedOnce) return null;

  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[80] bg-amber-100 text-amber-950 border-b-2 border-amber-300 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      Connexion perdue : reconnexion en cours…
    </div>
  );
};
