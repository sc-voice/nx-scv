import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import { v7 as uuidv7 } from 'uuid';

describe('UUID64', () => {
  // Test: Constructor creates valid instance
  it('constructor creates valid instance', () => {
    const u = new UUID64();
    expect(u.uuidv7).toBeInstanceOf(Buffer);
    expect(u.uuidv7.length).toBe(16);
    expect(typeof u.base64).toBe('string');
  });

  // Test: 2 Random Instances are Not Equal
  it('2 random instances are not equal (10,000 iterations)', () => {
    for (let i = 0; i < 10000; i++) {
      const u1 = new UUID64();
      const u2 = new UUID64();
      expect(u1.compare(u2) !== 0).toBe(true);
    }
  });

  // Test: Comparable
  it('comparable - UUID comparison operators', () => {
    const u1 = new UUID64();
    const u2 = new UUID64();
    expect(u1.isLessThan(u2)).toBe(true);
    expect(u2.isGreaterThan(u1)).toBe(true);
    expect(u1.compare(u2) < 0).toBe(true);
    expect(u2.compare(u1) > 0).toBe(true);
  });

  // Test: Monotonically Increases when Generated Randomly
  it('monotonically increases when generated randomly (10 iterations)', () => {
    let u1 = new UUID64();
    for (let i = 0; i < 10; i++) {
      const u2 = new UUID64();
      expect(u2.isGreaterThan(u1)).toBe(true);
      expect(u1.isLessThan(u2)).toBe(true);
      u1 = u2;
    }
  });

  // Test: Monotonically Increases in Rapid Burst
  it('monotonically increases in rapid burst (100 iterations)', () => {
    let u1 = new UUID64();
    for (let i = 0; i < 100; i++) {
      const u2 = new UUID64();
      expect(u2.isGreaterThan(u1)).toBe(true);
      u1 = u2;
    }
  });

  // Test: UUID string format
  it('UUID string format is valid', () => {
    const u = new UUID64();
    const uuid = u.asV7();
    const pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(pattern.test(uuid)).toBe(true);
  });

  // Test: Successive UUIDs are strictly increasing
  it('successive UUIDs are strictly increasing', () => {
    const u1 = new UUID64();
    const u2 = new UUID64();
    const u3 = new UUID64();
    expect(u1.isLessThan(u2)).toBe(true);
    expect(u2.isLessThan(u3)).toBe(true);
  });

  // Test: Large batch of consecutive UUIDs
  it('large batch (1000) are strictly increasing', () => {
    const uuids = [];
    for (let i = 0; i < 1000; i++) {
      uuids.push(new UUID64());
    }
    for (let i = 1; i < uuids.length; i++) {
      expect(uuids[i - 1].isLessThan(uuids[i])).toBe(true);
    }
  });

  // Test: All UUIDs in burst are unique
  it('all UUIDs in burst are unique (5000 calls)', () => {
    const uuids = [];
    for (let i = 0; i < 5000; i++) {
      uuids.push(new UUID64().asV7());
    }
    const unique = new Set(uuids);
    expect(unique.size).toBe(5000);
  });

  // Test: base64 string is URL-safe
  it('base64 string is URL-safe (no +, /, =)', () => {
    const u = new UUID64();
    expect(u.base64.includes('+')).toBe(false);
    expect(u.base64.includes('/')).toBe(false);
    expect(u.base64.includes('=')).toBe(false);
  });

  // Test: fromString with UUID string
  it('fromString can parse UUID string', () => {
    const u1 = new UUID64();
    const uuidStr = u1.asV7();
    const u2 = UUID64.fromString(uuidStr);
    expect(u1.equals(u2)).toBe(true);
  });

  // Test: fromString with base64 string
  it('fromString can parse base64 string', () => {
    const u1 = new UUID64();
    const base64Str = u1.base64;
    const u2 = UUID64.fromString(base64Str);
    expect(u1.equals(u2)).toBe(true);
  });

  // Test: fromString round-trip consistency
  it('fromString round-trip maintains consistency', () => {
    const u1 = new UUID64();

    // Round-trip via UUID string
    const u2 = UUID64.fromString(u1.asV7());
    expect(u1.asV7()).toBe(u2.asV7());

    // Round-trip via base64
    const u3 = UUID64.fromString(u1.base64);
    expect(u1.base64).toBe(u3.base64);
  });

  // Test: fromString throws on invalid UUID
  it('fromString throws on invalid UUID input', () => {
    const invalidInputs = [
      'not-a-uuid',
      '00000000-0000-0000-0000-000000000000', // nil UUID (wrong version)
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // invalid hex
      'invalidbase64!!!', // invalid base64
      '', // empty string
    ];

    invalidInputs.forEach((input) => {
      expect(() => UUID64.fromString(input)).toThrow();
    });
  });

  // Test: isRelated identifies related UUIDs correctly
  it('isRelated identifies related UUIDs correctly', () => {
    const uuid1 = new UUID64();
    const uuid2 = UUID64.createRelatedId(uuid1);
    const uuid3 = UUID64.createRelatedId(uuid2);
    const unrelated = new UUID64();

    // All related UUIDs should identify as related (commutative)
    expect(uuid1.isRelated(uuid1)).toBe(true);
    expect(uuid1.isRelated(uuid2)).toBe(true);
    expect(uuid2.isRelated(uuid1)).toBe(true);
    expect(uuid1.isRelated(uuid3)).toBe(true);
    expect(uuid3.isRelated(uuid1)).toBe(true);
    expect(uuid2.isRelated(uuid3)).toBe(true);
    expect(uuid3.isRelated(uuid2)).toBe(true);

    // Unrelated UUID should not be related
    expect(uuid1.isRelated(unrelated)).toBe(false);
    expect(unrelated.isRelated(uuid1)).toBe(false);

    // Temporal ordering via compare
    expect(uuid1.compare(uuid2) < 0).toBe(true);
    expect(uuid2.compare(uuid3) < 0).toBe(true);
  });

  // Test: toDate extracts timestamp correctly
  it('toDate extracts timestamp correctly', () => {
    const before = Date.now();
    const uuid = new UUID64();
    const after = Date.now();

    const date = uuid.toDate();
    const timestamp = date.getTime();

    expect(timestamp >= before && timestamp <= after).toBe(true);
  });

  // Test: validate accepts valid UUID64 base64 string
  it('validate accepts valid UUID64 base64 string', () => {
    const u = new UUID64();
    expect(UUID64.validate(u.base64)).toBe(true);
  });

  // Test: validate accepts valid UUID64 buffer
  it('validate accepts valid UUID64 buffer', () => {
    const u = new UUID64();
    expect(UUID64.validate(u.uuidv7)).toBe(true);
  });

  // Test: validate rejects wrong length buffer
  it('validate rejects wrong length buffer', () => {
    const wrongLength = Buffer.alloc(15);
    expect(UUID64.validate(wrongLength)).toBe(false);
  });

  // Test: fromBuffer creates instance from valid buffer
  it('fromBuffer creates instance from valid buffer', () => {
    const u1 = new UUID64();
    const u2 = UUID64.fromBuffer(u1.uuidv7);
    expect(u2.equals(u1)).toBe(true);
  });

  // Test: fromBuffer throws on non-Buffer input
  it('fromBuffer throws on non-Buffer input', () => {
    const invalidInputs = [
      'not-a-buffer',
      null,
      undefined,
      123,
      { length: 16 },
      [],
    ];

    invalidInputs.forEach((input) => {
      expect(() => UUID64.fromBuffer(input as any)).toThrow();
    });
  });

  // Test: fromBuffer throws on wrong length buffer
  it('fromBuffer throws on wrong length buffer', () => {
    const wrongLengths = [
      Buffer.alloc(0),
      Buffer.alloc(15),
      Buffer.alloc(17),
      Buffer.alloc(32),
    ];

    wrongLengths.forEach((buffer) => {
      expect(() => UUID64.fromBuffer(buffer)).toThrow();
    });
  });

  // Test: fromBuffer and fromString create equivalent instances
  it('fromBuffer and fromString create equivalent instances', () => {
    const u1 = new UUID64();
    const u2 = UUID64.fromBuffer(u1.uuidv7);
    const u3 = UUID64.fromString(u1.asV7());
    const u4 = UUID64.fromString(u1.base64);
    expect(u1.equals(u2)).toBe(true);
    expect(u1.equals(u3)).toBe(true);
    expect(u1.equals(u4)).toBe(true);
    expect(u2.equals(u3)).toBe(true);
    expect(u2.equals(u4)).toBe(true);
  });
});

