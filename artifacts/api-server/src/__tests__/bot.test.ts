import { beforeAll, describe, expect, it } from "vitest";
import characters from "../data/characters.json" with { type: "json" };
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
  const memory: BotMemory = { answers: [], wrongGuesses: [] };
  let lives = 3;
  let turns = 0;

  while (lives > 0 && turns < 80) {
    turns += 1;
    const move = chooseBotMove(board, memory, level);
    if (move.type === "guess") {
      if (move.characterId === secret.id) return { won: true, turns };
      memory.wrongGuesses.push(move.characterId);
      lives -= 1;
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
