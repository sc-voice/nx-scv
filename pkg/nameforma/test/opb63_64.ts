import { describe, it, expect } from 'vitest';
import { randomBytes } from 'crypto';
import { OPB63_64 } from '@sc-voice/nameforma';

const MAX64 = (1n << 64n) - 1n;

/** Slow reference encoder: repeated BigInt division. */
function referenceEncode(value: bigint): string {
  const alphabet =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let out = '';
  let v = value;
  for (let i = 0; i < OPB63_64.WIDTH; i++) {
    out = alphabet[Number(v % 63n)] + out;
    v /= 63n;
  }
  return out;
}

/** Random 64-bit values from the OS entropy source. */
function randomValues(n: number): bigint[] {
  const values: bigint[] = [];
  for (let i = 0; i < n; i++) {
    values.push(randomBytes(8).readBigUInt64BE());
  }
  return values;
}

describe('OPB63_64', () => {
  it('has fixed width 11 and max 2^64-1', () => {
    expect(OPB63_64.WIDTH).toBe(11);
    expect(OPB63_64.MAX_VALUE).toBe(MAX64);
  });

  it('encodes known vectors', () => {
    expect(OPB63_64.encode(0n)).toBe('00000000000');
    expect(OPB63_64.encode(1n)).toBe('00000000001');
    expect(OPB63_64.encode(62n)).toBe('0000000000z');
    expect(OPB63_64.encode(63n)).toBe('00000000010');
    expect(OPB63_64.encode(MAX64)).toBe(referenceEncode(MAX64));
  });

  it('round-trips boundary values across the 32-bit limb edge', () => {
    const edges = [
      0n,
      1n,
      62n,
      63n,
      2n ** 32n - 1n,
      2n ** 32n,
      2n ** 32n + 1n,
      63n ** 5n,
      63n ** 10n - 1n,
      63n ** 10n,
      2n ** 53n + 1n,
      2n ** 63n,
      MAX64 - 1n,
      MAX64,
    ];
    for (const v of edges) {
      expect(OPB63_64.decode(OPB63_64.encode(v))).toBe(v);
    }
  });

  it('round-trips 10000 random 64-bit values', () => {
    for (const v of randomValues(10000)) {
      expect(OPB63_64.decode(OPB63_64.encode(v))).toBe(v);
    }
  });

  it('matches the BigInt reference encoder', () => {
    for (const v of randomValues(2000)) {
      expect(OPB63_64.encode(v)).toBe(referenceEncode(v));
    }
  });

  it('preserves numeric order under string comparison', () => {
    const values = randomValues(2000);
    const byNumber = [...values].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const expected = byNumber.map((v) => OPB63_64.encode(v));
    const byString = values
      .map((v) => OPB63_64.encode(v))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(byString).toEqual(expected);
  });

  it('rejects values outside 64 bits', () => {
    expect(() => OPB63_64.encode(-1n)).toThrow(RangeError);
    expect(() => OPB63_64.encode(MAX64 + 1n)).toThrow(RangeError);
    expect(() => OPB63_64.encode(2n ** 65n)).toThrow(RangeError);
  });

  it('rejects non-bigint input', () => {
    expect(() => OPB63_64.encode(5 as unknown as bigint)).toThrow(
      RangeError,
    );
  });

  it('rejects wrong length', () => {
    expect(() => OPB63_64.decode('0000000000')).toThrow(RangeError);
    expect(() => OPB63_64.decode('000000000000')).toThrow(RangeError);
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => OPB63_64.decode('0000000000+')).toThrow(
      /Invalid OPB63_64 character/,
    );
    expect(() => OPB63_64.decode('000000000 0')).toThrow(
      /Invalid OPB63_64 character/,
    );
    expect(() => OPB63_64.decode('0000000000é')).toThrow(
      /Invalid OPB63_64 character/,
    );
  });

  it('rejects strings that decode above 2^64-1', () => {
    // 63^11 - 1 is the largest 11-character string value
    expect(() => OPB63_64.decode('zzzzzzzzzzz')).toThrow(RangeError);
    expect(OPB63_64.decode(referenceEncode(MAX64))).toBe(MAX64);
  });
});
