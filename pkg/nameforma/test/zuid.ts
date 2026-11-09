/**
 * ZUID documentation by example.
 *
 * Binary layout (16 bytes, a standard UUIDv7):
 *   bytes 0-5   Unix time, ms (48 bits)
 *   byte  6     version 0111 (high nibble), sequence bits 11-8 (low nibble)
 *   byte  7     sequence bits 7-0
 *   byte  8     variant 10 (top 2 bits), 6 signature bits
 *   bytes 9-15  signature bits (56 bits)
 *
 * Text layout (22 characters, no hyphens):
 *   characters 0-10   hi block: time, version nibble set to 15, sequence
 *   characters 11-21  lo block: variant and signature
 */
import { describe, it, expect } from 'vitest';
import { randomBytes } from 'crypto';
import { ZUID, OPB63_64 } from '@sc-voice/nameforma';

/** Fixed test time: 2026-11-09T00:00:00Z, so assertions are deterministic. */
const TEST_MILLIS = Date.UTC(2026, 10, 9);

const TEXT_LENGTH = 22;
const BLOCK_LENGTH = 11;
const SIGNATURE_BITS = 62;
const SIGNATURE_LIMIT = 1n << BigInt(SIGNATURE_BITS); // signatures are < 2^62
/** 62 bits with every other bit set (0101...01), so bits span the whole field. */
const DENSE_SIGNATURE = (SIGNATURE_LIMIT - 1n) / 3n;

/** Replace the version nibble of a hi block (bits 12-15 of the value). */
function withVersionNibble(hi: bigint, nibble: bigint): bigint {
  return (hi & ~(0xfn << 12n)) | (nibble << 12n);
}

describe('ZUID binary form is a UUIDv7', () => {
  it('create() sets version 7 and variant 10', () => {
    const buf = ZUID.create(TEST_MILLIS, 5, DENSE_SIGNATURE).toBuffer();
    expect(buf.length).toBe(16);
    expect(buf[6] >> 4).toBe(7); // version nibble
    expect(buf[8] >> 6).toBe(0b10); // variant bits
  });

  it('toUUIDv7() is the same 16 bytes', () => {
    const z = ZUID.create(TEST_MILLIS, 5, DENSE_SIGNATURE);
    expect(z.toUUIDv7()).toEqual(z.toBuffer());
  });

  it('rejects a buffer that is not UUIDv7', () => {
    const bad = randomBytes(16);
    bad[6] = 0x40; // version 4
    expect(() => new ZUID(bad)).toThrow(/not UUIDv7/);
  });

  it('rejects a buffer that is not 16 bytes', () => {
    expect(() => new ZUID(Buffer.alloc(8))).toThrow(/16-byte/);
  });
});

describe('ZUID accessors read the layout', () => {
  it('timestamp is the 48-bit Unix time in ms', () => {
    const millis = TEST_MILLIS + 123;
    expect(ZUID.create(millis).timestamp).toBe(millis);
  });

  it('sequence is the 12-bit counter in bytes 6-7', () => {
    const SEQUENCE = 4095;
    expect(ZUID.create(TEST_MILLIS, SEQUENCE).sequence).toBe(SEQUENCE);
  });

  it('signature is the 62 bits after the variant', () => {
    expect(ZUID.create(TEST_MILLIS, 0, DENSE_SIGNATURE).signature).toBe(
      DENSE_SIGNATURE,
    );
  });

  it('a 64-bit input signature is truncated to 62 bits', () => {
    const allOnes64 = (1n << 64n) - 1n;
    const z = ZUID.create(TEST_MILLIS, 0, allOnes64);
    expect(z.signature).toBe(SIGNATURE_LIMIT - 1n);
    expect(z.toBuffer()[8] >> 6).toBe(0b10); // variant still 10
  });
});

