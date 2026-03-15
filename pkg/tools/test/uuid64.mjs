import { describe, it, expect } from 'vitest';
import { UUID64 } from '../index.mjs';
import { v7 as uuidV7, validate as uuidValidate } from 'uuid';

describe('UUID64', () => {
  // Test: Constructor creates valid instance
  it('constructor creates valid instance', () => {
    const u = new UUID64();
    expect(u.uuidv7, 'uuidv7 should be a Buffer').toBeInstanceOf(Buffer);
    expect(u.uuidv7.length === 16, 'uuidv7 should be 16 bytes');
    expect(typeof u.base64 === 'string', 'base64 should be a string');
  });

  // Test: 2 Random Instances are Not Equal
  it('2 random instances are not equal (10,000 iterations)', () => {
    for (let i = 0; i < 10000; i++) {
      const u1 = new UUID64();
      const u2 = new UUID64();
      expect(u1.compare(u2) !== 0, `UUID ${i} should not equal next`);
    }
  });

  // Test: Comparable
  it('comparable - UUID comparison operators', () => {
    const u1 = new UUID64();
    const u2 = new UUID64();
    expect(u1.isLessThan(u2), `${u1.asV7()} should be < ${u2.asV7()}`);
    expect(u2.isGreaterThan(u1), `${u2.asV7()} should be > ${u1.asV7()}`);
    expect(u1.compare(u2) < 0, `compare should return < 0`);
    expect(u2.compare(u1) > 0, `compare should return > 0`);
  });

  // Test: Monotonically Increases when Generated Randomly
  it('monotonically increases when generated randomly (10 iterations)', () => {
    let u1 = new UUID64();
    for (let i = 0; i < 10; i++) {
      const u2 = new UUID64();
      expect(
        u2.isGreaterThan(u1),
        `${u2.asV7()} should be > ${u1.asV7()}`,
      );
      expect(u1.isLessThan(u2), `${u1.asV7()} should be < ${u2.asV7()}`);
      u1 = u2;
    }
  });

  // Test: Monotonically Increases in Rapid Burst
  it('monotonically increases in rapid burst (100 iterations)', () => {
    let u1 = new UUID64();
    for (let i = 0; i < 100; i++) {
      const u2 = new UUID64();
      expect(u2.isGreaterThan(u1), `UUID ${i} should be > previous`);
      u1 = u2;
    }
  });

  // Test: Version field is correct (0x7)
  it('version field is 7', () => {
    const u = new UUID64();
    const versionByte = u.asV7().split('-')[2][0];
    expect(
      versionByte === '7',
      `Version field should be 7, got ${versionByte}`,
    );
  });

  // Test: Variant field is correct (RFC 9562, starts with 8-B)
  it('variant field is RFC 9562 (8-B)', () => {
    const u = new UUID64();
    const variantByte = u.asV7().split('-')[3][0];
    expect(
      ['8', '9', 'a', 'A', 'b', 'B'].includes(variantByte),
      `Variant field should be 8-B, got ${variantByte}`,
    );
  });

  // Test: UUID string format
  it('UUID string format is valid', () => {
    const u = new UUID64();
    const uuid = u.asV7();
    const pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(
      pattern.test(uuid),
      `UUID ${uuid} does not match UUIDv7 format`,
    );
  });

  // Test: Successive UUIDs are strictly increasing
  it('successive UUIDs are strictly increasing', () => {
    const u1 = new UUID64();
    const u2 = new UUID64();
    const u3 = new UUID64();
    expect(u1.isLessThan(u2), `${u1.asV7()} should be < ${u2.asV7()}`);
    expect(u2.isLessThan(u3), `${u2.asV7()} should be < ${u3.asV7()}`);
  });

  // Test: Large batch of consecutive UUIDs
  it('large batch (1000) are strictly increasing', () => {
    const uuids = [];
    for (let i = 0; i < 1000; i++) {
      uuids.push(new UUID64());
    }
    for (let i = 1; i < uuids.length; i++) {
      expect(
        uuids[i - 1].isLessThan(uuids[i]),
        `UUID ${i - 1} should be < UUID ${i}`,
      );
    }
  });

  // Test: All UUIDs in burst are unique
  it('all UUIDs in burst are unique (5000 calls)', () => {
    const uuids = [];
    for (let i = 0; i < 5000; i++) {
      uuids.push(new UUID64().asV7());
    }
    const unique = new Set(uuids);
    expect(
      unique.size === 5000,
      `Expected 5000 unique UUIDs, got ${unique.size}`,
    );
  });

  // Test: base64 string is URL-safe
  it('base64 string is URL-safe (no +, /, =)', () => {
    const u = new UUID64();
    expect(!u.base64.includes('+'), 'base64 should not contain +');
    expect(!u.base64.includes('/'), 'base64 should not contain /');
    expect(!u.base64.includes('='), 'base64 should not contain padding');
  });

  // Test: fromString with UUID string
  it('fromString can parse UUID string', () => {
    const u1 = new UUID64();
    const uuidStr = u1.asV7();
    const u2 = UUID64.fromString(uuidStr);
    expect(u1.equals(u2), `fromString should recreate UUID from string`);
  });

  // Test: fromString with base64 string
  it('fromString can parse base64 string', () => {
    const u1 = new UUID64();
    const base64Str = u1.base64;
    const u2 = UUID64.fromString(base64Str);
    expect(u1.equals(u2), `fromString should recreate UUID from base64`);
  });

  // Test: fromString round-trip consistency
  it('fromString round-trip maintains consistency', () => {
    const u1 = new UUID64();

    // Round-trip via UUID string
    const u2 = UUID64.fromString(u1.asV7());
    expect(
      u1.asV7() === u2.asV7(),
      'UUID string should match after round-trip',
    );

    // Round-trip via base64
    const u3 = UUID64.fromString(u1.base64);
    expect(
      u1.base64 === u3.base64,
      'base64 should match after round-trip',
    );
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
      expect(
        () => UUID64.fromString(input),
        `fromString('${input}') should throw`,
      ).toThrow();
    });
  });

  // Test: isRelated identifies related UUIDs correctly
  it('isRelated identifies related UUIDs correctly', () => {
    const uuid1 = new UUID64();
    const uuid2 = UUID64.createRelation(uuid1);
    const uuid3 = UUID64.createRelation(uuid2);
    const unrelated = new UUID64();

    // All related UUIDs should identify as related (commutative)
    expect(uuid1.isRelated(uuid1), 'uuid1 should be related to itself');
    expect(uuid1.isRelated(uuid2), 'uuid1 should be related to uuid2');
    expect(uuid2.isRelated(uuid1), 'uuid2 should be related to uuid1');
    expect(uuid1.isRelated(uuid3), 'uuid1 should be related to uuid3');
    expect(uuid3.isRelated(uuid1), 'uuid3 should be related to uuid1');
    expect(uuid2.isRelated(uuid3), 'uuid2 should be related to uuid3');
    expect(uuid3.isRelated(uuid2), 'uuid3 should be related to uuid2');

    // Unrelated UUID should not be related
    expect(
      !uuid1.isRelated(unrelated),
      'uuid1 should not be related to unrelated',
    );
    expect(
      !unrelated.isRelated(uuid1),
      'unrelated should not be related to uuid1',
    );

    // Temporal ordering via compare
    expect(uuid1.compare(uuid2) < 0, 'uuid1 should be < uuid2');
    expect(uuid2.compare(uuid3) < 0, 'uuid2 should be < uuid3');
  });

  // Test: toDate extracts timestamp correctly
  it('toDate extracts timestamp correctly', () => {
    const before = Date.now();
    const uuid = new UUID64();
    const after = Date.now();

    const date = uuid.toDate();
    const timestamp = date.getTime();

    expect(
      timestamp >= before && timestamp <= after,
      `UUID timestamp ${timestamp} should be between ${before} and ${after}`,
    );
  });

  // Test: validate accepts valid UUID64 base64 string
  it('validate accepts valid UUID64 base64 string', () => {
    const u = new UUID64();
    expect(
      UUID64.validate(u.base64),
      `${u.base64} should be valid UUID64`,
    );
  });

  // Test: validate accepts valid UUID64 buffer
  it('validate accepts valid UUID64 buffer', () => {
    const u = new UUID64();
    expect(UUID64.validate(u.uuidv7), `UUID buffer should be valid`);
  });

  // Test: validate rejects valid v7 UUID string (not base64)
  it('validate rejects valid v7 UUID string (not base64)', () => {
    const v7string = uuidV7();
    expect(
      uuidValidate(v7string),
      'External uuid should validate v7 string',
    );
    expect(
      !UUID64.validate(v7string),
      'UUIDv7 string format should be rejected',
    );
  });

  // Test: validate rejects wrong length buffer
  it('validate rejects wrong length buffer', () => {
    const wrongLength = Buffer.alloc(15);
    expect(
      !UUID64.validate(wrongLength),
      'Buffer with 15 bytes should be rejected',
    );
  });

  // Test: validate rejects wrong version
  it('validate rejects wrong UUID version', () => {
    const u = new UUID64();
    const buffer = Buffer.from(u.uuidv7);
    // Change version from 7 to 4
    buffer[6] = (buffer[6] & 0x0f) | 0x40;
    expect(
      !UUID64.validate(buffer),
      'UUID with version 4 should be rejected',
    );
  });

  // Test: validate rejects wrong variant
  it('validate rejects wrong variant bits', () => {
    const u = new UUID64();
    const buffer = Buffer.from(u.uuidv7);
    // Change variant from 0b10 to 0b11
    buffer[8] = (buffer[8] & 0x3f) | 0xc0;
    expect(
      !UUID64.validate(buffer),
      'UUID with wrong variant should be rejected',
    );
  });

  // Test: fromBuffer creates instance from valid buffer
  it('fromBuffer creates instance from valid buffer', () => {
    const u1 = new UUID64();
    const u2 = UUID64.fromBuffer(u1.uuidv7);
    expect(u2.equals(u1), 'fromBuffer should recreate UUID from buffer');
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
      expect(
        () => UUID64.fromBuffer(input),
        `fromBuffer(${JSON.stringify(input)}) should throw`,
      ).toThrow();
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
      expect(
        () => UUID64.fromBuffer(buffer),
        `fromBuffer with ${buffer.length} bytes should throw`,
      ).toThrow();
    });
  });

  // Test: fromBuffer throws on invalid version
  it('fromBuffer throws on invalid version', () => {
    const u = new UUID64();
    const buffer = Buffer.from(u.uuidv7);
    // Change version from 7 to 4
    buffer[6] = (buffer[6] & 0x0f) | 0x40;
    expect(
      () => UUID64.fromBuffer(buffer),
      'fromBuffer should reject wrong version',
    ).toThrow();
  });

  // Test: fromBuffer throws on invalid variant
  it('fromBuffer throws on invalid variant', () => {
    const u = new UUID64();
    const buffer = Buffer.from(u.uuidv7);
    // Change variant from 0b10 to 0b11
    buffer[8] = (buffer[8] & 0x3f) | 0xc0;
    expect(
      () => UUID64.fromBuffer(buffer),
      'fromBuffer should reject wrong variant',
    ).toThrow();
  });

  // Test: fromBuffer and fromString create equivalent instances
  it('fromBuffer and fromString create equivalent instances', () => {
    const u1 = new UUID64();
    const u2 = UUID64.fromBuffer(u1.uuidv7);
    const u3 = UUID64.fromString(u1.asV7());
    const u4 = UUID64.fromString(u1.base64);
    expect(u1.equals(u2), 'fromBuffer should match original');
    expect(u1.equals(u3), 'fromString(uuid) should match original');
    expect(u1.equals(u4), 'fromString(base64) should match original');
    expect(u2.equals(u3), 'fromBuffer should match fromString(uuid)');
    expect(u2.equals(u4), 'fromBuffer should match fromString(base64)');
  });
});

