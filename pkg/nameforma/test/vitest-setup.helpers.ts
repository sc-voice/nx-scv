import { expect } from 'vitest';

/**
 * Compare functions by source text instead of reference, so functions with
 * identical source (e.g. theme callbacks) are considered equal by toEqual().
 */
expect.addEqualityTesters([
  (a: unknown, b: unknown) =>
    typeof a === 'function' && typeof b === 'function'
      ? a.toString() === b.toString()
      : undefined,
]);
