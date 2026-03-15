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
   * Create a UUID64 instance related to another UUID64.
   * Regenerates the first 8 bytes (timestamp + sequence) while copying bytes 8-15 from the relation.
   *
   * @param relation UUID64 instance to create a relation with
   * @returns UUID64 instance with new timestamp/sequence and relation's random bits
   */
  static createRelation(relation: UUID64): UUID64 {
    const instance = Object.create(UUID64.prototype);
    instance.uuidv7 = UUID64.createBuffer(Date.now(), relation.uuidv7);
    instance.base64 = UUID64.toBase64Url(instance.uuidv7);
    return instance;
  }

  /**
   * Create a UUID64 instance from a UUID string or base64 string.
   *
   * @param input UUID string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) or base64 string
   * @returns UUID64 instance
   */
  static fromString(input: string): UUID64 {
    let buf;

    // Check if it's a UUID string format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(input)) {
      // UUID string format
      buf = UUID64.uuidStringToBytes(input);
    } else {
      // URL-safe base64 string format (RFC 4648 Section 5)
      buf = Buffer.from(input, 'base64url');
    }

    if (!UUID64.validate(buf)) {
      throw new Error(`Invalid UUID64 string: ${input}`);
    }

    const instance = Object.create(UUID64.prototype);
    instance.uuidv7 = buf;
    instance.base64 = UUID64.toBase64Url(instance.uuidv7);
    return instance;
  }

  /**
   * Create a UUID64 buffer with timestamp, sequence, and optional random bytes.
   *
   * @param date Timestamp in milliseconds (defaults to current time)
   * @param randomBytes64 Optional 16-byte buffer with random bits for bytes 8-15. If not provided, generates new random bytes.
   * @returns Buffer 16-byte UUID buffer
   */
  private static createBuffer(date: number = Date.now(), randomBytes64: Buffer | null = null): Buffer {
    const { millis, sequence } = monotonicityState.nextMillisWithSequence(date);
    const uuid = Buffer.alloc(16);

    // Bytes 0-7: timestamp and sequence
    UUID64.buildTimestampAndSequence(uuid, millis, sequence);

    if (randomBytes64) {
      // Copy bytes 8-15 from provided random bytes (for createRelation)
      randomBytes64.copy(uuid, 8, 8, 16);
    } else {
      // Generate new random bytes (for generate)
      const random = randomBytes(16);
      // Bytes 9-15: random data
      random.copy(uuid, 9, 0, 7); // Copy 7 bytes from random[0:7] to uuid[9:16]
      // Byte 8: variant (2 bits) + remaining random bits
      uuid[8] = (random[7] & 0x3f) | 0x80; // Keep lower 6 bits of random + variant 0b10
    }

    return uuid;
  }

  /**
   * Build timestamp and sequence bytes (0-7) in a UUID buffer.
   *
   * @param uuid Buffer to write to
   * @param millis Timestamp in milliseconds (BigInt)
   * @param sequence 12-bit sequence counter
   */
  private static buildTimestampAndSequence(uuid: Buffer, millis: bigint, sequence: number): void {
    // Bytes 0-5: timestamp in milliseconds (48 bits)
    uuid[0] = Number((millis >> 40n) & 0xffn);
    uuid[1] = Number((millis >> 32n) & 0xffn);
    uuid[2] = Number((millis >> 24n) & 0xffn);
    uuid[3] = Number((millis >> 16n) & 0xffn);
    uuid[4] = Number((millis >> 8n) & 0xffn);
    uuid[5] = Number(millis & 0xffn);

    // Bytes 6-7: 12-bit sequence counter + version
    // Sequence is 12 bits: bit11-bit0, represented as 0x0000-0x0FFF
    // When converted to big-endian bytes:
    //   bytes[6] = (sequence >> 8) & 0xFF  (contains bits 11-8 in lower nibble, upper bits are 0)
    //   bytes[7] = sequence & 0xFF         (contains bits 7-0)
    uuid[6] = ((sequence >> 8) & 0x0f) | 0x70; // Upper 4 bits of sequence + version 0x7
    uuid[7] = sequence & 0xff; // Lower 8 bits of sequence
  }

  /**
   * Generate a monotonically increasing UUIDv7 as Buffer.
   *
   * @returns Buffer 16-byte UUID buffer
   */
  private generate(): Buffer {
    return UUID64.createBuffer();
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
   * Extract the timestamp from the UUID as a Date.
   *
   * @returns Date object representing the UUID's timestamp
   */
  toDate(): Date {
    // Bytes 0-5 contain the 48-bit timestamp in milliseconds
    let millis = 0n;
    for (let i = 0; i < 6; i++) {
      millis = (millis << 8n) | BigInt(this.uuidv7[i]);
    }
    return new Date(Number(millis));
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
   * Check if this UUID is related to another UUID64.
   * Returns true if bytes 8-15 (random bits) match.
   *
   * @param uuid UUID64 instance to check
   * @returns true if this is related to uuid
   */
  isRelated(uuid: UUID64): boolean {
    for (let i = 8; i < 16; i++) {
      if (this.uuidv7[i] !== uuid.uuidv7[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate a UUID64 base64 string or UUID64 buffer.
   *
   * @param input UUID64 base64 string or Buffer (16 bytes)
   * @returns true if valid UUID64 format, false otherwise
   */
  static validate(input: string | Buffer): boolean {
    let buffer: Buffer;

    if (typeof input === 'string') {
      // Decode base64 URL-safe string
      try {
        const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        buffer = Buffer.from(padded, 'base64');
      } catch {
        return false;
      }
    } else if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      return false;
    }

    // Must be exactly 16 bytes
    if (buffer.length !== 16) {
      return false;
    }

    // Check version field (byte 6, upper nibble should be 0x7)
    const versionField = (buffer[6] >> 4) & 0x0f;
    if (versionField !== 7) {
      return false;
    }

    // Check variant field (byte 8, upper 2 bits should be 0b10)
    const variantField = (buffer[8] >> 6) & 0x03;
    if (variantField !== 0b10) {
      return false;
    }

    return true;
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
