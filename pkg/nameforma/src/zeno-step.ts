/**
 * The ZenoStep system introduces a scale for measuring information on a 
 * a logarithmic scale of number key-value pairs present in the information
 * being measured. The basis for the ZenoStep system is the Zeno-Key-Value (ZKV)
 * information scale. A ZenoStep is simply an integer ZKV value.
 * 
 * ZKV is a hybrid scale with an initial linear scale for n≤5 followed by
 * a logarithmic scale based on Binet's simplified approximation to the
 * Fibonacci sequence. The hybrid scale replaces the Fibonacci ambiguity (F(1) = F(2))
 * with a more pragmatic linear scale: 
 *   ZKV(0) <-> 0 key-value pairs
 *   ZKV(1) <-> 1 key-value pairs
 *   ZKV(2) <-> 2 key-value pairs
 *   ZKV(3) <-> 3 key-value pairs
 *   ZKV(4) <-> 4 key-value pairs
 *   ZKV(n≥5) <-> F(n) for n in [1..ZENO_MAX_SAFE].
 *
 * Formally, the ZKV scale is a mapping between a subset of the double precision 
 * (IEEE 754) domain and a natural number codomain that counts the number of 
 * key-value pairs present in the information being measured:
 * - ZKV is a bijection for domain integers [0..ZENO_MAX_SAFE] 
 * - ZKV is a bijection for codomain integers [0..NATURAL_MAX_SAFE]
 * - ZKV Fibonacci bijective codomain values map to IEEE 754 integer values (n≥5)
 * - ZKV non-Fibonacci codomain values map to IEEE 754 non-integer values (n>5)
 * - scales linearly for small values (n≤5)
 * - scales logarithmically using Binet simplified Fibonacci formula (n≥5)
 * - extends beyond NATURAL_MAX_SAFE without bijective integer precision
 */

export type ZenoStep = number & { readonly __zenoStep: unique symbol };

// Golden Ratio constants for bijection calculations
const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT5 = Math.sqrt(5);
const LN_PHI = Math.log(PHI);
const NATURAL_MIN = 0;
const NATURAL_MAX_SAFE = 1e6; // Arbitrary but verified limit
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
    /** ZenoStep ↔ key-value pair count (linear ≤5, Fibonacci(n≥5), true inverse). */
    toCount: zenoStepToZKV,
    fromCount: zkvToZenoStep,
  },
};
