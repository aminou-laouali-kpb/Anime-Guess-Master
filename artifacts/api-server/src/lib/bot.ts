// Decision logic for the computer opponent. Pure functions: the bot only
// sees the board and the answers to its own questions, never the human's
// secret character, so it plays fair.

import { BOT_LEVELS, VERIFIABLE_ATTRIBUTES, type BotLevel } from "@workspace/game-protocol";

export { BOT_LEVELS };
export type { BotLevel };

export const BOT_NAMES: Record<BotLevel, string> = {
  easy: "Ordinateur (facile)",
  normal: "Ordinateur (normal)",
  hard: "Ordinateur (difficile)",
};

type Attribute = (typeof VERIFIABLE_ATTRIBUTES)[number];

export type BotCharacter = { id: string } & Record<Attribute, string>;

export interface BotMemory {
  answers: { attribute: Attribute; value: string; answer: "yes" | "no" }[];
  wrongGuesses: string[];
}

export type BotMove =
  | { type: "ask"; attribute: Attribute; value: string }
  | { type: "guess"; characterId: string };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Characters still consistent with everything the bot has learned.
export function remainingCandidates(board: BotCharacter[], memory: BotMemory): BotCharacter[] {
  return board.filter(
    (c) =>
      !memory.wrongGuesses.includes(c.id) &&
      memory.answers.every(({ attribute, value, answer }) =>
        same(c[attribute], value) === (answer === "yes"),
      ),
  );
}

interface Question {
  attribute: Attribute;
  value: string;
  // How far from a perfect 50/50 split this question is (0 = ideal).
  imbalance: number;
}

// Every question that would actually tell the bot something.
function usefulQuestions(candidates: BotCharacter[]): Question[] {
  const questions: Question[] = [];
  for (const attribute of VERIFIABLE_ATTRIBUTES) {
    // Keyed case-insensitively, but keeps the original spelling for display.
    const counts = new Map<string, { value: string; yes: number }>();
    for (const c of candidates) {
      const key = c[attribute].toLowerCase();
      const entry = counts.get(key) ?? { value: c[attribute], yes: 0 };
      entry.yes += 1;
      counts.set(key, entry);
    }
    for (const { value, yes } of counts.values()) {
      if (yes === 0 || yes === candidates.length) continue;
      questions.push({ attribute, value, imbalance: Math.abs(yes - candidates.length / 2) });
    }
  }
  return questions;
}

const pick = <T>(items: T[], random: () => number): T =>
  items[Math.floor(random() * items.length)]!;

export function chooseBotMove(
  board: BotCharacter[],
  memory: BotMemory,
  level: BotLevel,
  random: () => number = Math.random,
): BotMove {
  const candidates = remainingCandidates(board, memory);
  // Shouldn't happen with truthful answers, but never get stuck.
  if (candidates.length === 0) {
    const untried = board.filter((c) => !memory.wrongGuesses.includes(c.id));
    return { type: "guess", characterId: pick(untried.length ? untried : board, random).id };
  }

  const questions = usefulQuestions(candidates);
  const guess = (): BotMove => ({ type: "guess", characterId: pick(candidates, random).id });

  // No question can separate the rest (identical traits): guess.
  if (candidates.length === 1 || questions.length === 0) return guess();

  if (level === "easy") {
    // Guesses too early and prefers narrow questions ("Is it Gon's anime?")
    // that rarely rule out many characters, like a beginner would.
    if (candidates.length <= 4 && random() < 0.6) return guess();
    const sorted = [...questions].sort((a, b) => b.imbalance - a.imbalance);
    const q = pick(sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))), random);
    return { type: "ask", attribute: q.attribute, value: q.value };
  }

  // With two left, a guess wins half the time and a miss still leaves one.
  if (candidates.length === 2) return guess();

  const best = Math.min(...questions.map((q) => q.imbalance));
  const bestQuestions = questions.filter((q) => q.imbalance === best);
  const q =
    level === "normal" && random() < 0.7 ? pick(questions, random) : pick(bestQuestions, random);
  return { type: "ask", attribute: q.attribute, value: q.value };
}
