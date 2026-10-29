import { createHash } from "crypto";

// Moderation of player-generated content (free questions), required by
// Apple guideline 1.2 for apps with user-generated content: filter, report,
// block. Reports and blocks are handled in game-engine.ts.

// Words with an innocent meaning in the other language ("retard", "bite")
// are left out on purpose: false positives frustrate honest players.
// Basic FR + EN list of insults, slurs and sexual terms. Deliberately short:
// it catches the obvious cases; reports catch the rest. Maintain it with the
// reports received (see docs/store/CHECKLIST_SOUMISSION.md).
const BLOCKED_WORDS = [
  // français
  "connard", "connasse", "salope", "salop", "pute", "putain", "encule", "enculé", "nique", "niquer",
  "ntm", "fdp", "batard", "bâtard", "pd", "pédé", "tapette", "gouine", "negre", "nègre", "bougnoule",
  "youpin", "couille", "couilles", "branleur", "porno", "viol", "violer", "nazi", "hitler",
  "suicidetoi",
  // english
  "fuck", "fucking", "fucker", "shit", "bitch", "cunt", "dick", "pussy", "whore", "slut", "nigger",
  "nigga", "faggot", "fag", "rape", "porn", "kys", "killyourself",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

const BLOCKED = new Set(BLOCKED_WORDS.map(normalize));

/** True when the text contains a blocked word (whole words, after normalisation). */
export function isObjectionable(text: string): boolean {
  const norm = normalize(text);
  const words = norm.split(/[^a-z]+/).filter(Boolean);
  if (words.some((w) => BLOCKED.has(w))) return true;
  // Spaced-out spelling: "f u c k", "k y s".
  const letters = norm.replace(/[^a-z]/g, "");
  return ["killyourself", "suicidetoi", "fuck", "nigger", "encule", "salope", "connard"].some((w) =>
    letters.includes(w),
  );
}

/**
 * Stable, public identifier of a profile that another player can block
 * without learning anything about it: derived from the secret profile token
 * by a one-way hash, distinct from the stored token hash.
 */
export function blockKeyOf(profileToken: string): string {
  return createHash("sha256").update(`block:${profileToken}`).digest("base64url").slice(0, 22);
}

export const BLOCK_KEY_RE = /^[A-Za-z0-9_-]{22}$/;
export const MAX_BLOCKED = 200;

export const REPORT_REASONS = ["insult", "sexual", "hate", "spam", "cheating", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
