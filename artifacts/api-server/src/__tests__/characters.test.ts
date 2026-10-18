import { describe, expect, it } from "vitest";
import characters from "../data/characters.json" with { type: "json" };

interface Character {
  id: string;
  name: string;
  anime: string;
  gender: string;
  hairColor: string;
  eyeColor: string;
  ageRange: string;
  species: string;
  powers: string[];
  alignment: string;
  role: string;
}

const data = characters as Character[];
const VERIFIABLE = ["hairColor", "eyeColor", "gender", "ageRange", "species", "alignment", "role", "anime"] as const;

// Characters that can't be told apart by any verified question. This list must
// only shrink: adding a new look-alike pair makes the game unwinnable for them.
const KNOWN_INDISTINGUISHABLE: string[][] = [];

describe("characters.json", () => {
  it("has the expected shape", () => {
    for (const c of data) {
      for (const key of ["id", "name", "anime", "gender", "hairColor", "eyeColor", "ageRange", "species", "alignment", "role"] as const) {
        expect(typeof c[key], `${c.id}.${key}`).toBe("string");
        expect(c[key].trim(), `${c.id}.${key} is empty`).not.toBe("");
      }
      expect(Array.isArray(c.powers), `${c.id}.powers`).toBe(true);
    }
  });

  it("has unique ids, in kebab-case", () => {
    const ids = data.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("uses lowercase values for every verifiable trait (except anime titles)", () => {
    for (const c of data) {
      for (const key of VERIFIABLE.filter((k) => k !== "anime")) {
        expect(c[key], `${c.id}.${key}`).toBe(c[key].toLowerCase());
      }
    }
  });

  it("keeps a minimum of variety: both genders, villains, several anime", () => {
    expect(data.filter((c) => c.gender === "female").length).toBeGreaterThanOrEqual(data.length * 0.3);
    expect(data.filter((c) => c.gender === "male").length).toBeGreaterThanOrEqual(data.length * 0.3);
    expect(data.some((c) => c.alignment === "villain")).toBe(true);
    expect(new Set(data.map((c) => c.anime)).size).toBeGreaterThanOrEqual(10);
    expect(data.length).toBeGreaterThanOrEqual(48); // enough for several different 24-card boards
  });

  it("doesn't add characters that no verified question can tell apart", () => {
    const groups = new Map<string, string[]>();
    for (const c of data) {
      const key = VERIFIABLE.map((k) => c[k].toLowerCase()).join("|");
      groups.set(key, [...(groups.get(key) ?? []), c.id]);
    }
    const lookAlikes = [...groups.values()].filter((g) => g.length > 1).map((g) => [...g].sort());
    expect(lookAlikes).toEqual(KNOWN_INDISTINGUISHABLE);
  });
});