describe('ZUID text form is 22 characters with version 15', () => {
  it('toString() is 22 alphabet characters with no hyphen', () => {
    for (let i = 0; i < 1000; i++) {
      const s = ZUID.create().toString();
      expect(s.length).toBe(TEXT_LENGTH);
      expect(s).toMatch(/^[0-9A-Za-z_]+$/);
    }
  });

  it('the hi block of the text carries version 15', () => {
    const s = ZUID.create(TEST_MILLIS, 1, 1n).toString();
    const textHi = OPB63_64.decode(s.slice(0, BLOCK_LENGTH));
    expect((textHi >> 12n) & 0xfn).toBe(15n);
  });

  it('the binary behind that text still has version 7', () => {
    const z = ZUID.create(TEST_MILLIS, 1, 1n);
    expect(z.toBuffer()[6] >> 4).toBe(7);
  });

  it('parsing maps text version 15 back to binary version 7', () => {
    const z = ZUID.create(TEST_MILLIS, 1, 1n);
    expect(ZUID.fromString(z.toString()).toBuffer()).toEqual(z.toBuffer());
  });

  it('timeId() is the first 11 characters', () => {
    const z = ZUID.create();
    expect(z.timeId()).toBe(z.toString().slice(0, BLOCK_LENGTH));
  });
});

describe('ZUID round-trips', () => {
  it('text round-trips through fromString()', () => {
    for (let i = 0; i < 5000; i++) {
      const z = ZUID.create();
      expect(ZUID.fromString(z.toString()).equals(z)).toBe(true);
    }
  });

  it('binary round-trips through the constructor', () => {
    for (let i = 0; i < 1000; i++) {
      const z = ZUID.create();
      expect(new ZUID(z.toBuffer()).equals(z)).toBe(true);
    }
  });
});

describe('ZUID ordering', () => {
  it('sorting by text equals sorting by binary', () => {
    const zs = Array.from({ length: 2000 }, () => ZUID.create());
    const byBinary = [...zs].sort((a, b) => a.compare(b));
    const byText = [...zs].sort((a, b) => {
      const sa = a.toString();
      const sb = b.toString();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    expect(byText.map((z) => z.toString())).toEqual(
      byBinary.map((z) => z.toString()),
    );
  });
});

describe('ZUID rejects malformed text', () => {
  it('rejects the wrong length', () => {
    const s = ZUID.create().toString();
    expect(() => ZUID.fromString(s.slice(1))).toThrow(RangeError);
    expect(() => ZUID.fromString(s + 'A')).toThrow(RangeError);
  });

  it('rejects a time block whose version is not 15', () => {
    const s = ZUID.create(TEST_MILLIS, 1, 1n).toString();
    const hi = OPB63_64.decode(s.slice(0, BLOCK_LENGTH));
    const version7Block = OPB63_64.encode(withVersionNibble(hi, 7n));
    expect(() =>
      ZUID.fromString(version7Block + s.slice(BLOCK_LENGTH)),
    ).toThrow(/version must be 15/);
  });

  it('rejects characters outside the alphabet', () => {
    const s = ZUID.create().toString();
    expect(() => ZUID.fromString('+' + s.slice(1))).toThrow(
      /Invalid OPB63_64/,
    );
  });
});

describe('ZUID.forSignature()', () => {
  it('uses the current time', () => {
    const before = Date.now();
    const z = ZUID.forSignature(DENSE_SIGNATURE);
    const after = Date.now();
    expect(z.timestamp).toBeGreaterThanOrEqual(before);
    expect(z.timestamp).toBeLessThanOrEqual(after);
  });

  it('carries the given signature', () => {
    expect(ZUID.forSignature(DENSE_SIGNATURE).signature).toBe(
      DENSE_SIGNATURE,
    );
  });
});

describe('ZUID.after() sorts strictly later and keeps the signature', () => {
  it('later system time: new time, sequence 0', () => {
    const z = ZUID.create(TEST_MILLIS, 7, DENSE_SIGNATURE);
    const next = z.after(TEST_MILLIS + 1000);
    expect(next.timestamp).toBe(TEST_MILLIS + 1000);
    expect(next.sequence).toBe(0);
    expect(next.signature).toBe(DENSE_SIGNATURE);
    expect(next.compare(z)).toBeGreaterThan(0);
  });

  it('same millisecond: same time, sequence + 1', () => {
    const z = ZUID.create(TEST_MILLIS, 7, DENSE_SIGNATURE);
    const next = z.after(TEST_MILLIS);
    expect(next.timestamp).toBe(TEST_MILLIS);
    expect(next.sequence).toBe(8);
    expect(next.compare(z)).toBeGreaterThan(0);
  });

  it('earlier system time: still strictly later than this ID', () => {
    const z = ZUID.create(TEST_MILLIS, 7, DENSE_SIGNATURE);
    const next = z.after(TEST_MILLIS - 5000);
    expect(next.timestamp).toBe(TEST_MILLIS);
    expect(next.sequence).toBe(8);
    expect(next.compare(z)).toBeGreaterThan(0);
  });

  it('full sequence rolls over to the next millisecond, sequence 0', () => {
    const z = ZUID.create(TEST_MILLIS, 4095, DENSE_SIGNATURE);
    const next = z.after(TEST_MILLIS);
    expect(next.timestamp).toBe(TEST_MILLIS + 1);
    expect(next.sequence).toBe(0);
    expect(next.compare(z)).toBeGreaterThan(0);
  });

  it('a chain of after() calls is strictly increasing', () => {
    let z = ZUID.create(TEST_MILLIS, 0, DENSE_SIGNATURE);
    const chain = [z];
    for (let i = 0; i < 5000; i++) {
      z = z.after(TEST_MILLIS);
      chain.push(z);
    }
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].compare(chain[i - 1])).toBeGreaterThan(0);
    }
  });
});

