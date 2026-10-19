import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Countdown } from "@/components/Countdown";

// I asked a free question and wait for the answer.
// A real modal that can't be dismissed: the focus stays inside and the
// page behind is hidden from screen readers until the answer comes.
export const AwaitingAnswer: React.FC<{
  question: string | null;
  deadline: number | undefined;
  // Where the focus goes back when the answer arrives.
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}> = ({ question, deadline, headingRef }) => (
  <AlertDialogPrimitive.Root open={!!question} onOpenChange={() => {}}>
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm animate-in fade-in" />
      <AlertDialogPrimitive.Content
        onEscapeKeyDown={(e) => e.preventDefault()}
        // The button that opened the question is gone by now: back to the heading.
        onCloseAutoFocus={(e) => { e.preventDefault(); headingRef.current?.focus({ preventScroll: true }); }}
        className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-3rem)] max-w-md bg-card border-2 border-primary p-6 rounded-2xl text-center space-y-4 shadow-2xl focus:outline-none animate-in fade-in"
      >
        <AlertDialogPrimitive.Title className="font-display text-xl font-bold text-primary uppercase">
          En attente de la réponse…
        </AlertDialogPrimitive.Title>
        <AlertDialogPrimitive.Description className="text-lg font-medium">
          « {question} »
        </AlertDialogPrimitive.Description>
        <Countdown deadline={deadline}>
          {(seconds) => (
            <p className="text-sm text-muted-foreground font-bold tabular-nums">
              L’adversaire a {seconds} s pour répondre
            </p>
          )}
        </Countdown>
        <div className="flex justify-center mt-4" aria-hidden>
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  </AlertDialogPrimitive.Root>
);