// ============================================================================
// Avro Serialization Tests
// ============================================================================

describe('UUID64 Avro Serialization', () => {
  // Test: avroSchema is defined
  it('avroSchema is defined and correct', () => {
    expect(UUID64.avroSchema).toBeDefined();
    expect(UUID64.avroSchema.type).toBe('record');
    expect(UUID64.avroSchema.name).toBe('UUID64');
    expect(UUID64.avroSchema.namespace).toBe('scvoice.nameforma');
    expect(UUID64.avroSchema.fields).toBeDefined();
    expect(UUID64.avroSchema.fields.length).toBe(1);
    expect(UUID64.avroSchema.fields[0].name).toBe('uuidv7');
    expect(UUID64.avroSchema.fields[0].type).toBe('bytes');
  });

  // Test: toBuffer returns correct buffer
  it('toBuffer returns the underlying uuidv7 buffer', () => {
    const u = new UUID64();
    const buf = u.toBuffer();
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(16);
    expect(buf.equals(u.uuidv7)).toBe(true);
  });

  // Test: fromAvroBuffer creates instance from buffer
  it('fromAvroBuffer creates instance from buffer', () => {
    const u1 = new UUID64();
    const u2 = UUID64.fromAvroBuffer(u1.uuidv7);
    expect(u2.equals(u1)).toBe(true);
  });

  // Test: Avro round-trip (serialize and deserialize)
  it('Avro round-trip preserves UUID value', () => {
    const u1 = new UUID64();

    // Simulate Avro serialization (buffer export)
    const serialized = u1.toBuffer();

    // Simulate Avro deserialization (buffer import)
    const u2 = UUID64.fromAvroBuffer(serialized);

    expect(u1.equals(u2)).toBe(true);
    expect(u1.asV7()).toBe(u2.asV7());
    expect(u1.base64).toBe(u2.base64);
  });

  // Test: Multiple round-trips maintain consistency
  it('multiple Avro round-trips maintain consistency', () => {
    const u1 = new UUID64();
    const buf1 = u1.toBuffer();
    const u2 = UUID64.fromAvroBuffer(buf1);
    const buf2 = u2.toBuffer();
    const u3 = UUID64.fromAvroBuffer(buf2);

    expect(u1.equals(u2)).toBe(true);
    expect(u2.equals(u3)).toBe(true);
    expect(u1.equals(u3)).toBe(true);
  });

  // Test: UUIDv7 ↔ UUID64 buffer roundtrip conversion with genuine v7 UUID
  it('UUIDv7 buffer roundtrip: v7 → uuid64 → v7 (genuine RFC 4122 v7)', () => {
    // Generate genuine UUIDv7 from uuid package
    const genuineUUIDv7String = uuidv7();
    const genuineUUIDv7Buffer = UUID64.uuidStringToBytes(genuineUUIDv7String);

    // Convert UUIDv7 → UUID64
    const uuid64Buffer = UUID64.toUUID64Buffer(genuineUUIDv7Buffer);

    // Verify UUID64 format (byte 15 bits 5-0 should be 0x1E)
    expect((uuid64Buffer[15] & 0x3f)).toBe(0x1e);

    // Convert UUID64 → UUIDv7
    const recoveredUUIDv7 = UUID64.toUUIDV7Buffer(uuid64Buffer);

    // Should match original exactly
    expect(recoveredUUIDv7.equals(genuineUUIDv7Buffer)).toBe(true);

    // All bytes should be identical
    for (let i = 0; i < 16; i++) {
      expect(recoveredUUIDv7[i]).toBe(genuineUUIDv7Buffer[i]);
    }
  });

  // Test: Multiple roundtrip conversions maintain integrity
  it('multiple roundtrips maintain UUID64 integrity (genuine v7)', () => {
    const genuineUUIDv7String = uuidv7();
    let currentUUIDv7 = UUID64.uuidStringToBytes(genuineUUIDv7String);
    const originalUUIDv7 = Buffer.from(currentUUIDv7);

    for (let i = 0; i < 5; i++) {
      const uuid64 = UUID64.toUUID64Buffer(currentUUIDv7);
      currentUUIDv7 = UUID64.toUUIDV7Buffer(uuid64);
      expect(currentUUIDv7.equals(originalUUIDv7)).toBe(true);
    }
  });
});

