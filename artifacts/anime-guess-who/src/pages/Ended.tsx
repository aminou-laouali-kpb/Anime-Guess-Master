import React from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/CharacterCard";
import { Home, RotateCcw, Trophy, Skull } from "lucide-react";
import { socket } from "@/lib/socket";

export const Ended: React.FC = () => {
  const { 
    winnerId, 
    gameOverReason, 
    revealedOpponentCharacterId, 
    characters,
    rematchRequestedBy,
    requestRematch,
    acceptRematch,
    leaveGame
  } = useGame();

  const isWinner = winnerId === socket.id;
  const isDisconnect = gameOverReason === "opponent_left";

  const opponentCharacter = characters.find(c => c.id === revealedOpponentCharacterId);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      
      {/* Background Effect */}
      <div className={`absolute inset-0 opacity-10 ${isWinner ? 'bg-green-500' : 'bg-red-500'}`} />
      
      <div className="z-10 w-full max-w-lg flex flex-col items-center text-center gap-8">
        
        {/* Banner */}
        <div className="space-y-4">
          <div className={`inline-flex p-4 rounded-full ${isWinner ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            {isWinner ? <Trophy className="w-16 h-16" /> : <Skull className="w-16 h-16" />}
          </div>
          <h1 className={`text-6xl md:text-8xl font-display font-black uppercase tracking-tighter transform ${isWinner ? '-skew-x-6 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-red-500'}`}>
            {isDisconnect ? "Opponent Fled" : (isWinner ? "Victory!" : "Defeat")}
          </h1>
          <p className="text-xl font-bold uppercase tracking-widest text-muted-foreground">
            {gameOverReason === "out_of_lives" && !isWinner && "You ran out of lives!"}
            {gameOverReason === "out_of_lives" && isWinner && "Opponent ran out of lives!"}
            {gameOverReason === "correct_guess" && isWinner && "You guessed correctly!"}
            {gameOverReason === "correct_guess" && !isWinner && "Opponent guessed your character!"}
          </p>
        </div>

        {/* Reveal */}
        {!isDisconnect && opponentCharacter && (
          <div className="flex flex-col items-center gap-4 w-full">
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              They were hiding:
            </span>
            <div className="w-full max-w-[250px] transform hover:scale-105 transition-transform duration-500">
              <CharacterCard character={opponentCharacter} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col w-full gap-3 mt-4">
          {!isDisconnect && (
            <>
              {rematchRequestedBy === socket.id ? (
                <Button size="lg" disabled className="w-full h-14 text-lg bg-secondary/50 font-bold">
                  Waiting for opponent...
                </Button>
              ) : rematchRequestedBy ? (
                <Button size="lg" className="w-full h-14 text-lg bg-secondary hover:bg-secondary/80 font-bold animate-pulse" onClick={acceptRematch}>
                  <RotateCcw className="w-5 h-5 mr-2" /> Accept Rematch
                </Button>
              ) : (
                <Button size="lg" className="w-full h-14 text-lg bg-primary hover:bg-primary/90 font-bold" onClick={requestRematch}>
                  <RotateCcw className="w-5 h-5 mr-2" /> Rematch
                </Button>
              )}
            </>
          )}
          
          <Button variant="outline" size="lg" className="w-full h-14 text-lg font-bold border-2" onClick={leaveGame}>
            <Home className="w-5 h-5 mr-2" /> Back to Lobby
          </Button>
        </div>

      </div>
    </div>
  );
};
