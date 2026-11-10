import { randomBytes } from 'crypto';
import { OPB63_64 } from './opb63_64.js';

/**
 * Branded type for ZUID string values (22 OPB63_64 characters).
 */
export type ZUIDString = string & { readonly __brand: 'ZUIDString' };

const BLOCK_CHARS = OPB63_64.WIDTH; // 11
const VERSION_BINARY = 7n;
const VERSION_TEXT = 15n;
/** Version nibble occupies bits 48-51 counted from the MSB, i.e. value bits 12-15. */
const VERSION_SHIFT = 12n;
const VERSION_MASK = 0xfn << VERSION_SHIFT;
const SEQUENCE_MASK = 0xfffn;
const SEQUENCE_LIMIT = 0xfff; // largest 12-bit sequence
/** Base-63 digit alphabet, identical to OPB63_64 (code-point order). */
const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
const MAX_HI = (1n << 64n) - 1n;
const SIGNATURE_MASK = (1n << 62n) - 1n;

/**
 * ZUID: a UUIDv7 with a base-63 text form.
 *
 * Specification:
 * - Binary: a standard 16-byte UUIDv7 (version 7 in byte 6, variant `10` in
 *   byte 8). Converting to and from UUIDv7 copies the buffer unchanged.
 * - Text: two 11-character OPB63_64 blocks, hi (bytes 0-7) then lo (bytes 8-15),
 *   for 22 characters with no hyphens. The version nibble is 15 in text only.
 * - Time block (hi): 48-bit Unix ms, 4-bit version, 12-bit sequence.
 *   The version sits below the timestamp, so it never changes a prefix's
 *   time window. This is why {@link ZUID.timeRangeOf} is within 1 ms of the
 *   exact bounds.
 * - Signature (lo): 62 free bits; the top 2 bits are the pinned variant `10`.
 *
 * @example
 * const z = ZUID.create();
 * ZUID.fromString(z.toString()).equals(z); // true
 */
export class ZUID {
  readonly #buf: Buffer;

  /**
   * @param buf 16-byte UUIDv7 buffer (copied)
   * @throws Error if the buffer is not a valid UUIDv7
   */
  constructor(buf: Buffer) {
    if (!Buffer.isBuffer(buf) || buf.length !== 16) {
      throw new Error('ZUID requires a 16-byte buffer');
    }
    if (buf[6] >> 4 !== 7 || buf[8] >> 6 !== 2) {
      throw new Error('ZUID buffer is not UUIDv7 (version 7, variant 10)');
    }
    this.#buf = Buffer.from(buf);
  }

  /**
   * Create a ZUID for the given time.
   *
   * @param millis Unix time in milliseconds (48 bits)
   * @param sequence 12-bit sequence (random if omitted)
   * @param signature 62-bit signature (random if omitted)
   */
  static create(
    millis: number = Date.now(),
    sequence?: number,
    signature?: bigint,
  ): ZUID {
    const buf = randomBytes(16);
    const seq = sequence ?? buf.readUInt16BE(6) & 0xfff;
    buf.writeUIntBE(millis, 0, 6);
    buf[6] = 0x70 | ((seq >> 8) & 0x0f);
    buf[7] = seq & 0xff;
    const sig = signature ?? buf.readBigUInt64BE(8) & SIGNATURE_MASK;
    buf.writeBigUInt64BE((sig & SIGNATURE_MASK) | (2n << 62n), 8);
    return new ZUID(buf);
  }

  /**
   * Parse a 22-character ZUID string. The text version (15) is mapped to 7.
   *
   * @throws RangeError if the length or version is wrong
   * @throws Error if a character is outside the alphabet
   */
  static fromString(text: string): ZUID {
    if (typeof text !== 'string' || text.length !== 2 * BLOCK_CHARS) {
      throw new RangeError(
        `ZUID must be ${2 * BLOCK_CHARS} characters: ${text}`,
      );
    }
    let hi = OPB63_64.decode(text.slice(0, BLOCK_CHARS));
    const lo = OPB63_64.decode(text.slice(BLOCK_CHARS));
    if ((hi & VERSION_MASK) >> VERSION_SHIFT !== VERSION_TEXT) {
      throw new RangeError(`ZUID text version must be 15: ${text}`);
    }
    hi = (hi & ~VERSION_MASK) | (VERSION_BINARY << VERSION_SHIFT);
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(hi, 0);
    buf.writeBigUInt64BE(lo, 8);
    return new ZUID(buf);
  }

