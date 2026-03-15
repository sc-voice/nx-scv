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
    expect(u2.isGreaterThan(u1), `${u2.asV7()} should be > ${u1.asV7()}`);
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
  expect(versionByte === '7', `Version field should be 7, got ${versionByte}`);
});

// Test: Variant field is correct (RFC 9562, starts with 8-B)
it('variant field is RFC 9562 (8-B)', () => {
  const u = new UUID64();
  const variantByte = u.asV7().split('-')[3][0];
  expect(['8', '9', 'a', 'A', 'b', 'B'].includes(variantByte),
    `Variant field should be 8-B, got ${variantByte}`);
});

// Test: UUID string format
it('UUID string format is valid', () => {
  const u = new UUID64();
  const uuid = u.asV7();
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(pattern.test(uuid), `UUID ${uuid} does not match UUIDv7 format`);
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
    expect(uuids[i-1].isLessThan(uuids[i]),
      `UUID ${i-1} should be < UUID ${i}`);
  }
});

// Test: All UUIDs in burst are unique
it('all UUIDs in burst are unique (5000 calls)', () => {
  const uuids = [];
  for (let i = 0; i < 5000; i++) {
    uuids.push(new UUID64().asV7());
  }
  const unique = new Set(uuids);
  expect(unique.size === 5000, `Expected 5000 unique UUIDs, got ${unique.size}`);
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
  expect(u1.asV7() === u2.asV7(), 'UUID string should match after round-trip');

  // Round-trip via base64
  const u3 = UUID64.fromString(u1.base64);
  expect(u1.base64 === u3.base64, 'base64 should match after round-trip');
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

  invalidInputs.forEach(input => {
    expect(() => UUID64.fromString(input),
      `fromString('${input}') should throw`).toThrow();
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
  expect(!uuid1.isRelated(unrelated), 'uuid1 should not be related to unrelated');
  expect(!unrelated.isRelated(uuid1), 'unrelated should not be related to uuid1');

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

  expect(timestamp >= before && timestamp <= after,
    `UUID timestamp ${timestamp} should be between ${before} and ${after}`);
});

// Test: validate accepts valid UUID64 base64 string
it('validate accepts valid UUID64 base64 string', () => {
  const u = new UUID64();
  expect(UUID64.validate(u.base64), `${u.base64} should be valid UUID64`);
});

// Test: validate accepts valid UUID64 buffer
it('validate accepts valid UUID64 buffer', () => {
  const u = new UUID64();
  expect(UUID64.validate(u.uuidv7), `UUID buffer should be valid`);
});

// Test: validate rejects valid v7 UUID string (not base64)
it('validate rejects valid v7 UUID string (not base64)', () => {
  const v7string = uuidV7();
  expect(uuidValidate(v7string), 'External uuid should validate v7 string');
  expect(!UUID64.validate(v7string), 'UUIDv7 string format should be rejected');
});

// Test: validate rejects wrong length buffer
it('validate rejects wrong length buffer', () => {
  const wrongLength = Buffer.alloc(15);
  expect(!UUID64.validate(wrongLength), 'Buffer with 15 bytes should be rejected');
});

// Test: validate rejects wrong version
it('validate rejects wrong UUID version', () => {
  const u = new UUID64();
  const buffer = Buffer.from(u.uuidv7);
  // Change version from 7 to 4
  buffer[6] = (buffer[6] & 0x0f) | 0x40;
  expect(!UUID64.validate(buffer), 'UUID with version 4 should be rejected');
});

// Test: validate rejects wrong variant
it('validate rejects wrong variant bits', () => {
  const u = new UUID64();
  const buffer = Buffer.from(u.uuidv7);
  // Change variant from 0b10 to 0b11
  buffer[8] = (buffer[8] & 0x3f) | 0xc0;
  expect(!UUID64.validate(buffer), 'UUID with wrong variant should be rejected');
});

});
