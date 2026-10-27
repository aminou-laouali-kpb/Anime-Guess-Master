import React, { Suspense, lazy, useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { APP_NAME, usePageHeading } from "@/components/PageHeading";
import { RULES_SEEN_KEY, hasSeen, markSeen } from "@/components/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Users, UsersRound, HelpCircle, ArrowRight, Trophy, Bot } from "lucide-react";
import type { BotLevel } from "@/lib/socket";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// The leaderboard (and the data library it needs) loads when first opened.
const LeaderboardDialog = lazy(() =>
  import("@/components/LeaderboardDialog").then((m) => ({ default: m.LeaderboardDialog })),
);

// Room codes are 6 letters or digits. Players may also paste a whole invite
// link into the box: keep only the code.
function normalizeCode(input: string): string {
  const fromLink = input.match(/[?&]code=([A-Za-z0-9]+)/)?.[1];
  return (fromLink ?? input).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
}

function codeFromUrl(): string {
  const code = new URLSearchParams(window.location.search).get("code");
  return code ? normalizeCode(code) : "";
}

export const Home: React.FC = () => {
  const { myName, setMyName, joinQueue, joinRoom, createPrivateRoom, playVsBot, myStats } = useGame();
  const [showBot, setShowBot] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);

  // Opened from an invite link (?code=ABC234): the join dialog comes up with
  // the code filled in, right away or once the player has picked a name.
  const [invitedCode] = useState(() => codeFromUrl());
  const [showJoin, setShowJoin] = useState(Boolean(invitedCode && myName));
  const [joinCode, setJoinCode] = useState(invitedCode);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  useEffect(() => {
    if (invitedCode) window.history.replaceState(null, "", window.location.pathname);
  }, [invitedCode]);

  const [localName, setLocalName] = useState(myName);
  const [showNameModal, setShowNameModal] = useState(!myName);

  // The name dialog, when it opens with the page, takes the focus itself.
  const headingRef = usePageHeading(`${APP_NAME} — Qui est-ce ? version anime`, Boolean(myName));

  // A first-time player gets the rules once, right after choosing a name.
  useEffect(() => {
    if (!myName || showNameModal || hasSeen(RULES_SEEN_KEY)) return;
    markSeen(RULES_SEEN_KEY);
    setShowHowToPlay(true);
  }, [myName, showNameModal]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (localName.trim()) {
      setMyName(localName.trim());
      setShowNameModal(false);
      if (invitedCode && !myName) setShowJoin(true);
    }
  };

  // The name dialog opens by itself while there is no name and can't be
  // closed, so in practice the name is always set by the time a button is used.
  const handleAction = (action: () => void) => {
    if (!myName) {
      setShowNameModal(true);
    } else {
      action();
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md flex flex-col gap-8">
        <div className="text-center space-y-2">
          <h1
            ref={headingRef}
            tabIndex={-1}
            aria-label="AnimeWho"
            className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary drop-shadow-sm uppercase italic tracking-tighter transform -skew-x-6 focus:outline-none"
          >
            Anime<br />Who
          </h1>
          <p className="text-muted-foreground font-bold tracking-widest uppercase text-sm">
            Qui est-ce ? Édition anime
          </p>
        </div>

        {myName && (
          <div className="bg-card/50 backdrop-blur-md border border-card-border p-3 rounded-xl flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Pseudo</span>
              <span className="font-display font-bold text-lg truncate">{myName}</span>
              {myStats?.stats && (
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  Score {myStats.stats.rating} · {myStats.stats.wins} V / {myStats.stats.losses} D
                  {myStats.stats.rank ? ` · ${myStats.stats.rank}ᵉ` : ""}
                </span>
              )}
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
            onClick={() => handleAction(createPrivateRoom)}
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
                onClick={() => { setLeaderboardLoaded(true); setShowLeaderboard(true); }}
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
              Quel nom veux-tu porter dans l’arène ?
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
            if (joinCode.length === 6) joinRoom(joinCode);
          }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code de la partie</Label>
              <Input
                id="code"
                autoFocus
                placeholder="ABCDEF"
                value={joinCode}
                onChange={(e) => setJoinCode(normalizeCode(e.target.value))}
                className="uppercase font-mono text-center tracking-[0.5em] text-2xl h-14"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={joinCode.length !== 6} className="w-full">
                Entrer dans l’arène <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {leaderboardLoaded && (
        <Suspense fallback={null}>
          <LeaderboardDialog open={showLeaderboard} onOpenChange={setShowLeaderboard} />
        </Suspense>
      )}

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
            <p><strong>1. Choix :</strong> chaque joueur choisit en secret un personnage parmi les 24 de la grille (90 s).</p>
            <p><strong>2. Questions :</strong> à ton tour (60 s), pose une question fermée sur le personnage de l’adversaire. Une <em>question vérifiée</em> (cheveux, yeux, anime…) reçoit sa réponse directement du jeu : impossible de mentir. Une <em>question libre</em> (« Se bat-il avec une épée ? ») est posée à ton adversaire, et ses réponses sont révélées à la fin.</p>
            <p><strong>3. Élimination :</strong> touche les personnages de ta grille pour les écarter, touche-les à nouveau pour les remettre. Après une question vérifiée, le bouton « Les écarter » le fait pour toi.</p>
            <p><strong>4. Victoire :</strong> quand tu penses avoir trouvé, utilise ton tour pour deviner. Une mauvaise réponse ou un temps écoulé coûte une vie ; à 3 vies perdues, la partie est perdue. <em>Dernière chance</em> : si le joueur qui a commencé trouve le premier, son adversaire a droit à une dernière devinette (sans question). S’il trouve aussi, c’est l’égalité.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHowToPlay(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
