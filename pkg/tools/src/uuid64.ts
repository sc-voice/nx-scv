import { randomBytes } from 'crypto';

// ============================================================================
// MonotonicityState - Ensures successive UUIDs are always strictly increasing
// ============================================================================

class MonotonicityState {
  private previousTimestamp = 0n;
  private sequence = 0;
  private offset = 0n;

  nextMillisWithSequence(timeIntervalMs: number): { millis: bigint; sequence: number } {
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
    if (this.sequence > 0xfff) {
      this.sequence = 0;
      currentMillis += 1n;
    }

    // Now apply 12-bit mask for the returned value
    const maskedSequence = this.sequence & 0xfff;

    this.previousTimestamp = currentMillis;
    return { millis: currentMillis, sequence: maskedSequence };
  }
}

// Global monotonicity state (thread-safe via single JS event loop)
const monotonicityState = new MonotonicityState();

// ============================================================================
// UUID64 Class
// ============================================================================

class UUID64 {
  public readonly uuidv7: Buffer;
  public readonly base64: string;

  /**
   * Creates an instance with a monotonically increasing UUIDv7.
   * Two successive calls will always produce different, strictly increasing UUIDs.
   */
  constructor() {
    this.uuidv7 = this.generate();
    this.base64 = UUID64.toBase64Url(this.uuidv7);
  }

  /**
   * Create a UUID64 instance from a UUID string or base64 string.
   *
   * @param input UUID string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) or base64 string
   * @returns UUID64 instance
   */
  static fromString(input: string): UUID64 {
    const instance = Object.create(UUID64.prototype);

    if (input.includes('-')) {
      // UUID string format
      instance.uuidv7 = UUID64.uuidStringToBytes(input);
    } else {
      // Base64 string format (may have padding or be URL-safe)
      const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      instance.uuidv7 = Buffer.from(padded, 'base64');
    }

    instance.base64 = UUID64.toBase64Url(instance.uuidv7);
    return instance;
  }

  /**
   * Generate a monotonically increasing UUIDv7 as Buffer.
   *
   * @returns Buffer 16-byte UUID buffer
   */
  private generate(): Buffer {
    const now = Date.now(); // milliseconds since epoch
    const { millis, sequence } = monotonicityState.nextMillisWithSequence(now);

    // Generate random bytes for the UUID
    const randomBuf = randomBytes(16); // Get 16 random bytes

    // Build UUID bytes (16 bytes total)
    const uuid = Buffer.alloc(16);

    // Bytes 0-5: timestamp in milliseconds (48 bits)
    // Convert BigInt to bytes in big-endian
    const millisBigInt = millis;
    uuid[0] = Number((millisBigInt >> 40n) & 0xffn);
    uuid[1] = Number((millisBigInt >> 32n) & 0xffn);
    uuid[2] = Number((millisBigInt >> 24n) & 0xffn);
    uuid[3] = Number((millisBigInt >> 16n) & 0xffn);
    uuid[4] = Number((millisBigInt >> 8n) & 0xffn);
    uuid[5] = Number(millisBigInt & 0xffn);

    // Bytes 6-8: 12-bit sequence counter + version + variant
    // Place 12-bit sequence as UInt16 big-endian in bytes 6-7, then apply version/variant masks
    // Sequence is 12 bits: bit11-bit0, represented as 0x0000-0x0FFF
    // When converted to big-endian bytes:
    //   bytes[6] = (sequence >> 8) & 0xFF  (contains bits 11-8 in lower nibble, upper bits are 0)
    //   bytes[7] = sequence & 0xFF         (contains bits 7-0)
    uuid[6] = ((sequence >> 8) & 0x0f) | 0x70; // Upper 4 bits of sequence + version 0x7
    uuid[7] = sequence & 0xff; // Lower 8 bits of sequence

    // Bytes 9-15: random data
    randomBuf.copy(uuid, 9, 0, 7); // Copy 7 bytes from randomBuf[0:7] to uuid[9:16]

    // Byte 8: variant (2 bits) + remaining random bits
    uuid[8] = (randomBuf[7] & 0x3f) | 0x80; // Keep lower 6 bits of random + variant 0b10

    return uuid;
  }

  /**
   * Get the UUID as a string.
   *
   * @returns UUID in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  asV7(): string {
    return UUID64.bytesToUuidString(this.uuidv7);
  }

  /**
   * Compare this UUID with another UUID.
   * Returns: -1 if this < other, 0 if this === other, 1 if this > other
   *
   * @param other UUID buffer or UUID64 instance
   * @returns -1, 0, or 1
   */
  compare(other: Buffer | UUID64): number {
    const otherBuffer = other instanceof UUID64 ? other.uuidv7 : other;
    return UUID64.compareUuids(this.uuidv7, otherBuffer);
  }

  /**
   * Check if this UUID < other
   *
   * @param other UUID buffer or UUID64 instance
   * @returns true if this < other
   */
  isLessThan(other: Buffer | UUID64): boolean {
    return this.compare(other) < 0;
  }

  /**
   * Check if this UUID > other
   *
   * @param other UUID buffer or UUID64 instance
   * @returns true if this > other
   */
  isGreaterThan(other: Buffer | UUID64): boolean {
    return this.compare(other) > 0;
  }

  /**
   * Check if this UUID === other
   *
   * @param other UUID buffer or UUID64 instance
   * @returns true if this === other
   */
  equals(other: Buffer | UUID64): boolean {
    return this.compare(other) === 0;
  }

  /**
   * Convert UUID bytes to standard string format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  private static bytesToUuidString(bytes: Buffer): string {
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
   * @param uuidString UUID in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   * @returns 16 bytes
   */
  private static uuidStringToBytes(uuidString: string): Buffer {
    const hex = uuidString.replace(/-/g, '');
    return Buffer.from(hex, 'hex');
  }

  /**
   * Compare two UUIDs lexicographically.
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   *
   * @param a UUID buffer
   * @param b UUID buffer
   * @returns -1, 0, or 1
   */
  private static compareUuids(a: Buffer, b: Buffer): number {
    for (let i = 0; i < 16; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  }

  /**
   * Convert buffer to URL-safe base64 string.
   *
   * @param buffer Buffer to encode
   * @returns URL-safe base64 string (no padding)
   */
  private static toBase64Url(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

export default UUID64;
