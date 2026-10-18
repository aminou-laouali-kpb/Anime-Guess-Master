import React, { type ReactNode } from "react";
import { useSecondsLeft } from "@/hooks/use-seconds-left";

// A live countdown. The ticking state lives here, so only this small
// component re-renders four times a second, not the whole screen (24 cards,
// the log, the dialogs…).
export const Countdown: React.FC<{
  deadline: number | null | undefined;
  children: (seconds: number, urgent: boolean) => ReactNode;
}> = ({ deadline, children }) => {
  const seconds = useSecondsLeft(deadline);
  if (seconds === null) return null;
  return <>{children(seconds, seconds <= 10)}</>;
};
