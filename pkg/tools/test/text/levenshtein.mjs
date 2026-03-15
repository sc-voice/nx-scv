import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '../../index.mjs';
const { Levenshtein } = Text;

describe('text/levenshtein', () => {
  it('distance() identical strings returns 0', () => {
    expect(Levenshtein.distance('hello', 'hello')).toBe(0);
    expect(Levenshtein.distance('', '')).toBe(0);

    expect(Levenshtein.normalizedDistance('hello', 'hello')).toBe(0);
    expect(Levenshtein.normalizedDistance('', '')).toBe(0);
  });

  it('distance() empty strings', () => {
    expect(Levenshtein.distance('', 'hello')).toBe(5);
    expect(Levenshtein.distance('hello', '')).toBe(5);

    expect(Levenshtein.normalizedDistance('', 'hello')).toBe(1);
    expect(Levenshtein.normalizedDistance('hello', '')).toBe(1);
  });

  it('distance() single character differences', () => {
    expect(Levenshtein.distance('a', 'b')).toBe(1);
    expect(Levenshtein.distance('cat', 'bat')).toBe(1); // substitution
    expect(Levenshtein.distance('cat', 'cats')).toBe(1); // insertion
    expect(Levenshtein.distance('cats', 'cat')).toBe(1); // deletion

    const result = Levenshtein.normalizedDistance('cat', 'bat');
    expect(result).toBe(1 / 3); // 1 difference out of 3 max length
  });

  it('distance() multiple differences', () => {
    expect(Levenshtein.distance('kitten', 'sitting')).toBe(3);
    expect(Levenshtein.distance('saturday', 'sunday')).toBe(3);

    const result = Levenshtein.normalizedDistance('kitten', 'sitting');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

});
