import {
  describe,
  it,
  test,
  suite,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  onTestFailed,
  onTestFinished,
  recordArtifact,
  expect as vitestExpect,
  assert,
  should,
  vi,
  vitest,
  createExpect,
  assertType,
  expectTypeOf,
  bench,
  inject,
} from 'vitest';
import { addPropertiesExtension } from './src/properties.mjs';
import { addEqualityTestersExtension } from './src/equality-testers.mjs';

// Apply all extensions to expect
addPropertiesExtension(vitestExpect);
addEqualityTestersExtension(vitestExpect);

export {
  describe,
  it,
  test,
  suite,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  onTestFailed,
  onTestFinished,
  recordArtifact,
  assert,
  should,
  vi,
  vitest,
  createExpect,
  assertType,
  expectTypeOf,
  bench,
  inject,
};
export const expect = vitestExpect;

export default {
  describe,
  it,
  test,
  suite,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  onTestFailed,
  onTestFinished,
  recordArtifact,
  expect,
  assert,
  should,
  vi,
  vitest,
  createExpect,
  assertType,
  expectTypeOf,
  bench,
  inject,
};
