import { describe, it, expect } from '@sc-voice/vitest';

/**
 * Bit Manipulation Tests for UUID64 Redesign
 *
 * Tests the bit layout changes:
 * - Move version/variant bits from bytes 6,8 to byte 15 (bits 5-0)
 * - Keep 12-bit sequence in bytes 6-7 with 4 random bits in byte 7 lower nibble
 * - First 60 bits: 48-bit timestamp (bytes 0-5) + 12-bit sequence (bytes 6-7)
 * - Byte 15 format: rr011110 (2 random bits + 4-bit version 0x7 + 2-bit variant 0b10)
 */

describe('UUID64 Redesign - Bit Manipulation', () => {
  /**
   * Test writing version/variant bits to byte 15
   * Pattern: rr011110 where rr are 2 random bits in bits 7-6
   * Bits 5-0: 011110 = version 0x7 (4 bits) + variant 0b10 (2 bits)
   */
  it('should write version/variant bits to byte 15', () => {
    const buffer = Buffer.alloc(16);
    const randomMask = 0b11000000; // since we are bit-OR'ing this checks all bits

    // Buffer allocation zeroed bytes
    expect(buffer[15]).toBe(0);

    // Set byte 15 with pattern: rr011110
    // Byte 15 layout: [bit7:bit6][bit5:bit4:bit3:bit2][bit1:bit0]
    //                 [random  ][    version 0x7   ][variant]
    buffer[15] = randomMask | 0x1E;

    // Verify the bits
    const byte15 = buffer[15];
    expect(byte15).toBe(0b11011110); // 0xDE

    // Extract and verify version/variant bits (bits 5-0)
    const versionVariant = byte15 & 0x3F; // Bits 5-0
    expect(versionVariant).toBe(0b011110); // 0x1E

    // Extract version (bits 5-2) - should be 0x7
    const version = (versionVariant >> 2) & 0x0F;
    expect(version).toBe(0x7);

    // Extract variant (bits 1-0) - should be 0b10
    const variant = versionVariant & 0x03;
    expect(variant).toBe(0b10);
  });

  /**
   * Test reading 12-bit sequence from bytes 6-7
   * Byte 6: bits 7-0 = sequence bits 11-4
   * Byte 7: bits 7-4 = sequence bits 3-0, bits 3-0 = random bits
   */
  it('should write and read 12-bit sequence from bytes 6-7', () => {
    const buffer = Buffer.alloc(16);
    const sequence = 0xABC; // 12-bit value (max 0xFFF)
    const randomBits = 0x5;  // 4-bit random value

    // Write 12-bit sequence to bytes 6-7
    buffer[6] = (sequence >> 4) & 0xFF;           // sequence bits 11-4
    buffer[7] = ((sequence & 0x0F) << 4) | randomBits; // sequence bits 3-0 + random bits

    // Read back sequence (ignore random bits in byte 7 lower nibble)
    const readSequence = ((buffer[6] & 0xFF) << 4) | ((buffer[7] >> 4) & 0x0F);
    expect(readSequence).toBe(0xABC);
    expect(readSequence).toBe(sequence);

    // Verify random bits are preserved
    expect(buffer[7] & 0x0F).toBe(randomBits);
  });

  /**
   * Test reading full 8 bits from byte 8 (no variant bits)
   */
  it('should write and read full 8 bits from byte 8', () => {
    const buffer = Buffer.alloc(16);
    const byte8Value = 0xFF; // Full 8 bits

    // Write full byte 8 (no variant bits)
    buffer[8] = byte8Value;

    // Read back
    expect(buffer[8]).toBe(0xFF);
    expect(buffer[8]).toBe(byte8Value);
  });

  /**
   * Test validation logic for byte 15 format
   * Should check (buffer[15] & 0x3F) === 0x1E
   * Bits 5-0 must be 011110 (0x1E), random bits in 7-6 can be anything
   */
  it('should validate byte 15 format correctly', () => {
    // Valid: byte 15 has pattern 0x1E in bits 5-0 (version/variant part)
    const validBuffer = Buffer.alloc(16);
    validBuffer[15] = (Math.random() < 0.5 ? 0b00 : 0b11) << 6 | 0x1E; // 0x1E or 0xFE depending on random bits

    const validation = (validBuffer[15] & 0x3F) === 0x1E;
    expect(validation).toBe(true);

    // Invalid: byte 15 has wrong pattern in bits 5-0
    const invalidBuffer = Buffer.alloc(16);
    invalidBuffer[15] = 0b11110000; // Wrong pattern in bits 5-0

    const invalidValidation = (invalidBuffer[15] & 0x3F) === 0x1E;
    expect(invalidValidation).toBe(false);
  });

  /**
   * Test edge case: max 12-bit sequence value
   */
  it('should handle max 12-bit sequence (0xFFF)', () => {
    const buffer = Buffer.alloc(16);
    const maxSequence = 0xFFF; // 12-bit max
    const randomBits = 0x0;    // 4-bit random (use 0 to distinguish from sequence)

    buffer[6] = (maxSequence >> 4) & 0xFF;           // 0xFF
    buffer[7] = ((maxSequence & 0x0F) << 4) | randomBits; // 0xF0

    const readSequence = ((buffer[6] & 0xFF) << 4) | ((buffer[7] >> 4) & 0x0F);
    expect(readSequence).toBe(0xFFF);
    expect(readSequence).toBe(maxSequence);
    expect(buffer[7] & 0x0F).toBe(randomBits);
  });

  /**
   * Test edge case: zero sequence value
   */
  it('should handle zero sequence', () => {
    const buffer = Buffer.alloc(16);
    const sequence = 0x000;    // 12-bit zero
    const randomBits = 0xF;    // 4-bit random (use F to distinguish from sequence)

    buffer[6] = (sequence >> 4) & 0xFF;           // 0x00
    buffer[7] = ((sequence & 0x0F) << 4) | randomBits; // 0x0F

    const readSequence = ((buffer[6] & 0xFF) << 4) | ((buffer[7] >> 4) & 0x0F);
    expect(readSequence).toBe(0x000);
    expect(readSequence).toBe(sequence);
    expect(buffer[7] & 0x0F).toBe(randomBits);
  });

  /**
   * Test round-trip: set all bits, read them back
   */
  it('should preserve all bytes in round-trip', () => {
    const buffer = Buffer.alloc(16);

    // Set timestamp (bytes 0-5)
    buffer[0] = 0x12;
    buffer[1] = 0x34;
    buffer[2] = 0x56;
    buffer[3] = 0x78;
    buffer[4] = 0x9A;
    buffer[5] = 0xBC;

    // Set sequence (bytes 6-7) - 12-bit
    const sequence = 0xDEF;  // 12-bit value
    const seqRandomBits = 0x5; // 4-bit random in byte 7 lower nibble
    buffer[6] = (sequence >> 4) & 0xFF;
    buffer[7] = ((sequence & 0x0F) << 4) | seqRandomBits;

    // Set byte 8 - full 8 bits
    buffer[8] = 0xAB;

    // Set remaining random bytes (9-14)
    buffer[9] = 0xCD;
    buffer[10] = 0xEF;
    buffer[11] = 0x01;
    buffer[12] = 0x23;
    buffer[13] = 0x45;
    buffer[14] = 0x67;

    // Set byte 15 - version/variant format
    buffer[15] = (0b10 << 6) | 0x1E; // Random bits 0b10 + version/variant 0x1E

    // Read back and verify
    expect(buffer[0]).toBe(0x12);
    expect(buffer[1]).toBe(0x34);
    expect(buffer[2]).toBe(0x56);
    expect(buffer[3]).toBe(0x78);
    expect(buffer[4]).toBe(0x9A);
    expect(buffer[5]).toBe(0xBC);

    const readSequence = ((buffer[6] & 0xFF) << 4) | ((buffer[7] >> 4) & 0x0F);
    expect(readSequence).toBe(0xDEF);
    expect(buffer[7] & 0x0F).toBe(seqRandomBits);

    expect(buffer[8]).toBe(0xAB);
    expect(buffer[9]).toBe(0xCD);
    expect(buffer[10]).toBe(0xEF);
    expect(buffer[11]).toBe(0x01);
    expect(buffer[12]).toBe(0x23);
    expect(buffer[13]).toBe(0x45);
    expect(buffer[14]).toBe(0x67);

    const byte15 = buffer[15];
    expect((byte15 & 0x3F)).toBe(0x1E);
  });

  /**
   * Test that random bits in byte 15 are preserved independently
   * Byte 15 = [bits7-6: random][bits5-0: version/variant]
   */
  it('should preserve random bits in byte 15 separately from version/variant', () => {
    const buffer = Buffer.alloc(16);

    // Test with random bits = 0b00
    buffer[15] = (0b00 << 6) | 0x1E;
    expect(buffer[15]).toBe(0x1E); // 0b00011110
    expect((buffer[15] & 0x3F)).toBe(0x1E);
    expect((buffer[15] >> 6) & 0x03).toBe(0b00);

    // Test with random bits = 0b01
    buffer[15] = (0b01 << 6) | 0x1E;
    expect(buffer[15]).toBe(0x5E); // 0b01011110
    expect((buffer[15] & 0x3F)).toBe(0x1E);
    expect((buffer[15] >> 6) & 0x03).toBe(0b01);

    // Test with random bits = 0b10
    buffer[15] = (0b10 << 6) | 0x1E;
    expect(buffer[15]).toBe(0x9E); // 0b10011110
    expect((buffer[15] & 0x3F)).toBe(0x1E);
    expect((buffer[15] >> 6) & 0x03).toBe(0b10);

    // Test with random bits = 0b11
    buffer[15] = (0b11 << 6) | 0x1E;
    expect(buffer[15]).toBe(0xDE); // 0b11011110
    expect((buffer[15] & 0x3F)).toBe(0x1E);
    expect((buffer[15] >> 6) & 0x03).toBe(0b11);
  });

  /**
   * Test that the version/variant encoding matches specification
   * Version 0x7 + Variant 0b10 should produce 0x1E (0b00011110)
   * Byte 15 layout: [bits7-6: random][bits5-2: version][bits1-0: variant]
   */
  it('should encode version 0x7 and variant 0b10 correctly', () => {
    // Build version/variant field: version (4 bits) + variant (2 bits)
    // Version 0x7 = 0b0111, Variant 0b10 = 0b10
    // Combined in bits 5-0: (version << 2) | variant = 0b00011110 = 0x1E
    const version = 0x7;
    const variant = 0b10;
    const versionVariant = (version << 2) | variant;

    expect(versionVariant).toBe(0x1E); // 0b00011110

    // Now pack into byte 15 with random bits
    const randomBits = 0b11;
    const byte15 = (randomBits << 6) | versionVariant;

    // Extract back
    expect(byte15 & 0x3F).toBe(0x1E);
    expect((byte15 & 0x3F) >> 2).toBe(version);
    expect(byte15 & 0x03).toBe(variant);
    expect((byte15 >> 6) & 0x03).toBe(randomBits);
  });
});
