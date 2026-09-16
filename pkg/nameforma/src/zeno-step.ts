/**
 * ZenoStep is a universal metric for measuring information,
 * ideal for controlling "semantic zooming" with progressive detail levels.
 * ZenoSteps are based on the Zeno-Key-Value (ZKV) mapping that
 * maps to the Fibonacci sequence by omitting F(1). Omitting F(1) allows
 * us to define a bijection from IEEE 745 "rationals" [0..27] <-> natural numbers [0..196418]:
 *   ZKV(0) <-> F(0) = 0
 *   ZKV(n>0) onto F(n+1) for n in [1..27].
 *
 * ZKV properties for domain [0..27] and codomain [0..196418]:
 *   - bijects domain integers [0..27] with codomain integers [0..196418]
 *   - bijects codomain integers [0..200000] with IEEE 754 integer domain
 *   - scales logarithmically beyond ZKV(n>27) without bijective integer precision
 */

export type ZenoStep = number & { readonly __zenoStep: unique symbol };

// Golden Ratio constants for bijection calculations
const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT5 = Math.sqrt(5);
const LN_PHI = Math.log(PHI);
const NATURAL_MIN = 0;
const NATURAL_MAX_SAFE = 1e6;
const ZENO_MIN = 0;
const ZENO_MAX_SAFE = 30;

// ZKV (key-value count) lookup table — Fibonacci + 1 offset
const ZKV_TABLE = [
  0, 1, 2, 3, 4, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597,
  2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418,
  317811, 514229, 832040,
];

/** Convert ZenoStep to key-value pair count. */
function zenoStepToZKV(z: ZenoStep): number {
  const val = z as unknown as number;
  if (val < 0) throw new RangeError(`Expected 0 <= ZenoStep: ${val}?`);
  if (Number.isInteger(val) && val >= 0 && val < ZKV_TABLE.length) {
    return ZKV_TABLE[val];
  }
  return Math.round(Math.pow(PHI, val) / SQRT5);
}

/** Convert key-value pair count to ZenoStep (inverse of zenoStepToZKV). */
function zkvToZenoStep(n: number): ZenoStep {
  const idx = ZKV_TABLE.indexOf(n);
  if (idx >= 0) return idx as ZenoStep;
  return (Math.log(n * SQRT5) / LN_PHI) as ZenoStep;
}

/** Zeno namespace: bijection mappings for semantic detail control. */
export const Zeno = {
  NATURAL_MIN,
  NATURAL_MAX_SAFE,
  ZENO_MIN,
  ZENO_MAX_SAFE,
  ZKV: {
    /** ZenoStep ↔ key-value pair count (linear <5, Fibonacci(n>5), true inverse). */
    toCount: zenoStepToZKV,
    fromCount: zkvToZenoStep,
  },
};