// ============================================================================
// Avro Serialization Tests
// ============================================================================

describe('UUID64 Avro Serialization', () => {
  // Test: avroSchema is defined
  it('avroSchema is defined and correct', () => {
    expect(UUID64.avroSchema).toBeDefined();
    expect(
      UUID64.avroSchema.type === 'fixed',
      'schema type should be fixed',
    );
    expect(UUID64.avroSchema.size === 16, 'schema size should be 16');
    expect(
      UUID64.avroSchema.name === 'UUID64',
      'schema name should be UUID64',
    );
    expect(
      UUID64.avroSchema.logicalType === 'uuid64',
      'schema logicalType should be uuid64',
    );
  });

  // Test: toBuffer returns correct buffer
  it('toBuffer returns the underlying uuidv7 buffer', () => {
    const u = new UUID64();
    const buf = u.toBuffer();
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length === 16, 'toBuffer should return 16-byte buffer');
    expect(
      buf.equals(u.uuidv7),
      'toBuffer should return same buffer as uuidv7',
    );
  });

  // Test: fromAvroBuffer creates instance from buffer
  it('fromAvroBuffer creates instance from buffer', () => {
    const u1 = new UUID64();
    const u2 = UUID64.fromAvroBuffer(u1.uuidv7);
    expect(u2.equals(u1), 'fromAvroBuffer should recreate UUID');
  });

  // Test: Avro round-trip (serialize and deserialize)
  it('Avro round-trip preserves UUID value', () => {
    const u1 = new UUID64();

    // Simulate Avro serialization (buffer export)
    const serialized = u1.toBuffer();

    // Simulate Avro deserialization (buffer import)
    const u2 = UUID64.fromAvroBuffer(serialized);

    expect(
      u1.equals(u2),
      'UUID should be preserved after Avro round-trip',
    );
    expect(u1.asV7() === u2.asV7(), 'UUID string should match');
    expect(u1.base64 === u2.base64, 'base64 should match');
  });

  // Test: Multiple round-trips maintain consistency
  it('multiple Avro round-trips maintain consistency', () => {
    let uuid = new UUID64();

    for (let i = 0; i < 5; i++) {
      const serialized = uuid.toBuffer();
      uuid = UUID64.fromAvroBuffer(serialized);
    }

    const u1 = new UUID64();
    const buf1 = u1.toBuffer();
    const u2 = UUID64.fromAvroBuffer(buf1);
    const buf2 = u2.toBuffer();
    const u3 = UUID64.fromAvroBuffer(buf2);

    expect(u1.equals(u2), 'round-trip 1 should match');
    expect(u2.equals(u3), 'round-trip 2 should match');
    expect(u1.equals(u3), 'round-trip 1 and 3 should match');
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
    expect(typeof json === 'string', 'toJSON should return string');
    expect(json === u.base64, 'toJSON should return base64 value');
  });

  // Test: JSON.stringify serializes to base64
  it('JSON.stringify serializes UUID64 to base64 string', () => {
    const u = new UUID64();
    const json = JSON.stringify(u);
    expect(
      json === `"${u.base64}"`,
      'JSON.stringify should produce quoted base64',
    );
  });

  // Test: JSON roundtrip via fromString
  it('JSON serialization roundtrip via fromString', () => {
    const u1 = new UUID64();
    const json = JSON.stringify(u1);
    const base64Str = JSON.parse(json);
    const u2 = UUID64.fromString(base64Str);
    expect(u1.equals(u2), 'UUID should match after JSON roundtrip');
    expect(u1.base64 === u2.base64, 'base64 should match');
  });

  // Test: JSON serialization in objects
  it('JSON serialization works in object context', () => {
    const u = new UUID64();
    const obj = { id: u, timestamp: Date.now() };
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    expect(
      parsed.id === u.base64,
      'UUID should serialize as base64 in object',
    );
    expect(
      typeof parsed.timestamp === 'number',
      'timestamp should be preserved',
    );
  });

  // Test: Multiple UUIDs in array serialize correctly
  it('JSON serialization of UUID64 array', () => {
    const uuids = [new UUID64(), new UUID64(), new UUID64()];
    const json = JSON.stringify(uuids);
    console.log('uuid64 array:', json);
    const parsed = JSON.parse(json);
    expect(parsed.length === 3, 'array length should be preserved');
    expect(parsed[0] === uuids[0].base64, 'first UUID should match');
    expect(parsed[1] === uuids[1].base64, 'second UUID should match');
    expect(parsed[2] === uuids[2].base64, 'third UUID should match');
  });
});

