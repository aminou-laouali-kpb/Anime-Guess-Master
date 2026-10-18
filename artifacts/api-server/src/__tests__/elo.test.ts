import { describe, expect, it } from "vitest";
import { eloDelta } from "../lib/stats";

describe("eloDelta", () => {
  it("is 16 points between equal players", () => {
    expect(eloDelta(1000, 1000)).toBe(16);
  });

  it("rewards an upset more than an expected win", () => {
    expect(eloDelta(900, 1100)).toBeGreaterThan(eloDelta(1000, 1000));
    expect(eloDelta(1100, 900)).toBeLessThan(eloDelta(1000, 1000));
  });

  it("is always between 1 and 32 points", () => {
    for (const [winner, loser] of [[100, 3000], [3000, 100], [1000, 1000], [1500, 1499]] as const) {
      const delta = eloDelta(winner, loser);
      expect(delta).toBeGreaterThanOrEqual(1);
      expect(delta).toBeLessThanOrEqual(32);
    }
  });
});
