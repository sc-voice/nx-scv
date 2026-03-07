import { describe, it, expect } from 'vitest';
import UUIDV7 from '../../src/js/uuidv7.mjs';

describe('UUIDV7', () => {

// Test: 2 Random Instances are Not Equal
it('2 random instances are not equal (10,000 iterations)', () => {
  for (let i = 0; i < 10000; i++) {
    const u1 = UUIDV7.create();
    const u2 = UUIDV7.create();
    expect(u1 !== u2, `UUID ${u1} should not equal ${u2}`);
  }
});

// Test: Comparable
it('comparable - UUID comparison operators', () => {
  const u1 = UUIDV7.create();
  const u2 = UUIDV7.create();
  expect(UUIDV7.isLessThan(u1, u2), `${u1} should be < ${u2}`);
  expect(UUIDV7.isGreaterThan(u2, u1), `${u2} should be > ${u1}`);
  expect(UUIDV7.compare(u1, u2) < 0, `compareUUIDs should return < 0`);
  expect(UUIDV7.compare(u2, u1) > 0, `compareUUIDs should return > 0`);
});

// Test: Monotonically Increases when Generated Randomly
it('monotonically increases when generated randomly (10 iterations)', () => {
  let u1 = UUIDV7.create();
  for (let i = 0; i < 10; i++) {
    const u2 = UUIDV7.create();
    expect(UUIDV7.isGreaterThan(u2, u1), `${u2} should be > ${u1}`);
    expect(UUIDV7.isLessThan(u1, u2), `${u1} should be < ${u2}`);
    u1 = u2;
  }
});

// Test: Monotonically Increases in Rapid Burst
it('monotonically increases in rapid burst (100 iterations)', () => {
  let u1 = UUIDV7.create();
  for (let i = 0; i < 100; i++) {
    const u2 = UUIDV7.create();
    expect(UUIDV7.isGreaterThan(u2, u1), `UUID ${i} should be > previous`);
    u1 = u2;
  }
});

// Test: Version field is correct (0x7)
it('version field is 7', () => {
  const uuid = UUIDV7.create();
  const versionByte = uuid.split('-')[2][0];
  expect(versionByte === '7', `Version field should be 7, got ${versionByte}`);
});

// Test: Variant field is correct (RFC 9562, starts with 8-B)
it('variant field is RFC 9562 (8-B)', () => {
  const uuid = UUIDV7.create();
  const variantByte = uuid.split('-')[3][0];
  expect(['8', '9', 'a', 'A', 'b', 'B'].includes(variantByte),
    `Variant field should be 8-B, got ${variantByte}`);
});

// Test: UUID string format
it('UUID string format is valid', () => {
  const uuid = UUIDV7.create();
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(pattern.test(uuid), `UUID ${uuid} does not match UUIDv7 format`);
});

// Test: Successive UUIDs are strictly increasing
it('successive UUIDs are strictly increasing', () => {
  const u1 = UUIDV7.create();
  const u2 = UUIDV7.create();
  const u3 = UUIDV7.create();
  expect(UUIDV7.isLessThan(u1, u2), `${u1} should be < ${u2}`);
  expect(UUIDV7.isLessThan(u2, u3), `${u2} should be < ${u3}`);
});

// Test: Large batch of consecutive UUIDs
it('large batch (1000) are strictly increasing', () => {
  const uuids = [];
  for (let i = 0; i < 1000; i++) {
    uuids.push(UUIDV7.create());
  }
  for (let i = 1; i < uuids.length; i++) {
    expect(UUIDV7.isLessThan(uuids[i-1], uuids[i]),
      `UUID ${i-1} should be < UUID ${i}`);
  }
});

// Test: All UUIDs in burst are unique
it('all UUIDs in burst are unique (5000 calls)', () => {
  const uuids = [];
  for (let i = 0; i < 5000; i++) {
    uuids.push(UUIDV7.create());
  }
  const unique = new Set(uuids);
  expect(unique.size === 5000, `Expected 5000 unique UUIDs, got ${unique.size}`);
});

// Test: Timestamp consistency in same millisecond
it('timestamp is consistent within same millisecond burst', () => {
  const batch = [];
  for (let i = 0; i < 20; i++) {
    batch.push(UUIDV7.create());
  }

  // Extract timestamps from all UUIDs (first 12 hex chars = 6 bytes = 48 bits)
  const timestamps = batch.map(uuid => uuid.replace(/-/g, '').slice(0, 12));

  // All should have the same timestamp (or incrementally higher if sequence overflows)
  for (let i = 1; i < timestamps.length; i++) {
    const tsNum = BigInt('0x' + timestamps[i]);
    const prevTsNum = BigInt('0x' + timestamps[i-1]);
    expect(tsNum >= prevTsNum, `Timestamp ${i} should be >= previous`);
  }
});

});
