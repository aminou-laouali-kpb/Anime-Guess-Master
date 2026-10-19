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
  // The bot's lives left. The hard level uses it to know when guessing is
  // safe; without it, it plays as if it couldn't afford a miss.
  lives?: number;
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

const asks = (c: BotCharacter, q: Question) => same(c[q.attribute], q.value);

// Information (in bits) from a yes/no answer that splits n candidates into
// `yes` and n - yes.
function splitEntropy(yes: number, n: number): number {
  if (yes <= 0 || yes >= n) return 0;
  const p = yes / n;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

// Best information the next question could bring among `candidates`.
function bestNextEntropy(candidates: BotCharacter[]): number {
  const questions = usefulQuestions(candidates);
  if (questions.length === 0) return 0;
  const best = Math.min(...questions.map((q) => q.imbalance));
  return splitEntropy(candidates.length / 2 - best, candidates.length);
}

// Expected information of asking `q` now and then the best follow-up: two
// questions that both split 50/50 can still differ in what they set up.
function twoStepInformation(candidates: BotCharacter[], q: Question): number {
  const yes = candidates.filter((c) => asks(c, q));
  const no = candidates.filter((c) => !asks(c, q));
  const n = candidates.length;
  return (
    splitEntropy(yes.length, n) +
    (yes.length / n) * bestNextEntropy(yes) +
    (no.length / n) * bestNextEntropy(no)
  );
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

  if (level === "hard" && memory.lives !== undefined) {
    // As many lives as candidates: guessing them one by one can't lose (each
    // miss removes one of each), and a guess is never slower than a question.
    // With fewer lives, keep asking: a miss could cost the game.
    if (candidates.length <= memory.lives) return guess();
  } else if (candidates.length === 2) {
    // With two left, a guess wins half the time and a miss still leaves one.
    return guess();
  }

  const best = Math.min(...questions.map((q) => q.imbalance));
  const bestQuestions = questions.filter((q) => q.imbalance === best);
  if (level === "normal") {
    const q = random() < 0.7 ? pick(questions, random) : pick(bestQuestions, random);
    return { type: "ask", attribute: q.attribute, value: q.value };
  }

  // Hard: among the best-balanced questions, the one that sets up the most
  // informative follow-up.
  const scored = bestQuestions.map((q) => ({ q, info: twoStepInformation(candidates, q) }));
  const top = Math.max(...scored.map((s) => s.info));
  const q = pick(scored.filter((s) => s.info >= top - 1e-9), random).q;
  return { type: "ask", attribute: q.attribute, value: q.value };
}
