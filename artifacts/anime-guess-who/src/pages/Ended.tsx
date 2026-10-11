import React from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/CharacterCard";
import { LogEntryView } from "@/components/LogEntryView";
import { Home, RotateCcw, Trophy, Skull } from "lucide-react";

export const Ended: React.FC = () => {
  const { 
    winnerId, 
    gameOverReason, 
    revealedOpponentCharacterId, 
    characters,
    rematchRequestedBy,
    myPlayerId,
    opponentLeft,
    gameLog,
    players,
    ratingUpdate,
    requestRematch,
    acceptRematch,
    leaveGame
  } = useGame();

  const isWinner = winnerId === myPlayerId;
  const isDisconnect = gameOverReason === "opponent_left";

  const opponentCharacter = characters.find(c => c.id === revealedOpponentCharacterId);
  const opponentName = players.find(p => p.id !== myPlayerId)?.name;
  const hasFreeAnswersFromOpponent = gameLog.some(
    log => log.type === "qna" && !log.verified && log.askerId === myPlayerId
  );

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
            {isDisconnect ? "Abandon" : (isWinner ? "Victoire !" : "Défaite")}
          </h1>
          <p className="text-xl font-bold uppercase tracking-widest text-muted-foreground">
            {gameOverReason === "out_of_lives" && !isWinner && "Tu n’as plus de vies !"}
            {gameOverReason === "out_of_lives" && isWinner && "L’adversaire n’a plus de vies !"}
            {gameOverReason === "correct_guess" && isWinner && "Bien deviné !"}
            {gameOverReason === "correct_guess" && !isWinner && "L’adversaire a deviné ton personnage !"}
          </p>
        </div>

        {/* Rating change (stats enabled only) */}
        {ratingUpdate && (
          <div className="bg-card/70 border border-card-border rounded-xl px-4 py-2 text-sm font-bold">
            {ratingUpdate.ranked ? (
              <>
                Score : <span className="font-display text-lg tabular-nums">{ratingUpdate.rating}</span>{" "}
                <span className={ratingUpdate.delta >= 0 ? "text-green-600" : "text-red-500"}>
                  ({ratingUpdate.delta >= 0 ? "+" : ""}{ratingUpdate.delta})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Partie non classée — comptée dans tes statistiques</span>
            )}
          </div>
        )}

        {/* Reveal */}
        {!isDisconnect && opponentCharacter && (
          <div className="flex flex-col items-center gap-4 w-full">
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Son personnage secret :
            </span>
            <div className="w-full max-w-[250px] transform hover:scale-105 transition-transform duration-500">
              <CharacterCard character={opponentCharacter} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col w-full gap-3 mt-4">
          {opponentLeft && !isDisconnect && (
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Ton adversaire a quitté la partie.
            </p>
          )}
          {!isDisconnect && !opponentLeft && (
            <>
              {rematchRequestedBy === myPlayerId ? (
                <Button size="lg" disabled className="w-full h-14 text-lg bg-secondary/50 font-bold">
                  En attente de l’adversaire…
                </Button>
              ) : rematchRequestedBy ? (
                <Button size="lg" className="w-full h-14 text-lg bg-secondary hover:bg-secondary/80 font-bold animate-pulse" onClick={acceptRematch}>
                  <RotateCcw className="w-5 h-5 mr-2" /> Accepter la revanche
                </Button>
              ) : (
                <Button size="lg" className="w-full h-14 text-lg bg-primary hover:bg-primary/90 font-bold" onClick={requestRematch}>
                  <RotateCcw className="w-5 h-5 mr-2" /> Revanche
                </Button>
              )}
            </>
          )}
          
          <Button variant="outline" size="lg" className="w-full h-14 text-lg font-bold border-2" onClick={leaveGame}>
            <Home className="w-5 h-5 mr-2" /> Retour à l’accueil
          </Button>
        </div>

        {/* Recap: with the secret character revealed, every free answer can be checked */}
        {gameLog.length > 0 && (
          <section className="w-full text-left space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center">
              Récapitulatif de la partie
            </h2>
            {hasFreeAnswersFromOpponent && opponentCharacter && (
              <p className="text-xs text-muted-foreground text-center">
                Compare les réponses « non vérifiées » de ton adversaire avec la fiche de {opponentCharacter.name} ci-dessus.
              </p>
            )}
            <div className="space-y-2">
              {gameLog.map(log => (
                <LogEntryView
                  key={log.id}
                  log={log}
                  myPlayerId={myPlayerId}
                  opponentName={opponentName}
                  characters={characters}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