// ============================================================================
// JSON Serialization Tests
// ============================================================================

describe('UUID64 JSON Serialization', () => {
  // Test: toJSON returns base64 string
  it('toJSON returns base64 string', () => {
    const u = new UUID64();
    const json = u.toJSON();
    expect(typeof json).toBe('string');
    expect(json).toBe(u.base64);
  });

  // Test: JSON.stringify serializes to base64
  it('JSON.stringify serializes UUID64 to base64 string', () => {
    const u = new UUID64();
    const json = JSON.stringify(u);
    expect(json).toBe(`"${u.base64}"`);
  });

  // Test: JSON roundtrip via fromString
  it('JSON serialization roundtrip via fromString', () => {
    const u1 = new UUID64();
    const json = JSON.stringify(u1);
    const base64Str = JSON.parse(json);
    const u2 = UUID64.fromString(base64Str);
    expect(u1.equals(u2)).toBe(true);
    expect(u1.base64).toBe(u2.base64);
  });

  // Test: JSON serialization in objects
  it('JSON serialization works in object context', () => {
    const u = new UUID64();
    const obj = { id: u, timestamp: Date.now() };
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(u.base64);
    expect(typeof parsed.timestamp).toBe('number');
  });

  // Test: Multiple UUIDs in array serialize correctly
  it('JSON serialization of UUID64 array', () => {
    const uuids = [new UUID64(), new UUID64(), new UUID64()];
    const json = JSON.stringify(uuids);
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(3);
    expect(parsed[0]).toBe(uuids[0].base64);
    expect(parsed[1]).toBe(uuids[1].base64);
    expect(parsed[2]).toBe(uuids[2].base64);
  });
});

