import { randomBytes } from 'crypto';

// ============================================================================
// MonotonicityState - Ensures successive UUIDs are always strictly increasing
// ============================================================================

class MonotonicityState {
  constructor() {
    this.previousTimestamp = 0n;
    this.sequence = 0;
    this.offset = 0n;
  }

  nextMillisWithSequence(timeIntervalMs) {
    // Convert to BigInt if needed
    const currentTime = BigInt(Math.floor(timeIntervalMs));
    let currentMillis = currentTime + this.offset;

    if (this.previousTimestamp === currentMillis) {
      // Same millisecond: increment sequence counter
      this.sequence += 1; // Don't mask yet - check for overflow
    } else if (currentMillis < this.previousTimestamp) {
      // Clock went backward: increment sequence and adjust offset
      this.sequence += 1;
      this.offset = this.previousTimestamp - currentMillis;
      currentMillis = this.previousTimestamp;
    } else {
      // Time advanced: reset sequence
      this.offset = 0n;
      this.sequence = 0;
    }

    // If sequence overflows 12 bits, increment time and reset sequence
    if (this.sequence > 0xFFF) {
      this.sequence = 0;
      currentMillis += 1n;
    }

    // Now apply 12-bit mask for the returned value
    const maskedSequence = this.sequence & 0xFFF;

    this.previousTimestamp = currentMillis;
    return { millis: currentMillis, sequence: maskedSequence };
  }
}

// Global monotonicity state (thread-safe via single JS event loop)
const monotonicityState = new MonotonicityState();

// ============================================================================
// UUIDV7 Class
// ============================================================================

class UUIDV7 {
  /**
   * Creates a monotonically increasing UUIDV7.
   * Two successive calls will always produce different, strictly increasing UUIDs.
   *
   * @returns {string} UUID in format: 019cc8b2-e91e-7000-8669-15ac4a704757
   */
  static create() {
    const now = Date.now(); // milliseconds since epoch
    const { millis, sequence } = monotonicityState.nextMillisWithSequence(now);

    // Generate random bytes for the UUID
    const randomBuf = randomBytes(16); // Get 16 random bytes

    // Build UUID bytes (16 bytes total)
    const uuid = Buffer.alloc(16);

    // Bytes 0-5: timestamp in milliseconds (48 bits)
    // Convert BigInt to bytes in big-endian
    const millisBigInt = millis;
    uuid[0] = Number((millisBigInt >> 40n) & 0xFFn);
    uuid[1] = Number((millisBigInt >> 32n) & 0xFFn);
    uuid[2] = Number((millisBigInt >> 24n) & 0xFFn);
    uuid[3] = Number((millisBigInt >> 16n) & 0xFFn);
    uuid[4] = Number((millisBigInt >> 8n) & 0xFFn);
    uuid[5] = Number(millisBigInt & 0xFFn);

    // Bytes 6-8: 12-bit sequence counter + version + variant
    // Place 12-bit sequence as UInt16 big-endian in bytes 6-7, then apply version/variant masks
    // Sequence is 12 bits: bit11-bit0, represented as 0x0000-0x0FFF
    // When converted to big-endian bytes:
    //   bytes[6] = (sequence >> 8) & 0xFF  (contains bits 11-8 in lower nibble, upper bits are 0)
    //   bytes[7] = sequence & 0xFF         (contains bits 7-0)
    uuid[6] = ((sequence >> 8) & 0x0F) | 0x70; // Upper 4 bits of sequence + version 0x7
    uuid[7] = sequence & 0xFF; // Lower 8 bits of sequence

    // Bytes 9-15: random data
    randomBuf.copy(uuid, 9, 0, 7); // Copy 7 bytes from randomBuf[0:7] to uuid[9:16]

    // Byte 8: variant (2 bits) + remaining random bits
    uuid[8] = (randomBuf[7] & 0x3F) | 0x80; // Keep lower 6 bits of random + variant 0b10

    return bytesToUuidString(uuid);
  }

  /**
   * Compare two UUIDs lexicographically.
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   *
   * @param {string} a - UUID
   * @param {string} b - UUID
   * @returns {number} -1, 0, or 1
   */
  static compare(a, b) {
    const aBytes = typeof a === 'string' ? uuidStringToBytes(a) : a;
    const bBytes = typeof b === 'string' ? uuidStringToBytes(b) : b;

    for (let i = 0; i < 16; i++) {
      if (aBytes[i] < bBytes[i]) return -1;
      if (aBytes[i] > bBytes[i]) return 1;
    }
    return 0;
  }

  /**
   * Check if UUID a < UUID b
   *
   * @param {string} a - UUID
   * @param {string} b - UUID
   * @returns {boolean}
   */
  static isLessThan(a, b) {
    return UUIDV7.compare(a, b) < 0;
  }

  /**
   * Check if UUID a > UUID b
   *
   * @param {string} a - UUID
   * @param {string} b - UUID
   * @returns {boolean}
   */
  static isGreaterThan(a, b) {
    return UUIDV7.compare(a, b) > 0;
  }
}

export default UUIDV7;

// ============================================================================
// UUID String Formatting
// ============================================================================

/**
 * Convert UUID bytes to standard string format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
function bytesToUuidString(bytes) {
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/**
 * Convert UUID string to bytes.
 *
 * @param {string} uuidString - UUID in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * @returns {Buffer} 16 bytes
 */
function uuidStringToBytes(uuidString) {
  const hex = uuidString.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
}

