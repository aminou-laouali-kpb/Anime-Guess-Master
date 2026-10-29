import { describe, expect, it } from 'vitest';
import { VERIFIABLE_ATTRIBUTES } from '@workspace/game-protocol';
import { ATTRIBUTES } from './questions';

// The question dialog must offer exactly the traits the server can check.
describe('verified question attributes match the protocol', () => {
  it('covers every VERIFIABLE_ATTRIBUTES entry, and no other', () => {
    expect([...ATTRIBUTES.map((a) => a.key)].sort()).toEqual([...VERIFIABLE_ATTRIBUTES].sort());
  });

  it('lists each attribute once, with a label', () => {
    const keys = ATTRIBUTES.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { label } of ATTRIBUTES) expect(label.trim()).not.toBe('');
  });
});
