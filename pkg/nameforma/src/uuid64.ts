import { randomBytes } from 'crypto';

// ============================================================================
// UUID64String - Branded type for type-safe id handling
// ============================================================================

/**
 * Branded type for UUID64 string values (OPB64 format).
 * Enforces type-safe id handling at compile-time with zero runtime cost.
 * Validation happens at boundaries (Identifiable.fromString, World.load).
 */
export type UUID64String = string & { readonly __brand: 'UUID64String' };

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
   * Avro schema for UUID64 (record type with uuidv7 bytes field).
   * Serializes only the essential uuidv7 buffer; base64 is derived on deserialization.
   */
  static readonly avroSchema = {
    type: 'record',
    name: 'UUID64',
    namespace: 'scvoice.nameforma',
    fields: [
      { name: 'uuidv7', type: 'bytes' }
    ]
  };

  // ========================================================================
  // Instance Properties
  // ========================================================================

  public readonly uuidv7: Buffer;
  #base64?: string;

  // ========================================================================
  // Constructor
  // ========================================================================

  /**
   * Creates an instance with a monotonically increasing UUIDv7.
   * Two successive calls will always produce different, strictly increasing UUIDs.
   *
   * Internal use: pass uuidv7 and base64 to construct from factory methods.
   */
  constructor(uuidv7Buf?:Buffer) {
    if (uuidv7Buf == null) {
      this.uuidv7 = UUID64.createBufferUUIDV7();
    } else {
      if (!UUID64.validate(uuidv7Buf)) {
        throw new Error( `Expected valid 16-byte uuidv7 buffer`);
      }
      this.uuidv7 = Buffer.from(uuidv7Buf);
    }
  }

  /**
   * Get the base64 representation of this UUID64.
   */
  get base64(): string {
    if (this.#base64 == null) {
      this.#base64 = UUID64.toOrderPreservingBase64(
          UUID64.toUUID64Buffer(this.uuidv7)
      );
    }

    return this.#base64;
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
    const uuidv7 = UUID64.createBufferUUIDV7(Date.now(), relation.uuidv7);
    const base64 = UUID64.toOrderPreservingBase64(
      UUID64.toUUID64Buffer(uuidv7),
    );
    return new UUID64(uuidv7);
  }

  /**
   * Create a UUID64 instance from a UUID string or OPB64 string.
   *
   * @param input UUID string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) or OPB64 string
   * @returns UUID64 instance
   */
  static fromString(input: string): UUID64 {
    let instance;

    // Check if it's a UUID string format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(input)) {
      // UUID string format (UUIDv7)
      instance = new UUID64(UUID64.uuidStringToBytes(input));
    } else {
      // Order-preserving base64 string format (UUID64)
      const uuid64Buf = UUID64.bufferFromOPB64(input);
      instance = new UUID64(UUID64.toUUIDV7Buffer(uuid64Buf));
    }

    return instance;
  }

  /**
   * Create a UUID64 instance from a 16-byte UUIDv7 buffer.
   *
   * @param buffer 16-byte UUIDV7 buffer 
   * @returns UUID64 instance
   * @throws Error if buffer is invalid or not 16 bytes
   */
  static fromBuffer(uuidv7Buf: Buffer): UUID64 {
    if (!Buffer.isBuffer(uuidv7Buf)) {
      throw new Error('fromBuffer requires a Buffer');
    }

    if (!UUID64.validate(uuidv7Buf)) {
      throw new Error( `Expected valid 16-byte uuidv7 buffer`);
    }

    return new UUID64(uuidv7Buf);
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
   * Validate a UUIDv7 buffer or UUID64 base64 string.
   * For buffers: checks UUIDv7 format (version in byte 6, variant in byte 8)
   * For strings: decodes as UUID64 base64, converts to UUIDv7, validates UUIDv7 format
   *
   * @param input UUIDv7 buffer or UUID64 base64 string
   * @returns true if valid, false otherwise
   */
  static validate(input: string | Buffer): boolean {
    let uuidv7Buffer: Buffer;

    if (typeof input === 'string') {
      // Decode order-preserving base64 string (UUID64 format)
      let uuid64Buffer: Buffer;
      try {
        uuid64Buffer = UUID64.bufferFromOPB64(input);
      } catch {
        return false;
      }

      // Must be exactly 16 bytes
      if (uuid64Buffer.length !== 16) {
        return false;
      }

      // Check UUID64 format: byte 15 bits 5-0 should be 0x1E (version/variant)
      const byte15VersionVariant = uuid64Buffer[15] & 0x3f;
      if (byte15VersionVariant !== 0x1e) {
        return false;
      }

      // Convert from UUID64 to UUIDv7 format for further validation
      uuidv7Buffer = UUID64.toUUIDV7Buffer(uuid64Buffer);
    } else if (Buffer.isBuffer(input)) {
      uuidv7Buffer = input;
    } else {
      return false;
    }

    // Must be exactly 16 bytes
    if (uuidv7Buffer.length !== 16) {
      return false;
    }

    // Check UUIDv7 format: version field (byte 6, upper nibble should be 0x7)
    const versionField = (uuidv7Buffer[6] >> 4) & 0x0f;
    if (versionField !== 7) {
      return false;
    }

    // Check variant field (byte 8, upper 2 bits should be 0b10)
    const variantField = (uuidv7Buffer[8] >> 6) & 0x03;
    if (variantField !== 0b10) {
      return false;
    }

    return true;
  }

  /**
   * Convert a standard UUIDv7 buffer to UUID64 format via bit rearrangement.
   * Rearranges bits to move version/variant from bytes 6,8 to byte 15.
   *
   * @param uuidv7 Standard UUIDv7 buffer (16 bytes)
   * @returns UUID64 buffer with version/variant in byte 15
   */
  static toUUID64Buffer(uuidv7: Buffer): Buffer {
    if (!Buffer.isBuffer(uuidv7) || uuidv7.length !== 16) {
      throw new Error('toUUID64Buffer requires a 16-byte buffer');
    }

    const uuid64 = Buffer.alloc(16);

    // Bytes 0-5: timestamp (unchanged)
    uuidv7.copy(uuid64, 0, 0, 6);

    // Extract 12-bit sequence from UUIDv7 bytes 6-7
    // UUIDv7 byte 6: [version 0x7 (4 bits)][sequence bits 11-8 (4 bits)]
    // UUIDv7 byte 7: [sequence bits 7-0 (8 bits)]
    const seqHigh = uuidv7[6] & 0x0f; // sequence bits 11-8
    const seqLow = uuidv7[7]; // sequence bits 7-0
    const sequence = (seqHigh << 8) | seqLow; // Full 12-bit sequence

    // Extract 62 random bits from UUIDv7
    // Byte 8: [variant 0b10 (2 bits)][random (6 bits)] -> extract 6 random bits
    const byte8Random = uuidv7[8] & 0x3f; // Lower 6 bits
    // Bytes 9-15: [random (56 bits)]
    const randomBytes = Buffer.alloc(8);
    randomBytes[0] = byte8Random; // 6 bits (upper 2 bits of first byte unused)
    uuidv7.copy(randomBytes, 1, 9, 16); // Copy 7 bytes

    // Distribute 62 random bits across UUID64 format:
    // byte 7 lower 4 bits, byte 8 full 8 bits, bytes 9-14 full 48 bits, byte 15 upper 2 bits

    // Reconstruct as 62-bit value for rearrangement
    let randomBits = 0n;
    for (let i = 0; i < 8; i++) {
      randomBits = (randomBits << 8n) | BigInt(randomBytes[i]);
    }

    // Bytes 6-7: pure 12-bit sequence (no version bits)
    uuid64[6] = (sequence >> 4) & 0xff; // Upper 8 bits of sequence
    uuid64[7] = ((sequence & 0x0f) << 4) | Number((randomBits >> 58n) & 0x0fn); // Lower 4 bits of sequence + 4 random bits

    // Byte 8: 8 random bits
    uuid64[8] = Number((randomBits >> 50n) & 0xffn);

    // Bytes 9-14: 48 random bits
    uuid64[9] = Number((randomBits >> 42n) & 0xffn);
    uuid64[10] = Number((randomBits >> 34n) & 0xffn);
    uuid64[11] = Number((randomBits >> 26n) & 0xffn);
    uuid64[12] = Number((randomBits >> 18n) & 0xffn);
    uuid64[13] = Number((randomBits >> 10n) & 0xffn);
    uuid64[14] = Number((randomBits >> 2n) & 0xffn);

    // Byte 15: 2 random bits + 6-bit version/variant (0x1E)
    uuid64[15] = ((Number(randomBits & 0x03n)) << 6) | 0x1e;

    return uuid64;
  }

  /**
   * Convert a UUID64 buffer back to standard UUIDv7 format via bit rearrangement.
   * Reverses the transformation done by toUUID64Buffer().
   *
   * @param uuid64 UUID64 buffer (16 bytes)
   * @returns Standard UUIDv7 buffer with version in byte 6, variant in byte 8
   */
  static toUUIDV7Buffer(uuid64: Buffer): Buffer {
    if (!Buffer.isBuffer(uuid64) || uuid64.length !== 16) {
      throw new Error('toUUIDV7Buffer requires a 16-byte buffer');
    }

    const uuidv7 = Buffer.alloc(16);

    // Bytes 0-5: timestamp (unchanged)
    uuid64.copy(uuidv7, 0, 0, 6);

    // Extract 12-bit sequence from UUID64 bytes 6-7
    const seqHigh = uuid64[6]; // 8 bits (upper bits of sequence)
    const seqHighNibble = (uuid64[7] >> 4) & 0x0f; // Upper nibble (lower 4 bits of sequence)
    const sequence = (seqHigh << 4) | seqHighNibble; // Full 12-bit sequence

    // Reconstruct 62 random bits from UUID64 distribution
    let randomBits = 0n;

    // 4 bits from byte 7 lower nibble
    randomBits = (randomBits << 4n) | BigInt(uuid64[7] & 0x0f);

    // 8 bits from byte 8
    randomBits = (randomBits << 8n) | BigInt(uuid64[8]);

    // 48 bits from bytes 9-14
    randomBits = (randomBits << 8n) | BigInt(uuid64[9]);
    randomBits = (randomBits << 8n) | BigInt(uuid64[10]);
    randomBits = (randomBits << 8n) | BigInt(uuid64[11]);
    randomBits = (randomBits << 8n) | BigInt(uuid64[12]);
    randomBits = (randomBits << 8n) | BigInt(uuid64[13]);
    randomBits = (randomBits << 8n) | BigInt(uuid64[14]);

    // 2 bits from byte 15 upper bits
    randomBits = (randomBits << 2n) | ((BigInt(uuid64[15]) >> 6n) & 0x03n);

    // Bytes 6-7: version (0x7) + 12-bit sequence
    uuidv7[6] = (0x7 << 4) | ((sequence >> 8) & 0x0f); // Version 0x7 + upper 4 bits of sequence
    uuidv7[7] = sequence & 0xff; // Lower 8 bits of sequence

    // Byte 8: variant (0b10) + 6 random bits
    const byte8Random = Number((randomBits >> 56n) & 0x3fn);
    uuidv7[8] = 0x80 | byte8Random; // Variant 0b10 + 6 random bits

    // Bytes 9-15: remaining 56 random bits
    uuidv7[9] = Number((randomBits >> 48n) & 0xffn);
    uuidv7[10] = Number((randomBits >> 40n) & 0xffn);
    uuidv7[11] = Number((randomBits >> 32n) & 0xffn);
    uuidv7[12] = Number((randomBits >> 24n) & 0xffn);
    uuidv7[13] = Number((randomBits >> 16n) & 0xffn);
    uuidv7[14] = Number((randomBits >> 8n) & 0xffn);
    uuidv7[15] = Number(randomBits & 0xffn);

    return uuidv7;
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
   * Generic
   */
  toString() {
    return this.base64;
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
   * Get the time/sequence prefix of the UUID (first 10 base64 characters).
   * Contains 48-bit timestamp + 12-bit sequence bits
   * Useful for time-based partitioning or sorting.
   *
   * The first character changes every ~84 years
   * The last two characters are associated with the 12-bit millisecond sequence numbers
   * 
   * @returns 10-character base64 string prefix
   * @param start index of first character (default 0)
   * @param end index of last character + 1 (default 10)
   */
  timeId(start:number = 0, end:number = 10): string {
    return this.base64.substring(start, end);
  }

  /**
   * Extract the timestamp in milliseconds from the UUID.
   *
   * @returns Timestamp in milliseconds
   */
  getTimestamp(): number {
    let millis = 0n;
    for (let i = 0; i < 6; i++) {
      millis = (millis << 8n) | BigInt(this.uuidv7[i]);
    }
    return Number(millis);
  }

  /**
   * Extract the 12-bit sequence counter from the UUID.
   *
   * @returns 12-bit sequence value (0-4095)
   */
  getSequence(): number {
    const seqHigh = this.uuidv7[6] & 0x0f; // Lower 4 bits of byte 6 (upper 4 bits are version)
    const seqLow = this.uuidv7[7]; // Full 8 bits of byte 7
    return (seqHigh << 8) | seqLow; // Combine to 12-bit value
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
   * Validate that this UUID64 instance is consistent and uncorrupted.
   * Checks both the uuidv7 buffer format and ensures base64 matches the buffer.
   *
   * @returns true if valid, false if corrupted
   */
  validate(): boolean {
    // Check uuidv7 is valid UUIDv7 format
    if (!UUID64.validate(this.uuidv7)) {
      return false;
    }

    // Check base64 matches the uuidv7 buffer (detects corruption)
    const expectedBase64 = UUID64.toOrderPreservingBase64(
      UUID64.toUUID64Buffer(this.uuidv7),
    );
    return this.base64 === expectedBase64;
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
  private static createBufferUUIDV7(
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
  static uuidStringToBytes(uuidString: string): Buffer {
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
