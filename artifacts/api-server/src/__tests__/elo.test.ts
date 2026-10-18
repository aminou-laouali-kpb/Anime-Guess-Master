import { describe, expect, it } from "vitest";
import { eloDelta, eloDrawDelta } from "../lib/stats";

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

describe("eloDrawDelta", () => {
  it("moves nothing between equal players", () => {
    expect(eloDrawDelta(1000, 1000)).toBe(0);
  });

  it("takes points from the higher-rated player and gives them to the lower-rated one", () => {
    expect(eloDrawDelta(1200, 1000)).toBeLessThan(0);
    expect(eloDrawDelta(1000, 1200)).toBeGreaterThan(0);
  });

  it("is mirrored: what one side gains, the other loses", () => {
    expect(eloDrawDelta(1300, 900)).toBe(-eloDrawDelta(900, 1300));
  });

  it("is worth less than a win for the underdog", () => {
    expect(eloDrawDelta(900, 1100)).toBeLessThan(eloDelta(900, 1100));
  });
});