  /** Copy of the 16-byte UUIDv7 buffer. */
  toBuffer(): Buffer {
    return Buffer.from(this.#buf);
  }

  /** The same 16 bytes as a UUIDv7 buffer (no conversion needed). */
  toUUIDv7(): Buffer {
    return this.toBuffer();
  }

  /**
   * Text form: 22 characters, with the version nibble set to 15.
   */
  toString(): ZUIDString {
    const hi = this.#buf.readBigUInt64BE(0);
    const lo = this.#buf.readBigUInt64BE(8);
    const textHi = (hi & ~VERSION_MASK) | (VERSION_TEXT << VERSION_SHIFT);
    return (OPB63_64.encode(textHi) + OPB63_64.encode(lo)) as ZUIDString;
  }

  /** First 11 characters of the text form: the time block. */
  timeId(): string {
    return this.toString().slice(0, BLOCK_CHARS);
  }

  /** Unix time in milliseconds. */
  get timestamp(): number {
    return Number(this.#buf.readBigUInt64BE(0) >> 16n);
  }

  /** 12-bit sequence counter. */
  get sequence(): number {
    return Number(this.#buf.readBigUInt64BE(0) & SEQUENCE_MASK);
  }

  /** 62-bit signature (variant bits excluded). */
  get signature(): bigint {
    return this.#buf.readBigUInt64BE(8) & SIGNATURE_MASK;
  }

  /** @returns -1, 0, or 1 by time, then sequence, then signature. */
  compare(other: ZUID): number {
    return Buffer.compare(this.#buf, other.#buf);
  }

  /** @returns true if both IDs have the same 16 bytes. */
  equals(other: ZUID): boolean {
    return this.compare(other) === 0;
  }

  /**
   * Create a ZUID at the current time carrying the given signature.
   *
   * @param signature 62-bit signature (variant bits are added automatically)
   */
  static forSignature(signature: bigint): ZUID {
    return ZUID.create(Date.now(), undefined, signature);
  }

  /**
   * Time window covered by a text prefix, rounded outward to whole milliseconds.
   *
   * Every ZUID whose text starts with `prefix` has a timestamp in
   * `[start, end)`. The window can be wider than the exact bounds by up to
   * 1 ms at each end, because the version nibble sits below the timestamp.
   * Approximate widths: 6 characters ≈ 15 s, 7 ≈ 240 ms, 8 ≈ 3.8 ms.
   *
   * @param prefix 1 to 11 characters of the time block
   * @returns `{ start, end }` in Unix ms, `start` inclusive, `end` exclusive
   * @throws RangeError if the prefix length is wrong or the prefix cannot
   *   name any 64-bit value
   * @throws Error if a character is outside the alphabet
   */
  static timeRangeOf(prefix: string): { start: number; end: number } {
    if (
      typeof prefix !== 'string' ||
      prefix.length < 1 ||
      prefix.length > BLOCK_CHARS
    ) {
      throw new RangeError(
        `ZUID time prefix must be 1-${BLOCK_CHARS} characters: ${prefix}`,
      );
    }
    let p = 0n;
    for (const c of prefix) {
      const digit = ALPHABET.indexOf(c);
      if (digit < 0) {
        throw new Error(`Invalid ZUID character: '${c}'`);
      }
      p = p * 63n + BigInt(digit);
    }
    const scale = 63n ** BigInt(BLOCK_CHARS - prefix.length);
    const lo = p * scale;
    if (lo > MAX_HI) {
      throw new RangeError(`ZUID time prefix exceeds 64 bits: ${prefix}`);
    }
    const hi = lo + scale - 1n > MAX_HI ? MAX_HI : lo + scale - 1n;
    return {
      start: Number(lo >> 16n),
      end: Number(hi >> 16n) + 1,
    };
  }

  /**
   * Create a ZUID that sorts strictly after this one, keeping its signature.
   *
   * - Time is the later of `msSys` and this ID's time.
   * - Same millisecond: sequence + 1.
   * - Sequence full (4095): time + 1 ms, sequence 0.
   *
   * @param msSys system time in ms (default: now)
   */
  after(msSys: number = Date.now()): ZUID {
    const ts = this.timestamp;
    if (msSys > ts) {
      return ZUID.create(msSys, 0, this.signature);
    }
    if (this.sequence < SEQUENCE_LIMIT) {
      return ZUID.create(ts, this.sequence + 1, this.signature);
    }
    return ZUID.create(ts + 1, 0, this.signature);
  }
}