// ============================================================================
// TimeId Tests
// ============================================================================

describe('UUID64 timeId', () => {
  // Test: timeId returns 11-character string
  it('timeId returns 11-character base64 prefix', () => {
    const u = new UUID64();
    const tid = u.timeId();
    expect(typeof tid === 'string', 'timeId should return string');
    expect(
      tid.length === 11,
      `timeId should be 11 chars, got ${tid.length}`,
    );
    expect(u.base64.startsWith(tid), 'timeId should be prefix of base64');
  });

  // Test: successive UUIDs have monotonically increasing timeId
  it('successive UUIDs have monotonically increasing timeId', () => {
    const u1 = new UUID64();
    const u2 = new UUID64();
    const u3 = new UUID64();
    expect(
      u1.timeId() < u2.timeId(),
      `${u1.timeId()} should be < ${u2.timeId()}`,
    );
    expect(
      u2.timeId() < u3.timeId(),
      `${u2.timeId()} should be < ${u3.timeId()}`,
    );
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
    expect(typeof iid === 'string', 'itemId should return string');
    expect(iid.length > 0, 'itemId should not be empty');
  });

  // Test: itemId returns order-preserving base64
  it('itemId returns order-preserving base64', () => {
    const u = new UUID64();
    const iid = u.itemId();
    const orderPreservingPattern = /^[0-9A-Za-z_-]*$/;
    expect(
      orderPreservingPattern.test(iid),
      `itemId should be order-preserving base64: ${iid}`,
    );
  });

  // Test: itemId lexicographic ordering matches numeric ordering
  it('itemId lexicographic order matches numeric order', () => {
    const u = new UUID64();
    const iid1 = u.itemId(1);
    const iid2 = u.itemId(2);
    const iid3 = u.itemId(3);
    console.log({iid1,iid2,iid3})

    expect(
      iid1 < iid2,
      `itemId(1)=${iid1} should be < itemId(2)=${iid2} (lexicographically)`,
    );
    expect(
      iid2 < iid3,
      `itemId(2)=${iid2} should be < itemId(3)=${iid3} (lexicographically)`,
    );
  });

  // Test: itemId with high basis
  it('itemId with high basis value', () => {
    const u = new UUID64();
    const iid = u.itemId(1000);
    expect(iid.length > 0, 'itemId(1000) should return non-empty string');
  });

  // Test: itemId respects width parameter - pads to minimum width
  it('itemId pads to minimum width', () => {
    const u = new UUID64();
    const iid = u.itemId(1, 5);
    expect(
      iid.length >= 5,
      `itemId(1, 5) should have length >= 5, got ${iid.length}`,
    );
  });

  // Test: itemId with width=1 strips all leading zeros except one
  it('itemId with width=1 strips leading zeros', () => {
    const u = new UUID64();
    const iid = u.itemId(1, 1);
    expect(iid.length > 0, 'itemId(1, 1) should return non-empty string');
    // Should not have all zeros
    expect(iid !== '0', 'itemId should not be just "0"');
  });

  // Test: itemId width parameter default is 3
  it('itemId width parameter defaults to 3', () => {
    const u = new UUID64();
    const iid_default = u.itemId(1);
    const iid_explicit = u.itemId(1, 3);
    expect(
      iid_default.length === iid_explicit.length,
      'default width should be 3',
    );
  });

  // Test: itemId with different widths produces different formats
  it('itemId with different widths produces correct lengths', () => {
    const u = new UUID64();
    const iid1 = u.itemId(1, 1);
    const iid3 = u.itemId(1, 3);
    const iid5 = u.itemId(1, 5);

    expect(
      iid1.length <= iid3.length,
      'width=1 should be <= width=3',
    );
    expect(
      iid3.length <= iid5.length,
      'width=3 should be <= width=5',
    );
  });
});

