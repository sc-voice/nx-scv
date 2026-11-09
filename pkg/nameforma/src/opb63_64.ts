/**
 * OPB63_64: fixed-width, order-preserving base-63 codec for 64-bit blocks.
 *
 * Base 63 does not align with bit boundaries, so there is no generic streamer.
 * The computation size is fixed at 64 bits: every block encodes to exactly
 * {@link OPB63_64.WIDTH} characters, since 63^10 < 2^64 <= 63^11. Longer values
 * are encoded as concatenated blocks.
 *
 * The alphabet is in ASCII code-point order (`0-9`, `A-Z`, `_`, `a-z`), so
 * string comparison of encodings equals numeric comparison of values.
 *
 * The 64-bit value is held as two 32-bit limbs in doubles. Every intermediate
 * value stays below 2^53, so the arithmetic is exact and BigInt is used only at
 * the API boundary.
 */

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
const RADIX = 63;
const WIDTH = 11;
const LIMB = 2 ** 32;
const LIMB_BITS = 32n;
const LIMB_MASK = 0xffffffffn;

/** Character code -> digit value, or -1 when the character is not in the alphabet. */
const DIGIT_OF: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/**
 * Fixed 64-bit base-63 codec.
 *
 * @example
 * OPB63_64.encode(0n); // '00000000000'
 * OPB63_64.decode(OPB63_64.encode(2n ** 64n - 1n)); // 2n ** 64n - 1n
 */
export class OPB63_64 {
  /** Number of characters in every encoded block. */
  static readonly WIDTH = WIDTH;

  /** Largest encodable value, 2^64 - 1. */
  static readonly MAX_VALUE = (1n << 64n) - 1n;

  /**
   * Encode a 64-bit unsigned value as {@link OPB63_64.WIDTH} characters.
   *
   * @param value Integer in [0, 2^64 - 1]
   * @returns Fixed-width base-63 string
   * @throws RangeError if value is not a bigint in range
   */
  static encode(value: bigint): string {
    if (
      typeof value !== 'bigint' ||
      value < 0n ||
      value > OPB63_64.MAX_VALUE
    ) {
      throw new RangeError(`OPB63_64 value out of 64-bit range: ${value}`);
    }
    let hi = Number(value >> LIMB_BITS);
    let lo = Number(value & LIMB_MASK);
    const chars: string[] = new Array(WIDTH);
    for (let i = WIDTH - 1; i >= 0; i--) {
      // Long division of (hi * 2^32 + lo) by 63; the remainder of hi is carried into lo.
      const hiQuotient = Math.floor(hi / RADIX);
      const carried = (hi - hiQuotient * RADIX) * LIMB + lo;
      const loQuotient = Math.floor(carried / RADIX);
      chars[i] = ALPHABET[carried - loQuotient * RADIX];
      hi = hiQuotient;
      lo = loQuotient;
    }
    return chars.join('');
  }

  /**
   * Decode a base-63 block back to its 64-bit value.
   *
   * @param encoded Exactly {@link OPB63_64.WIDTH} characters from the alphabet
   * @returns Decoded value in [0, 2^64 - 1]
   * @throws RangeError if the length is wrong or the value exceeds 64 bits
   * @throws Error if a character is outside the alphabet
   */
  static decode(encoded: string): bigint {
    if (typeof encoded !== 'string' || encoded.length !== WIDTH) {
      throw new RangeError(
        `OPB63_64 must be ${WIDTH} characters: ${encoded}`,
      );
    }
    let hi = 0;
    let lo = 0;
    for (let i = 0; i < WIDTH; i++) {
      const code = encoded.charCodeAt(i);
      const digit = code < 128 ? DIGIT_OF[code] : -1;
      if (digit < 0) {
        throw new Error(`Invalid OPB63_64 character: '${encoded[i]}'`);
      }
      // (hi * 2^32 + lo) * 63 + digit, with the carry from lo moved into hi.
      const carried = lo * RADIX + digit;
      const carry = Math.floor(carried / LIMB);
      lo = carried - carry * LIMB;
      hi = hi * RADIX + carry;
    }
    if (hi >= LIMB) {
      throw new RangeError(`OPB63_64 value exceeds 64 bits: ${encoded}`);
    }
    return (BigInt(hi) << LIMB_BITS) | BigInt(lo);
  }
}
