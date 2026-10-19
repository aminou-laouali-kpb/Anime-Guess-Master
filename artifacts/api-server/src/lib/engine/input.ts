import { VERIFIABLE_ATTRIBUTES, type VerifiableAttribute } from "@workspace/game-protocol";
import type { Room } from "./state";

// Validation of everything that comes from the client.

export const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

// Socket payloads come straight from the client: never trust their shape.
export function payloadOf(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : {};
}

export function readString(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().slice(0, maxLength);
  return value || null;
}

// Player names are shown to everyone (and on the leaderboard): drop control
// characters, invisible/bidirectional-override characters and extra spaces.
const UNSAFE_NAME_CHARS = /[\p{C}\p{Zl}\p{Zp}\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/gu;

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "Joueur";
  const name = raw.normalize("NFC").replace(/\s+/g, " ").replace(UNSAFE_NAME_CHARS, "").trim().slice(0, 24).trim();
  return name || "Joueur";
}

export function readName(raw: unknown): string {
  return cleanName(raw);
}

export function readAttribute(raw: unknown): VerifiableAttribute | null {
  return VERIFIABLE_ATTRIBUTES.find((a) => a === raw) ?? null;
}

export function readCharacterId(room: Room, raw: unknown): string | null {
  return typeof raw === "string" && room.characterIds.includes(raw) ? raw : null;
}
