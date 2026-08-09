import React, { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Users, UsersRound, HelpCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Home: React.FC = () => {
  const { myName, setMyName, joinQueue, joinRoom, createPrivateRoom } = useGame();

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
            Guess Who? Anime Edition
          </p>
        </div>

        {myName && (
          <div className="bg-card/50 backdrop-blur-md border border-card-border p-3 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Player Name</span>
              <span className="font-display font-bold text-lg">{myName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowNameModal(true)}>
              Edit
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button 
            size="lg" 
            className="w-full h-16 text-lg font-display font-bold hover:scale-[1.02] transition-transform" 
            onClick={() => handleAction(joinQueue)}
          >
            <Gamepad2 className="mr-2 w-6 h-6" /> Quick Play
          </Button>

          <Button 
            variant="secondary"
            size="lg" 
            className="w-full h-14 font-bold border-2 hover:scale-[1.02] transition-transform" 
            onClick={handleCreateRoom}
          >
            <Users className="mr-2 w-5 h-5" />
            Create Private Game
          </Button>

          <Button 
            variant="outline"
            size="lg" 
            className="w-full h-14 font-bold border-2 hover:scale-[1.02] transition-transform" 
            onClick={() => handleAction(() => setShowJoin(true))}
          >
            <UsersRound className="mr-2 w-5 h-5" /> Join via Code
          </Button>

          <Button 
            variant="ghost" 
            size="lg"
            className="w-full mt-4 text-muted-foreground hover:text-foreground"
            onClick={() => setShowHowToPlay(true)}
          >
            <HelpCircle className="mr-2 w-5 h-5" /> How to Play
          </Button>
        </div>
      </div>

      <Dialog open={showNameModal} onOpenChange={(open) => {
        // Prevent closing if no name is set yet
        if (!myName && !open) return;
        setShowNameModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Enter your Ninja Way</DialogTitle>
            <DialogDescription>
              What should we call you in the arena?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveName} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Player Name</Label>
              <Input 
                id="name" 
                autoFocus
                placeholder="e.g. Uzumaki Naruto" 
                value={localName} 
                onChange={(e) => setLocalName(e.target.value)}
                maxLength={20}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!localName.trim()}>Save & Continue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Join Private Game</DialogTitle>
            <DialogDescription>
              Enter the 6-character room code from your opponent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) joinRoom(joinCode.trim().toUpperCase());
          }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="code">Room Code</Label>
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
                Join Arena <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">How to Play</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p><strong>1. Selection:</strong> Both players secretly pick one anime character from the grid.</p>
            <p><strong>2. Deduction:</strong> Take turns asking yes/no questions about your opponent's secret character (e.g. "Does your character have spiky hair?").</p>
            <p><strong>3. Elimination:</strong> Based on their answer, tap characters on your grid to eliminate them from your suspects.</p>
            <p><strong>4. Victory:</strong> If you think you know who it is, use your turn to Make a Guess! But be careful—a wrong guess costs you a life, and 3 wrong guesses means you lose.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHowToPlay(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
