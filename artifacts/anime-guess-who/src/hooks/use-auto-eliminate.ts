import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Character } from "@workspace/api-client-react";
import type { GameLogEntry } from "@/lib/socket";
import { hasTrait } from "@/lib/questions";
import { plural } from "@/lib/fr";

// After one of my verified questions, offer to cross out every character
// the answer rules out (the answer is guaranteed true, so this is safe).
export function useAutoEliminate({
  gameLog,
  myPlayerId,
  characters,
  eliminatedIds,
  eliminate,
}: {
  gameLog: GameLogEntry[];
  myPlayerId: string | null;
  characters: Character[];
  eliminatedIds: Set<string>;
  eliminate: (ids: string[]) => void;
}) {
  // Only a new log entry triggers the offer; the rest is read as it is then.
  const latest = useRef({ myPlayerId, characters, eliminatedIds, eliminate });
  useEffect(() => {
    latest.current = { myPlayerId, characters, eliminatedIds, eliminate };
  });

  // Log entries are never rewritten, so a new last entry means a new event.
  const lastLog = gameLog[gameLog.length - 1];
  useEffect(() => {
    if (!lastLog || lastLog.type !== "qna" || !lastLog.verified) return;
    // Entries rebuilt after a reload are old news: don't offer to cross out again.
    if (lastLog.id.startsWith("restored-")) return;
    const { myPlayerId, characters, eliminatedIds, eliminate } = latest.current;
    if (lastLog.askerId !== myPlayerId || !lastLog.attribute || !lastLog.value) return;
    const { attribute, value } = lastLog;
    const keep = lastLog.answer === "yes";
    const ruledOut = characters
      .filter(c => !eliminatedIds.has(c.id) && hasTrait(c, attribute, value) !== keep)
      .map(c => c.id);
    if (ruledOut.length === 0) return;
    toast(`Réponse : ${keep ? "OUI" : "NON"}`, {
      description: `${ruledOut.length} ${plural(ruledOut.length, "personnage ne correspond", "personnages ne correspondent")} pas.`,
      action: {
        label: "Les écarter",
        onClick: () => eliminate(ruledOut),
      },
      duration: 8000,
    });
  }, [lastLog]);
}
