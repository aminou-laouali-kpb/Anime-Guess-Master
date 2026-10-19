import { describe, expect, it } from "vitest";
import { MIN_RATING, eloDelta, eloDrawDelta, kFactor, ratingChanges } from "../lib/stats";

describe("eloDelta", () => {
  it("is half of K between equal players", () => {
    expect(eloDelta(1000, 1000, 40)).toBe(20);
    expect(eloDelta(1000, 1000, 20)).toBe(10);
  });

  it("rewards an upset more than an expected win", () => {
    expect(eloDelta(900, 1100)).toBeGreaterThan(eloDelta(1000, 1000));
    expect(eloDelta(1100, 900)).toBeLessThan(eloDelta(1000, 1000));
  });

  it("is always between 1 point and K", () => {
    for (const [winner, loser] of [[100, 3000], [3000, 100], [1000, 1000], [1500, 1499]] as const) {
      const delta = eloDelta(winner, loser, 40);
      expect(delta).toBeGreaterThanOrEqual(1);
      expect(delta).toBeLessThanOrEqual(40);
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

  it("is mirrored with the same K: what one side gains, the other loses", () => {
    expect(eloDrawDelta(1300, 900)).toBe(-eloDrawDelta(900, 1300));
  });

  it("is worth less than a win for the underdog", () => {
    expect(eloDrawDelta(900, 1100)).toBeLessThan(eloDelta(900, 1100));
  });
});

describe("provisional K", () => {
  it("is 40 for the first 10 ranked games, then 20", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(9)).toBe(40);
    expect(kFactor(10)).toBe(20);
    expect(kFactor(500)).toBe(20);
  });

  it("uses each player's own K for their own change", () => {
    const newcomer = { rating: 1000, rankedGames: 0 };
    const veteran = { rating: 1000, rankedGames: 50 };
    expect(ratingChanges(newcomer, veteran)).toEqual({ winner: 20, loser: -10 });
    expect(ratingChanges(veteran, newcomer)).toEqual({ winner: 10, loser: -20 });
  });

  it("does the same for draws", () => {
    const newcomer = { rating: 1000, rankedGames: 3 };
    const veteran = { rating: 1200, rankedGames: 30 };
    const { winner, loser } = ratingChanges(newcomer, veteran, true);
    expect(winner).toBe(eloDrawDelta(1000, 1200, 40));
    expect(loser).toBe(eloDrawDelta(1200, 1000, 20));
    expect(winner).toBeGreaterThan(0);
    expect(loser).toBeLessThan(0);
  });

  it("conserves points between two players with the same K", () => {
    for (const [a, b] of [[1000, 1000], [1400, 900], [850, 1600]] as const) {
      for (const games of [0, 40]) {
        const win = ratingChanges({ rating: a, rankedGames: games }, { rating: b, rankedGames: games });
        expect(win.winner + win.loser).toBe(0);
        const draw = ratingChanges({ rating: a, rankedGames: games }, { rating: b, rankedGames: games }, true);
        expect(draw.winner + draw.loser).toBe(0);
      }
    }
  });
});

describe("rating floor", () => {
  it("never takes a player below the minimum rating", () => {
    // Unfloored, this loss would be about 10 points.
    expect(eloDelta(300, MIN_RATING + 3, 40)).toBeGreaterThan(3);
    const { loser } = ratingChanges({ rating: 300, rankedGames: 0 }, { rating: MIN_RATING + 3, rankedGames: 0 });
    expect(loser).toBe(-3);
    expect(ratingChanges({ rating: 300, rankedGames: 0 }, { rating: MIN_RATING, rankedGames: 0 }).loser).toBe(0);
  });

  it("gives the winner only what the floored loser actually lost: no points are created", () => {
    const win = ratingChanges({ rating: 400, rankedGames: 0 }, { rating: MIN_RATING + 3, rankedGames: 0 });
    expect(win).toEqual({ winner: 3, loser: -3 });
    expect(ratingChanges({ rating: 400, rankedGames: 0 }, { rating: MIN_RATING, rankedGames: 0 })).toEqual({ winner: 0, loser: 0 });
  });

  it("lets a floored player gain normally from a draw", () => {
    expect(ratingChanges({ rating: 2000, rankedGames: 0 }, { rating: MIN_RATING, rankedGames: 0 }, true)).toEqual({
      winner: -20,
      loser: 20,
    });
  });

  it("never creates points, whatever the ratings and K", () => {
    const ratings = [MIN_RATING, MIN_RATING + 1, MIN_RATING + 7, 300, 1000, 1700];
    for (const a of ratings) {
      for (const b of ratings) {
        for (const draw of [false, true]) {
          const same = ratingChanges({ rating: a, rankedGames: 0 }, { rating: b, rankedGames: 0 }, draw);
          expect(same.winner + same.loser).toBeLessThanOrEqual(0);
          expect(a + same.winner).toBeGreaterThanOrEqual(MIN_RATING);
          expect(b + same.loser).toBeGreaterThanOrEqual(MIN_RATING);
        }
      }
    }
  });
});
