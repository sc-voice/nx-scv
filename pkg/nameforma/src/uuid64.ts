import { randomBytes } from 'crypto';

// ============================================================================
// MonotonicityState - Ensures successive UUIDs are always strictly increasing
// ============================================================================

class MonotonicityState {
  private previousTimestamp = 0n;
  private sequence = 0;
  private offset = 0n;

  nextMillisWithSequence(timeIntervalMs: number): {
    millis: bigint;
    sequence: number;
  } {
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
  // ========================================================================
  // Static Constants
  // ========================================================================

  /**
   * Avro schema for UUID64 (fixed 16-byte binary type)
   */
  static readonly avroSchema = {
    type: 'fixed',
    size: 16,
    name: 'UUID64',
    logicalType: 'uuid64',
  };

  // ========================================================================
  // Instance Properties
  // ========================================================================

  public readonly uuidv7: Buffer;
  public readonly base64: string;

  // ========================================================================
  // Constructor
  // ========================================================================

  /**
   * Creates an instance with a monotonically increasing UUIDv7.
   * Two successive calls will always produce different, strictly increasing UUIDs.
   */
  constructor() {
    this.uuidv7 = this.generate();
    this.base64 = UUID64.toOrderPreservingBase64(this.uuidv7);
  }

  // ========================================================================
  // Static Methods (Public)
  // ========================================================================

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
    instance.base64 = UUID64.toOrderPreservingBase64(instance.uuidv7);
    return instance;
  }

  /**
   * Create a UUID64 instance from a UUID string or OPB64 string.
   *
   * @param input UUID string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) or OPB64 string
   * @returns UUID64 instance
   */
  static fromString(input: string): UUID64 {
    let buf;

    // Check if it's a UUID string format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(input)) {
      // UUID string format
      buf = UUID64.uuidStringToBytes(input);
    } else {
      // Order-preserving base64 string format
      buf = UUID64.bufferFromOPB64(input);
    }

    if (!UUID64.validate(buf)) {
      throw new Error(`Invalid UUID64 string: ${input}`);
    }

