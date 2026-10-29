import { beforeAll, describe, expect, it } from "vitest";
import characters from "../data/characters.json" with { type: "json" };
import { VERIFIABLE_ATTRIBUTES, type VerifiableAttribute } from "@workspace/game-protocol";
import { chooseBotMove, remainingCandidates, type BotCharacter, type BotLevel, type BotMemory } from "../lib/bot";

const all = characters as unknown as BotCharacter[];

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Plays the computer alone against a random secret character. */
function playOne(level: BotLevel) {
  const board = shuffle(all).slice(0, 24);
  const secret = board[Math.floor(Math.random() * board.length)]!;
  const memory: BotMemory = { answers: [], wrongGuesses: [], lives: 3 };
  let turns = 0;

  while (memory.lives! > 0 && turns < 80) {
    turns += 1;
    const move = chooseBotMove(board, memory, level);
    if (move.type === "guess") {
      if (move.characterId === secret.id) return { won: true, turns };
      memory.wrongGuesses.push(move.characterId);
      memory.lives! -= 1;
      continue;
    }
    // The question must be about a trait that exists on this board.
    expect(board.some((c) => c[move.attribute].toLowerCase() === move.value.toLowerCase())).toBe(true);
    const before = remainingCandidates(board, memory).length;
    const answer = secret[move.attribute].toLowerCase() === move.value.toLowerCase() ? "yes" : "no";
    memory.answers.push({ attribute: move.attribute, value: move.value, answer });
    const after = remainingCandidates(board, memory);
    // Every question narrows the list, and the real secret is never ruled out.
    expect(after.length).toBeLessThan(before);
    expect(after.some((c) => c.id === secret.id)).toBe(true);
  }
  return { won: false, turns };
}

function simulate(level: BotLevel, games = 300) {
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < games; i++) {
    const result = playOne(level);
    if (result.won) wins += 1;
    turns += result.turns;
  }
  return { winRate: wins / games, avgTurns: turns / games };
}

describe("computer opponent", () => {
  let easy: ReturnType<typeof simulate>;
  let normal: ReturnType<typeof simulate>;
  let hard: ReturnType<typeof simulate>;

  beforeAll(() => {
    easy = simulate("easy");
    normal = simulate("normal");
    hard = simulate("hard");
  });

  it("finds the character almost every time at every level", () => {
    expect(easy.winRate).toBeGreaterThan(0.95);
    expect(normal.winRate).toBeGreaterThan(0.98);
    expect(hard.winRate).toBeGreaterThan(0.98);
  });

  it("gets faster with the level", () => {
    expect(hard.avgTurns).toBeLessThan(normal.avgTurns);
    expect(normal.avgTurns).toBeLessThan(easy.avgTurns);
  });

  it("never needs more than a handful of questions on the hardest level", () => {
    expect(hard.avgTurns).toBeLessThan(7);
  });
});

/** A made-up character: the given traits, every other verifiable trait the same for all. */
function character(id: string, traits: Partial<Record<VerifiableAttribute, string>>): BotCharacter {
  const base = Object.fromEntries(VERIFIABLE_ATTRIBUTES.map((a) => [a, "same"])) as Record<VerifiableAttribute, string>;
  return { id, ...base, ...traits };
}

const seeded = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
};

describe("hard computer: when to guess", () => {
  const three = [
    character("a", { gender: "male", hairColor: "black" }),
    character("b", { gender: "male", hairColor: "blond" }),
    character("c", { gender: "female", hairColor: "black" }),
  ];

  it("guesses as soon as it has at least as many lives as candidates", () => {
    for (let i = 0; i < 20; i++) {
      expect(chooseBotMove(three, { answers: [], wrongGuesses: [], lives: 3 }, "hard", seeded(i)).type).toBe("guess");
    }
    const two = three.slice(0, 2);
    expect(chooseBotMove(two, { answers: [], wrongGuesses: [], lives: 2 }, "hard").type).toBe("guess");
  });

  it("keeps asking when a miss could cost the game", () => {
    expect(chooseBotMove(three, { answers: [], wrongGuesses: [], lives: 2 }, "hard").type).toBe("ask");
    // Two left but a single life: a question first, then a sure guess.
    const two = three.slice(0, 2);
    expect(chooseBotMove(two, { answers: [], wrongGuesses: [], lives: 1 }, "hard").type).toBe("ask");
  });

  it("only guesses among characters it hasn't ruled out", () => {
    for (let i = 0; i < 20; i++) {
      const move = chooseBotMove(three, { answers: [], wrongGuesses: ["a"], lives: 2 }, "hard", seeded(i));
      expect(move).toMatchObject({ type: "guess" });
      expect(move.type === "guess" && move.characterId).not.toBe("a");
    }
  });

  it("leaves the normal level's habits alone", () => {
    // Normal still asks with three left (it only guesses at two), whatever its lives.
    for (let i = 0; i < 20; i++) {
      expect(chooseBotMove(three, { answers: [], wrongGuesses: [], lives: 3 }, "normal", seeded(i)).type).toBe("ask");
    }
    expect(chooseBotMove(three.slice(0, 2), { answers: [], wrongGuesses: [], lives: 1 }, "normal").type).toBe("guess");
  });
});

describe("hard computer: which question", () => {
  // Gender and hair each split the eight 4/4 and leave a 2/2 follow-up in
  // both halves. Eye colour also splits 4/4, but each half can then only be
  // split 1/3: the same first answer, less to build on.
  const board = [
    character("c1", { gender: "male", hairColor: "black", eyeColor: "blue" }),
    character("c2", { gender: "male", hairColor: "black", eyeColor: "blue", role: "main" }), // not c1's twin
    character("c3", { gender: "male", hairColor: "blond", eyeColor: "blue" }),
    character("c4", { gender: "male", hairColor: "blond", eyeColor: "red" }),
    character("c5", { gender: "female", hairColor: "black", eyeColor: "blue" }),
    character("c6", { gender: "female", hairColor: "black", eyeColor: "red" }),
    character("c7", { gender: "female", hairColor: "blond", eyeColor: "red" }),
    character("c8", { gender: "female", hairColor: "blond", eyeColor: "red" }),
  ];

  it("prefers, among equally balanced questions, the one with the best expected information", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const move = chooseBotMove(board, { answers: [], wrongGuesses: [], lives: 3 }, "hard", seeded(i));
      expect(move.type).toBe("ask");
      if (move.type === "ask") seen.add(move.attribute);
    }
    expect(seen.has("eyeColor")).toBe(false);
    expect([...seen].every((a) => a === "gender" || a === "hairColor")).toBe(true);
  });
});
