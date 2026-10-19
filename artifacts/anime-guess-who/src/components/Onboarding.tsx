import React from "react";
import { Lightbulb, X } from "lucide-react";

// One-time tips for first-time players, remembered in this browser. Storage
// can be missing or blocked (private mode, disabled cookies): then the tip
// simply shows again next time, nothing breaks.
export const RULES_SEEN_KEY = "animewho:rules-seen";
export const CROSS_OUT_HINT_KEY = "animewho:cross-out-hint-seen";

export function hasSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markSeen(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage unavailable: the tip will show again, that's all.
  }
}

// Shown above the board until dismissed (or the first card is crossed out).
export const CrossOutHint: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div className="max-w-6xl mx-auto w-full px-3 pt-3">
    <div className="flex items-start gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-3 text-sm">
      <Lightbulb className="w-5 h-5 shrink-0 text-primary mt-0.5" aria-hidden />
      <p className="flex-1">
        <strong>Astuce&nbsp;:</strong> touche une carte pour la barrer quand une réponse l’écarte, et touche-la
        encore pour la remettre.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fermer l’astuce"
        className="shrink-0 -m-1 p-1 rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  </div>
);
