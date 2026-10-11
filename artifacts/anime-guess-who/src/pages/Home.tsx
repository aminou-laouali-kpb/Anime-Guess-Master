import React, { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Users, UsersRound, HelpCircle, ArrowRight, Trophy, Bot } from "lucide-react";
import type { BotLevel } from "@/lib/socket";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Home: React.FC = () => {
  const { myName, setMyName, joinQueue, joinRoom, createPrivateRoom, playVsBot, myStats } = useGame();
  const [showBot, setShowBot] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [localName, setLocalName] = useState(myName);
  const [showNameModal, setShowNameModal] = useState(!myName);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (localName.trim()) {
      setMyName(localName.trim());
      setShowNameModal(false);
    }
  };

  const handleAction = (action: () => void) => {
    if (!myName) {
      setShowNameModal(true);
    } else {
      action();
    }
  };

  const handleCreateRoom = () => {
    handleAction(createPrivateRoom);
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md flex flex-col gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary drop-shadow-sm uppercase italic tracking-tighter transform -skew-x-6">
            Anime<br />Who
          </h1>
          <p className="text-muted-foreground font-bold tracking-widest uppercase text-sm">
            Qui est-ce ? Édition anime
          </p>
        </div>

        {myName && (
          <div className="bg-card/50 backdrop-blur-md border border-card-border p-3 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Pseudo</span>
              <span className="font-display font-bold text-lg">{myName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowNameModal(true)}>
              Modifier
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button 
            size="lg" 
            className="w-full h-16 text-lg font-display font-bold hover:scale-[1.02] transition-transform" 
            onClick={() => handleAction(joinQueue)}
          >
            <Gamepad2 className="mr-2 w-6 h-6" /> Partie rapide
          </Button>

          <Button 
            variant="secondary"
            size="lg" 
            className="w-full h-14 font-bold border-2 hover:scale-[1.02] transition-transform" 
            onClick={handleCreateRoom}
          >
            <Users className="mr-2 w-5 h-5" />
            Créer une partie privée
          </Button>

          <Button 
            variant="outline"
            size="lg" 
            className="w-full h-14 font-bold border-2 hover:scale-[1.02] transition-transform" 
            onClick={() => handleAction(() => setShowJoin(true))}
          >
            <UsersRound className="mr-2 w-5 h-5" /> Rejoindre avec un code
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 font-bold border-2 hover:scale-[1.02] transition-transform"
            onClick={() => handleAction(() => setShowBot(true))}
          >
            <Bot className="mr-2 w-5 h-5" /> Contre l’ordinateur
          </Button>

          <div className={myStats?.enabled ? "grid grid-cols-2 gap-2 mt-4" : "mt-4"}>
            {myStats?.enabled && (
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setShowLeaderboard(true)}
              >
                <Trophy className="mr-2 w-5 h-5" /> Classement
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => setShowHowToPlay(true)}
            >
              <HelpCircle className="mr-2 w-5 h-5" /> Comment jouer
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showNameModal} onOpenChange={(open) => {
        // Prevent closing if no name is set yet
        if (!myName && !open) return;
        setShowNameModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Choisis ta voie du ninja</DialogTitle>
            <DialogDescription>
              Quel nom veux-tu porter dans l’arène ?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveName} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pseudo</Label>
              <Input 
                id="name" 
                autoFocus
                placeholder="ex. Uzumaki Naruto" 
                value={localName} 
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={20}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!localName.trim()}>Enregistrer et continuer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Rejoindre une partie privée</DialogTitle>
            <DialogDescription>
              Saisis le code à 6 caractères donné par ton adversaire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) joinRoom(joinCode.trim().toUpperCase());
          }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code de la partie</Label>
              <Input 
                id="code" 
                autoFocus
                placeholder="ABCDEF" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value)}
                className="uppercase font-mono text-center tracking-[0.5em] text-2xl h-14"
                maxLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={joinCode.trim().length === 0} className="w-full">
                Entrer dans l’arène <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LeaderboardDialog open={showLeaderboard} onOpenChange={setShowLeaderboard} />

      <Dialog open={showBot} onOpenChange={setShowBot}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Contre l’ordinateur</DialogTitle>
            <DialogDescription>
              Entraîne-toi seul. Ces parties ne comptent pas dans le classement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {([
              ["easy", "Facile", "Pose des questions au hasard et devine trop vite."],
              ["normal", "Normal", "Joue correctement, sans être parfait."],
              ["hard", "Difficile", "Choisit toujours la meilleure question."],
            ] as [BotLevel, string, string][]).map(([level, label, hint]) => (
              <Button
                key={level}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start text-left border-2"
                onClick={() => { setShowBot(false); playVsBot(level); }}
              >
                <span className="font-display font-bold text-lg">{label}</span>
                <span className="text-xs text-muted-foreground font-normal whitespace-normal">{hint}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Comment jouer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p><strong>1. Choix :</strong> chaque joueur choisit en secret un personnage parmi les 24 de la grille.</p>
            <p><strong>2. Déduction :</strong> à tour de rôle, posez des questions fermées (oui / non) sur le personnage secret de l’adversaire (ex. « Ton personnage a-t-il les cheveux en pétard ? »).</p>
            <p><strong>3. Élimination :</strong> selon la réponse, touche les personnages de ta grille pour les écarter. Touche-les à nouveau pour les remettre.</p>
            <p><strong>4. Victoire :</strong> quand tu penses avoir trouvé, utilise ton tour pour deviner ! Attention : une mauvaise réponse coûte une vie, et à 3 vies perdues tu as perdu. Chaque tour est chronométré : si le temps est écoulé, tu perds aussi une vie.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHowToPlay(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
