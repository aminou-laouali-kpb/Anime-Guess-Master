import React from "react";
import { Countdown } from "@/components/Countdown";
import { cn } from "@/lib/utils";

// Whose turn it is, with the seconds left when nobody is answering a question.
export const TurnBanner: React.FC<{
  turnText: string;
  isMyTurn: boolean;
  showCountdown: boolean;
  deadline: number | undefined;
}> = ({ turnText, isMyTurn, showCountdown, deadline }) => (
  <div className={cn(
    "py-1.5 px-4 text-center font-bold uppercase tracking-widest text-xs transition-colors shadow-sm z-30 relative",
    isMyTurn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
  )}>
    {/* Only the turn text is announced: the ticking seconds would talk non-stop. */}
    <span role="status" aria-live="polite">{turnText}</span>
    {showCountdown && (
      <Countdown deadline={deadline}>
        {(seconds, urgent) => (
          // Red text on the blue "your turn" banner would be unreadable:
          // a white pill instead. No blinking, which would fade the text.
          <span className={cn(
            "ml-2 tabular-nums",
            urgent && (isMyTurn ? "bg-white text-red-700 font-black rounded px-1.5" : "text-red-700 font-black")
          )}>
            · {seconds} s
          </span>
        )}
      </Countdown>
    )}
  </div>
);
