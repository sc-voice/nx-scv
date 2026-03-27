import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';

const { Forma } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.FORMA.TEST;
const { FormaArray } = NameForma;

describe('FormaArray', () => {
  it('FormaArray.matchId', () => {
    const msg = 'tfma.matchId';
    const f1 = new Forma({ name: 'f1' });
    const f2 = new Forma({ name: 'f2' });
    const f3 = new Forma({ name: 'f3' });

    const arr = new FormaArray<Forma>();
    arr.push(f1, f2, f3);

    expect(arr.length).toBe(3);

    const base64 = f1.id.base64;

    // Exact match (undefined)
    expect(arr.matchId(base64)).toBe(f1);
    expect(arr.matchId(f2.id.base64)).toBe(f2);
    expect(arr.matchId(f3.id.base64)).toBe(f3);
    expect(arr.matchId('nonexistent')).toBe(undefined);
    dbg && cc.ok1(msg + UOK, 'exact match works');

    // Case insensitive (default)
    const base64Upper = base64.toUpperCase();
    expect(arr.matchId(base64Upper)).toBe(f1);
    dbg && cc.ok1(msg + UOK, 'case insensitive works');

    // Case sensitive
    expect(arr.matchId(base64Upper, undefined, false)).toBe(undefined);
    dbg && cc.ok1(msg + UOK, 'case sensitive works');

    // Error cases
    expect(() => arr.matchId(base64, 0)).toThrow();
    expect(() => arr.matchId(base64, -1)).toThrow();
    expect(() => arr.matchId(base64, UUID64.CHARS + 1)).toThrow();
    dbg && cc.ok1(msg + UOK, 'invalid levenshtein throws error');

    // Levenshtein 1-UUID64.TIME_SEQ_CHARS (first TIME_SEQ_CHARS)
    const timeSeqPortion = base64.substring(0, UUID64.TIME_SEQ_CHARS);
    const mutatedTimeSeq = timeSeqPortion.substring(0, UUID64.TIME_SEQ_CHARS - 1) + (timeSeqPortion[UUID64.TIME_SEQ_CHARS - 1] === 'A' ? 'B' : 'A');
    expect(arr.matchId(timeSeqPortion, UUID64.TIME_SEQ_CHARS)).toBe(f1); // max distance = 0, exact match
    expect(arr.matchId(mutatedTimeSeq, UUID64.TIME_SEQ_CHARS - 1)).toBe(f1); // max distance = 1, allows 1 diff
    expect(arr.matchId(mutatedTimeSeq, UUID64.TIME_SEQ_CHARS)).toBe(undefined); // max distance = 0, no match for 1 diff
    dbg && cc.ok1(msg + UOK, `levenshtein 1-${UUID64.TIME_SEQ_CHARS} fuzzy match works`);

    // Levenshtein (UUID64.TIME_SEQ_CHARS + 1)-UUID64.CHARS (full CHARS)
    const mutatedFull = base64.substring(0, UUID64.CHARS - 1) + (base64[UUID64.CHARS - 1] === 'A' ? 'B' : 'A');
    expect(arr.matchId(base64, UUID64.CHARS)).toBe(f1); // max distance = 0, exact match
    expect(arr.matchId(mutatedFull, UUID64.CHARS - 1)).toBe(f1); // max distance = 1, allows 1 diff
    expect(arr.matchId(mutatedFull, UUID64.CHARS)).toBe(undefined); // max distance = 0, no match for 1 diff
    dbg && cc.ok1(msg + UOK, `levenshtein ${UUID64.TIME_SEQ_CHARS + 1}-${UUID64.CHARS} fuzzy match works`);
  });
  it('LevenshteinMatcher', () => {
    const msg = 'tlm';
    const { LevenshteinMatcher } = NameForma;
    const f1 = new Forma({ name: 'f1' });

    const base64 = f1.id.base64;

    // Exact match - similarity should be 1.0
    let matcher = new LevenshteinMatcher<Forma>(base64);
    expect(matcher.similarity(f1)).toBe(1);
    dbg && cc.ok1(msg + UOK, 'exact match has similarity 1.0');

    // Case insensitive (default)
    const base64Upper = base64.toUpperCase();
    matcher = new LevenshteinMatcher<Forma>(base64Upper);
    expect(matcher.similarity(f1)).toBe(1);
    dbg && cc.ok1(msg + UOK, 'case insensitive works');

    // Case sensitive
    matcher = new LevenshteinMatcher<Forma>(base64Upper, false);
    expect(matcher.similarity(f1)).toBeLessThan(1);
    dbg && cc.ok1(msg + UOK, 'case sensitive works');

    // Partial match - should have high similarity
    const timeSeqId = base64.substring(0, UUID64.TIME_SEQ_CHARS);
    matcher = new LevenshteinMatcher<Forma>(timeSeqId);
    expect(matcher.similarity(f1)).toBe(1); // exact prefix match
    dbg && cc.ok1(msg + UOK, 'timeSeqId prefix has similarity 1.0');

    // Near match - similarity between 0 and 1
    const nearMatch = base64.substring(0, 4) + (base64[4] === 'A' ? 'B' : 'A');
    matcher = new LevenshteinMatcher<Forma>(nearMatch);
    const sim = matcher.similarity(f1);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
    dbg && cc.ok1(msg + UOK, 'near match has 0 < similarity < 1');
  });
  it('FormaArray.match()', () => {
    const msg = 'tfa.match';
    const { LevenshteinMatcher } = NameForma;
    const f1 = new Forma({ name: 'f1' });
    const f2 = new Forma({ name: 'f2' });
    const f3 = new Forma({ name: 'f3' });

    const arr = new FormaArray<Forma>();
    arr.push(f1, f2, f3);

    const base64 = f1.id.base64;

    // Match using pattern
    const partialId = base64.substring(0, 5);
    expect(arr.match({pattern: partialId})).toBe(f1);
    dbg && cc.ok1(msg + UOK, 'pattern match works');

    // Match using custom matcher
    const matcher = new LevenshteinMatcher<Forma>(partialId);
    expect(arr.match({matcher})).toBe(f1);
    dbg && cc.ok1(msg + UOK, 'matcher match works');

    // Error: both pattern and matcher
    expect(() => arr.match({pattern: partialId, matcher})).toThrow('exactly one');
    dbg && cc.ok1(msg + UOK, 'throws when both provided');

    // Error: neither pattern nor matcher
    expect(() => arr.match({})).toThrow('requires either');
    dbg && cc.ok1(msg + UOK, 'throws when neither provided');
  });
  it('FormaArray.sort() with matcher.compare()', () => {
    const msg = 'tfa.sort';
    const { LevenshteinMatcher } = NameForma;
    const formas = [
      new Forma({ name: 'f1' }),
      new Forma({ name: 'f2' }),
      new Forma({ name: 'f3' }),
    ]

    const arr = new FormaArray<Forma>();
    arr.push(...formas)

    //cc.tag1(msg, ...formas.map(f=>f.id.base64));
    const partialId_f2 = formas[1].id.base64.substring(5, 10);
    //cc.tag1(msg, partialId_f2)

    // Sort by similarity to formas[1]'s id (descending: highest first)
    const matcher = new LevenshteinMatcher<Forma>(partialId_f2);

    // Verify formas[1] has highest similarity before sort

    arr.sort((a, b) => matcher.compare(a, b));

    // formas[1] should be first (highest similarity)
    expect(arr[0]).toBe(formas[1]);
    expect(arr[1]).toBe(formas[0]);
    expect(arr[2]).toBe(formas[2]);
    dbg && cc.ok1(msg + UOK, 'sort by similarity works');
  });
});
