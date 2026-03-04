/**
 * Custom equality testers for vitest
 * Provides SC-Voice specific comparison logic
 */

/**
 * Compare functions by source code instead of reference
 * Functions with identical source code are considered equal
 */
function functionEqualityTester(a, b) {
  if (typeof a === 'function' && typeof b === 'function') {
    return a.toString() === b.toString();
  }
  return undefined;
}

/**
 * Add equality testers to vitest's expect
 * Registers custom comparators for specific types
 */
export function addEqualityTestersExtension(expect) {
  expect.addEqualityTesters([functionEqualityTester]);
}

export { functionEqualityTester };