// ============================================================================
// Order-Preserving Base64 Conversion Tests
// ============================================================================

describe('UUID64 OPB64 Conversions', () => {
  // Test: OPB64 lexicographic ordering matches numeric ordering
  it('OPB64 lexicographic ordering matches numeric ordering', () => {
    // Create buffers with increasing numeric values
    const buf1 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
    const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02]);
    const buf3 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0A]);

    const opb64_1 = UUID64.toOrderPreservingBase64(buf1);
    const opb64_2 = UUID64.toOrderPreservingBase64(buf2);
    const opb64_3 = UUID64.toOrderPreservingBase64(buf3);

    expect(
      opb64_1 < opb64_2,
      `OPB64(1)=${opb64_1} should be < OPB64(2)=${opb64_2} (lexicographically)`,
    );
    expect(
      opb64_2 < opb64_3,
      `OPB64(2)=${opb64_2} should be < OPB64(10)=${opb64_3} (lexicographically)`,
    );
  });

  // Test: stringToOPB64 encodes string
  it('stringToOPB64 encodes string to OPB64', () => {
    const str = 'hello';
    const opb64 = UUID64.stringToOPB64(str);
    expect(typeof opb64 === 'string', 'stringToOPB64 should return string');
    expect(opb64.length > 0, 'OPB64 should not be empty');
  });

  // Test: stringFromOPB64 decodes back to original
  it('stringFromOPB64 decodes OPB64 back to original string', () => {
    const original = 'hello world';
    const opb64 = UUID64.stringToOPB64(original);
    const decoded = UUID64.stringFromOPB64(opb64);
    expect(decoded === original, `roundtrip should preserve string: ${decoded} === ${original}`);
  });

  // Test: OPB64 roundtrip with UTF-8 characters
  it('OPB64 roundtrip with UTF-8 characters', () => {
    const original = 'hello 世界 🌍';
    const opb64 = UUID64.stringToOPB64(original);
    const decoded = UUID64.stringFromOPB64(opb64);
    expect(decoded === original, 'UTF-8 roundtrip should preserve string');
  });

  // Test: OPB64 uses only valid characters
  it('OPB64 uses only valid base64 characters', () => {
    const str = 'test string';
    const opb64 = UUID64.stringToOPB64(str);
    const validPattern = /^[0-9A-Za-z_-]*$/;
    expect(validPattern.test(opb64), `OPB64 should use valid chars: ${opb64}`);
  });

  // Test: stringFromOPB64 throws on invalid character
  it('stringFromOPB64 throws on invalid OPB64 character', () => {
    const invalidOPB64 = 'hello+world'; // + is not in OPB64 alphabet
    expect(() => UUID64.stringFromOPB64(invalidOPB64),
      'stringFromOPB64 should throw on invalid character').toThrow();
  });

  // Test: multiple strings encode to different OPB64
  it('different strings encode to different OPB64', () => {
    const str1 = 'hello';
    const str2 = 'world';
    const opb64_1 = UUID64.stringToOPB64(str1);
    const opb64_2 = UUID64.stringToOPB64(str2);
    expect(opb64_1 !== opb64_2, 'different strings should encode differently');
  });

  // Test: empty string roundtrip
  it('empty string roundtrip', () => {
    const original = '';
    const opb64 = UUID64.stringToOPB64(original);
    const decoded = UUID64.stringFromOPB64(opb64);
    expect(decoded === original, 'empty string roundtrip should work');
  });
});
