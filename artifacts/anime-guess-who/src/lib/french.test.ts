import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FR_LABELS } from './fr';
import {
  AGE_PHRASES,
  ALIGNMENT_PHRASES,
  ATTRIBUTES,
  questionText,
  valueLabel,
  valuesOnBoard,
  type VerifiableAttribute,
} from './questions';

// The server's character data is the source of truth for every trait value.
const characters = JSON.parse(
  readFileSync(new URL('../../../api-server/src/data/characters.json', import.meta.url), 'utf8'),
) as Record<VerifiableAttribute, string>[] & { id: string }[];

const values = (key: VerifiableAttribute) => [...new Set(characters.map((c) => c[key]))];

describe('French labels for the character data', () => {
  const tables: [VerifiableAttribute, Record<string, string>][] = [
    ['hairColor', FR_LABELS.hair],
    ['eyeColor', FR_LABELS.eyes],
    ['species', FR_LABELS.species],
    ['gender', FR_LABELS.gender],
    ['alignment', FR_LABELS.alignment],
    ['role', FR_LABELS.role],
  ];

  for (const [key, table] of tables) {
    it(`has a French label for every ${key} value`, () => {
      const missing = values(key).filter((v) => !(v.toLowerCase() in table));
      expect(missing).toEqual([]);
    });
  }

  it('knows how to phrase every age range and alignment', () => {
    expect(values('ageRange').filter((v) => !(v in AGE_PHRASES))).toEqual([]);
    expect(values('alignment').filter((v) => !(v in ALIGNMENT_PHRASES))).toEqual([]);
  });
});

describe('verified questions', () => {
  it('offers every attribute the server accepts, and no other', () => {
    expect(ATTRIBUTES.map((a) => a.key).sort()).toEqual(
      ['alignment', 'ageRange', 'anime', 'eyeColor', 'gender', 'hairColor', 'role', 'species'].sort(),
    );
  });

  it('writes a clean French question and a label for every value', () => {
    for (const { key } of ATTRIBUTES) {
      for (const value of values(key)) {
        const question = questionText(key, value);
        expect(question, `${key}=${value}`).toMatch(/\?$/);
        expect(question, `${key}=${value}`).not.toMatch(/undefined|null/);
        expect(valueLabel(key, value).trim(), `${key}=${value}`).not.toBe('');
      }
    }
  });

  it('only proposes values that exist on the board', () => {
    const board = characters.slice(0, 24) as unknown as Parameters<typeof valuesOnBoard>[0];
    for (const { key } of ATTRIBUTES) {
      const offered = valuesOnBoard(board, key);
      expect(new Set(offered)).toEqual(new Set(board.map((c) => (c as unknown as Record<string, string>)[key])));
    }
  });

  it('sorts labels alphabetically in French', () => {
    const board = characters as unknown as Parameters<typeof valuesOnBoard>[0];
    const labels = valuesOnBoard(board, 'hairColor').map((v) => valueLabel('hairColor', v));
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')));
  });
});