// ============================================================================
// TimeId Tests
// ============================================================================

describe('UUID64 timeId', () => {
  // Test: timeId returns prefix string
  it('timeId returns base64 prefix', () => {
    const u = new UUID64();
    const tid = u.timeId();
    expect(typeof tid).toBe('string');
    expect(u.base64.startsWith(tid)).toBe(true);
  });

  // Test: successive UUIDs have monotonically increasing timeId
  it('successive UUIDs have monotonically increasing timeId', () => {
    const u1 = new UUID64();
    const u2 = new UUID64();
    const u3 = new UUID64();
    expect(u1.timeId() < u2.timeId()).toBe(true);
    expect(u2.timeId() < u3.timeId()).toBe(true);
  });
});

// ============================================================================
// ItemId Tests
// ============================================================================

describe('UUID64 itemId', () => {
  // Test: itemId returns base64 string
  it('itemId returns base64 string', () => {
    const u = new UUID64();
    const iid = u.itemId();
    expect(typeof iid).toBe('string');
    expect(iid.length > 0).toBe(true);
  });

  // Test: itemId returns order-preserving base64
  it('itemId returns order-preserving base64', () => {
    const u = new UUID64();
    const iid = u.itemId();
    const orderPreservingPattern = /^[0-9A-Za-z_-]*$/;
    expect(orderPreservingPattern.test(iid)).toBe(true);
  });

  // Test: itemId lexicographic ordering matches numeric ordering
  it('itemId lexicographic order matches numeric order', () => {
    const u = new UUID64();
    const iid1 = u.itemId(1);
    const iid2 = u.itemId(2);
    const iid3 = u.itemId(3);

    expect(iid1 < iid2).toBe(true);
    expect(iid2 < iid3).toBe(true);
  });

  // Test: itemId with high basis
  it('itemId with high basis value', () => {
    const u = new UUID64();
    const iid = u.itemId(1000);
    expect(iid.length > 0).toBe(true);
  });

  // Test: itemId respects width parameter - pads to minimum width
  it('itemId pads to minimum width', () => {
    const u = new UUID64();
    const iid = u.itemId(1, 5);
    expect(iid.length >= 5).toBe(true);
  });

  // Test: itemId with width=1 strips all leading zeros except one
  it('itemId with width=1 strips leading zeros', () => {
    const u = new UUID64();
    const iid = u.itemId(1, 1);
    expect(iid.length > 0).toBe(true);
    expect(iid !== '0').toBe(true);
  });

  // Test: itemId width parameter default is 3
  it('itemId width parameter defaults to 3', () => {
    const u = new UUID64();
    const iid_default = u.itemId(1);
    const iid_explicit = u.itemId(1, 3);
    expect(iid_default.length).toBe(iid_explicit.length);
  });

  // Test: itemId with different widths produces different formats
  it('itemId with different widths produces correct lengths', () => {
    const u = new UUID64();
    const iid1 = u.itemId(1, 1);
    const iid3 = u.itemId(1, 3);
    const iid5 = u.itemId(1, 5);

    expect(iid1.length <= iid3.length).toBe(true);
    expect(iid3.length <= iid5.length).toBe(true);
  });
});