describe('ZUID.timeRangeOf() gives an outward-rounded time window for a prefix', () => {
  it('every ZUID with the prefix has a timestamp inside [start, end)', () => {
    for (let i = 0; i < 2000; i++) {
      const offset = Math.floor(Math.random() * 1e9);
      const z = ZUID.create(TEST_MILLIS + offset);
      const text = z.toString();
      for (let n = 1; n <= BLOCK_LENGTH; n++) {
        const { start, end } = ZUID.timeRangeOf(text.slice(0, n));
        expect(z.timestamp).toBeGreaterThanOrEqual(start);
        expect(z.timestamp).toBeLessThan(end);
      }
    }
  });

  it('a longer prefix gives a window nested inside a shorter one', () => {
    const text = ZUID.create(TEST_MILLIS).toString();
    for (let n = 1; n < BLOCK_LENGTH; n++) {
      const outer = ZUID.timeRangeOf(text.slice(0, n));
      const inner = ZUID.timeRangeOf(text.slice(0, n + 1));
      expect(inner.start).toBeGreaterThanOrEqual(outer.start);
      expect(inner.end).toBeLessThanOrEqual(outer.end);
    }
  });

  it('6 characters span about 15 seconds', () => {
    const text = ZUID.create(TEST_MILLIS).toString();
    const { start, end } = ZUID.timeRangeOf(text.slice(0, 6));
    expect(end - start).toBeGreaterThanOrEqual(15000);
    expect(end - start).toBeLessThanOrEqual(16000);
  });

  it('7 characters span about 240 ms', () => {
    const text = ZUID.create(TEST_MILLIS).toString();
    const { start, end } = ZUID.timeRangeOf(text.slice(0, 7));
    expect(end - start).toBeGreaterThanOrEqual(240);
    expect(end - start).toBeLessThanOrEqual(242);
  });

  it('8 characters span about 4 ms', () => {
    const text = ZUID.create(TEST_MILLIS).toString();
    const { start, end } = ZUID.timeRangeOf(text.slice(0, 8));
    expect(end - start).toBeGreaterThanOrEqual(3);
    expect(end - start).toBeLessThanOrEqual(5);
  });

  it('an all-zero prefix starts at time 0', () => {
    expect(ZUID.timeRangeOf('0').start).toBe(0);
  });

  it('rejects prefixes that are empty, too long, or outside the alphabet', () => {
    expect(() => ZUID.timeRangeOf('')).toThrow(RangeError);
    expect(() => ZUID.timeRangeOf('0'.repeat(12))).toThrow(RangeError);
    expect(() => ZUID.timeRangeOf('0+')).toThrow(/Invalid ZUID character/);
  });

  it('rejects prefixes that name no 64-bit value', () => {
    expect(() => ZUID.timeRangeOf('z'.repeat(10))).toThrow(RangeError);
  });
});