    const instance = Object.create(UUID64.prototype);
    instance.uuidv7 = buf;
    instance.base64 = UUID64.toOrderPreservingBase64(instance.uuidv7);
    return instance;
  }

  /**
   * Create a UUID64 instance from a 16-byte buffer.
   *
   * @param buffer 16-byte buffer containing a valid UUID64
   * @returns UUID64 instance
   * @throws Error if buffer is invalid or not 16 bytes
   */
  static fromBuffer(buffer: Buffer): UUID64 {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('fromBuffer requires a Buffer');
    }

    if (!UUID64.validate(buffer)) {
      throw new Error(
        `Invalid UUID64 buffer: length=${buffer.length}, must be 16 bytes with valid UUIDv7 format`,
      );
    }

    const instance = Object.create(UUID64.prototype);
    instance.uuidv7 = buffer;
    instance.base64 = UUID64.toOrderPreservingBase64(instance.uuidv7);
    return instance;
  }

  /**
   * Create a UUID64 instance from Avro-deserialized buffer.
   * This is used by Avro custom type handler during deserialization.
   *
   * @param buffer 16-byte buffer from Avro
   * @returns UUID64 instance
   * @throws Error if buffer is invalid
   */
  static fromAvroBuffer(buffer: Buffer): UUID64 {
    return UUID64.fromBuffer(buffer);
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
      // Decode order-preserving base64 string
      try {
        buffer = UUID64.bufferFromOPB64(input);
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

  // ========================================================================
  // Instance Methods (Public)
  // ========================================================================

  /**
   * Get the UUID as a string.
   *
   * @returns UUID in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  asV7(): string {
    return UUID64.bytesToUuidString(this.uuidv7);
  }

  /**
   * Get a new item id. Creates a new relation UUID and returns the order-preserving
   * base64 encoding of the time/sequence bit difference between the relation and the instance.
   * Ensures the difference is at least `basis`.
   *
   * The returned string sorts lexicographically in the same order as the numerical values.
   * Leading zeros are preserved up to `width` characters; beyond that they are stripped.
   *
   * @param basis minimum difference value (defaults to 1)
   * @param width minimum string width; preserves leading zeros up to this width (defaults to 3)
   * @returns order-preserving base64 encoding of the time/sequence difference
   */
  itemId(basis: number = 1, width: number = 3): string {
    let relation = UUID64.createRelation(this);
    let diff = UUID64.extractTimeSeqDiff(relation.uuidv7, this.uuidv7);

    // Keep creating relations until difference is at least basis
    while (diff < basis) {
      relation = UUID64.createRelation(this);
      diff = UUID64.extractTimeSeqDiff(relation.uuidv7, this.uuidv7);
    }

    // Convert difference to 8-byte buffer and encode as order-preserving base64
    const diffBytes = UUID64.bigIntToBytes(diff, 8);
    let opb64 = UUID64.toOrderPreservingBase64(diffBytes);

    // Handle width: pad to width with leading zeros, but strip leading zeros beyond width
    if (opb64.length < width) {
      // Pad with leading zeros to reach width
      opb64 = '0'.repeat(width - opb64.length) + opb64;
    } else if (opb64.length > width) {
      // Strip leading zeros beyond width
      let stripIndex = 0;
      while (stripIndex < opb64.length - 1 && opb64[stripIndex] === '0') {
        stripIndex++;
      }
      // Keep at least width - 1 characters, then strip remaining leading zeros
      if (stripIndex > opb64.length - width) {
        stripIndex = opb64.length - width;
      }
      opb64 = opb64.substring(stripIndex);
    }

    return opb64;
  }

  /**
   * Get the time/sequence prefix of the UUID (first 11 base64 characters).
   * Contains 48-bit timestamp + 12-bit sequence + 2 random bits from variant field.
   * Useful for time-based partitioning or sorting.
   *
   * @returns 11-character base64 string prefix
   */
  timeId(): string {
    return this.base64.substring(0, 11);
  }

  /**
   * Get the UUID buffer for Avro serialization.
   * Avro will call this method when serializing UUID64 instances.
   *
   * @returns 16-byte buffer containing the UUID
   */
  toBuffer(): Buffer {
    return this.uuidv7;
  }

  /**
   * Serialize UUID64 to JSON as a URL-safe base64 string.
   * Called automatically by JSON.stringify().
   *
   * @returns URL-safe base64 string representation
   */
  toJSON(): string {
    return this.base64;
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

  // ========================================================================
  // Instance Methods (Private)
  // ========================================================================

  /**
   * Generate a monotonically increasing UUIDv7 as Buffer.
   *
   * @returns Buffer 16-byte UUID buffer
   */
  private generate(): Buffer {
    return UUID64.createBuffer();
  }

  // ========================================================================
  // Static Methods (Private)
  // ========================================================================

  /**
   * Create a UUID64 buffer with timestamp, sequence, and optional random bytes.
   *
   * @param date Timestamp in milliseconds (defaults to current time)
   * @param randomBytes64 Optional 16-byte buffer with random bits for bytes 8-15. If not provided, generates new random bytes.
   * @returns Buffer 16-byte UUID buffer
   */
  private static createBuffer(
    date: number = Date.now(),
    randomBytes64: Buffer | null = null,
  ): Buffer {
    const { millis, sequence } =
      monotonicityState.nextMillisWithSequence(date);
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
  private static buildTimestampAndSequence(
    uuid: Buffer,
    millis: bigint,
    sequence: number,
  ): void {
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
   * Extract the 60-bit time/sequence value from bytes 0-7 of a UUID buffer.
   *
   * @param buffer UUID buffer
   * @returns 60-bit time/sequence as BigInt
   */
  private static extractTimeSeq(buffer: Buffer): bigint {
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value = (value << 8n) | BigInt(buffer[i]);
    }
    return value;
  }

  /**
   * Calculate the difference between two time/sequence values.
   *
   * @param buf1 First UUID buffer (minuend)
   * @param buf2 Second UUID buffer (subtrahend)
   * @returns buf1's time/seq minus buf2's time/seq
   */
  private static extractTimeSeqDiff(buf1: Buffer, buf2: Buffer): bigint {
    const val1 = UUID64.extractTimeSeq(buf1);
    const val2 = UUID64.extractTimeSeq(buf2);
    return val1 - val2;
  }

  /**
   * Convert a BigInt to a fixed-size byte buffer (big-endian).
   *
   * @param value BigInt value to convert
   * @param size Number of bytes in result
   * @returns Buffer containing the big-endian bytes
   */
  private static bigIntToBytes(value: bigint, size: number): Buffer {
    const buffer = Buffer.alloc(size);
    for (let i = size - 1; i >= 0; i--) {
      buffer[i] = Number(value & 0xffn);
      value = value >> 8n;
    }
    return buffer;
  }

  /**
   * Order-preserving base64 alphabet (0-9, A-Z, a-z, -_).
   * Lexicographic sorting of encoded strings matches numeric ordering.
   */
  private static readonly OPB64_ALPHABET =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

  /**
   * Encode buffer as order-preserving base64.
   * The alphabet is ordered so lexicographic sorting matches numeric sorting.
   *
   * Standard base64url alphabet (by numeric value 0-63):
   *   ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_
   *
   * Order-preserving alphabet (0-9, A-Z, a-z, -_):
   *   0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_
   *
   * @param buffer Buffer to encode
   * @returns order-preserving base64 string
   */
  static toOrderPreservingBase64(buffer: Buffer): string {
    let result = '';
    let bits = 0;
    let bitCount = 0;

    for (let i = 0; i < buffer.length; i++) {
      bits = (bits << 8) | buffer[i];
      bitCount += 8;

      while (bitCount >= 6) {
        bitCount -= 6;
        const index = (bits >> bitCount) & 0x3f;
        result += UUID64.OPB64_ALPHABET[index];
      }
    }

    // Handle remaining bits
    if (bitCount > 0) {
      const index = (bits << (6 - bitCount)) & 0x3f;
      result += UUID64.OPB64_ALPHABET[index];
    }

    return result;
  }

  /**
   * Convert a string to order-preserving base64 (OPB64) encoding.
   * Encodes the UTF-8 bytes of the string as OPB64.
   *
   * @param str String to encode
   * @returns order-preserving base64 encoded string
   */
  static stringToOPB64(str: string): string {
    const buffer = Buffer.from(str, 'utf8');
    return UUID64.toOrderPreservingBase64(buffer);
  }

  /**
   * Convert an order-preserving base64 (OPB64) string back to a regular string.
   * Decodes OPB64 and interprets the bytes as UTF-8.
   *
   * @param opb64 order-preserving base64 encoded string
   * @returns decoded UTF-8 string
   * @throws Error if OPB64 string contains invalid characters
   */
  static stringFromOPB64(opb64: string): string {
    const buffer = UUID64.bufferFromOPB64(opb64);
    return buffer.toString('utf8');
  }

  /**
   * Convert an order-preserving base64 (OPB64) string to a buffer.
   *
   * @param opb64 order-preserving base64 encoded string
   * @returns decoded buffer
   * @throws Error if OPB64 string contains invalid characters
   */
  static bufferFromOPB64(opb64: string): Buffer {
    // Build reverse lookup table
    const charToIndex: Record<string, number> = {};
    for (let i = 0; i < UUID64.OPB64_ALPHABET.length; i++) {
      charToIndex[UUID64.OPB64_ALPHABET[i]] = i;
    }

    let bits = 0;
    let bitCount = 0;
    const bytes: number[] = [];

    for (let i = 0; i < opb64.length; i++) {
      const char = opb64[i];
      const index = charToIndex[char];

      if (index === undefined) {
        throw new Error(`Invalid OPB64 character: '${char}'`);
      }

      bits = (bits << 6) | index;
      bitCount += 6;

      if (bitCount >= 8) {
        bitCount -= 8;
        bytes.push((bits >> bitCount) & 0xff);
      }
    }

    return Buffer.from(bytes);
  }
}

export default UUID64;
