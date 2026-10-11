import React from "react";
import { Character } from "@workspace/api-client-react";
import { ShieldCheck, MessageCircleQuestion } from "lucide-react";
import { GameLogEntry } from "@/lib/socket";
import { questionText } from "@/lib/questions";

interface LogEntryViewProps {
  log: GameLogEntry;
  myPlayerId: string | null;
  opponentName: string | undefined;
  characters: Character[];
}

export const LogEntryView: React.FC<LogEntryViewProps> = ({ log, myPlayerId, opponentName, characters }) => {
  if (log.type === "qna") {
    const askerName = log.askerId === myPlayerId ? "Toi" : opponentName;
    const text = log.verified && log.attribute && log.value
      ? questionText(log.attribute, log.value)
      : log.question;
    return (
      <div className="bg-muted/50 p-3 rounded-lg text-sm border border-border">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-primary">{askerName} :</span>
          {log.verified ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-600">
              <ShieldCheck className="w-3 h-3" /> Vérifiée
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
              <MessageCircleQuestion className="w-3 h-3" /> Non vérifiée
            </span>
          )}
        </div>
        <p className="italic mb-2">« {text} »</p>
        <div className="flex items-center gap-2 font-black uppercase">
          Réponse :
          <span className={log.answer === "yes" ? "text-green-500" : "text-red-500"}>
            {log.answer === "yes" ? "oui" : "non"}
          </span>
        </div>
      </div>
    );
  }

  if (log.type === "guess") {
    const guesserName = log.guesserId === myPlayerId ? "Toi" : opponentName;
    const guessedChar = characters.find(c => c.id === log.guessedCharacterId);
    return (
      <div className="bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/30">
        <div className="font-bold text-red-500 mb-1">{guesserName} a tenté :</div>
        <p className="font-bold">{guessedChar?.name}</p>
        <div className="text-red-600 font-black uppercase mt-1">Raté ! Une vie en moins.</div>
      </div>
    );
  }

  const name = log.playerId === myPlayerId ? "Toi" : opponentName;
  return (
    <div className="bg-amber-500/10 p-3 rounded-lg text-sm border border-amber-500/30">
      <div className="font-bold text-amber-600">{name} : temps écoulé — une vie en moins.</div>
    </div>
  );
};