// ============================================================================
// Order-Preserving Base64 Conversion Tests
// ============================================================================

describe('UUID64 OPB64 Conversions', () => {
  // Test: OPB64 lexicographic ordering matches numeric ordering
  it('OPB64 lexicographic ordering matches numeric ordering', () => {
    const buf1 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
    const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02]);
    const buf3 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a]);

    const opb64_1 = UUID64.toOrderPreservingBase64(buf1);
    const opb64_2 = UUID64.toOrderPreservingBase64(buf2);
    const opb64_3 = UUID64.toOrderPreservingBase64(buf3);

    expect(opb64_1 < opb64_2).toBe(true);
    expect(opb64_2 < opb64_3).toBe(true);
  });

  // Test: stringToOPB64 encodes string
  it('stringToOPB64 encodes string to OPB64', () => {
    const str = 'hello';
    const opb64 = UUID64.stringToOPB64(str);
    expect(typeof opb64).toBe('string');
    expect(opb64.length > 0).toBe(true);
  });

  // Test: stringFromOPB64 decodes back to original
  it('stringFromOPB64 decodes OPB64 back to original string', () => {
    const original = 'hello world';
    const opb64 = UUID64.stringToOPB64(original);
    const decoded = UUID64.stringFromOPB64(opb64);
    expect(decoded).toBe(original);
  });

  // Test: OPB64 roundtrip with UTF-8 characters
  it('OPB64 roundtrip with UTF-8 characters', () => {
    const original = 'hello 世界 🌍';
    const opb64 = UUID64.stringToOPB64(original);
    const decoded = UUID64.stringFromOPB64(opb64);
    expect(decoded).toBe(original);
  });

  // Test: OPB64 uses only valid characters
  it('OPB64 uses only valid base64 characters', () => {
    const str = 'test string';
    const opb64 = UUID64.stringToOPB64(str);
    const validPattern = /^[0-9A-Za-z_-]*$/;
    expect(validPattern.test(opb64)).toBe(true);
  });

  // Test: stringFromOPB64 throws on invalid character
  it('stringFromOPB64 throws on invalid OPB64 character', () => {
    const invalidOPB64 = 'hello+world'; // + is not in OPB64 alphabet
    expect(() => UUID64.stringFromOPB64(invalidOPB64)).toThrow();
  });

  // Test: multiple strings encode to different OPB64
  it('different strings encode to different OPB64', () => {
    const str1 = 'hello';
    const str2 = 'world';
    const opb64_1 = UUID64.stringToOPB64(str1);
    const opb64_2 = UUID64.stringToOPB64(str2);
    expect(opb64_1 !== opb64_2).toBe(true);
  });

  // Test: empty string roundtrip
  it('empty string roundtrip', () => {
    const original = '';
    const opb64 = UUID64.stringToOPB64(original);
    const decoded = UUID64.stringFromOPB64(opb64);
    expect(decoded).toBe(original);
  });
});
