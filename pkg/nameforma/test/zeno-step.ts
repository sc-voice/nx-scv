import { describe, it, expect } from 'vitest';
import { Zeno, type ZenoStep } from '@sc-voice/nameforma';
import { DBG } from '../src/defines.js';

const {
  ZENO_MIN, // Minimum domain value
  ZENO_MAX_SAFE, // Maximum verified bijective domain integer value
  NATURAL_MIN, // Minimum codomain value
  NATURAL_MAX_SAFE, // Maximum verified bijective codomain integer value
} = Zeno;

describe('ZKV mapping', () => {
  const zkvTestCases = [
    [0, 0], // ZKV(0) = F(0)    null
    [1, 1], // ZKV(1) = F(1)    (id)
    [2, 2], // ZKV(2) = F(2)    (id, name)
    [3, 3], // ZKV(3) = F(3)    (zid, name, id)
    [4, 4], // ZKV(4) = F(4)    (zid, name, id, summary)
    [5, 5], // ZKV(N>4) = F(N)  (zid, name, id, summary, ...)
    [6, 8],
    [7, 13],
    [8, 21],
    [9, 34],
    [10, 55],
    [11, 89],
    [12, 144],
    [13, 233],
    [14, 377],
    [15, 610],
    [16, 987],
    [17, 1597],
    [18, 2584],
    [19, 4181],
    [20, 6765],
    [21, 10946],
    [22, 17711],
    [23, 28657],
    [24, 46368],
    [25, 75025],
    [26, 121393],
    [27, 196418],
    [28, 317811],
    [29, 514229],
    [30, 832040],
    [ZENO_MAX_SAFE, 832040],
  ] as const;

  it('test constants', () => {
    expect(ZENO_MIN).toBe(0);
    expect(ZENO_MAX_SAFE).toBe(30);
    expect(NATURAL_MIN).toBe(0);
    expect(NATURAL_MAX_SAFE).toBe(1000000);
  });

  it('zenoStepToZKV', () => {
    zkvTestCases.forEach(([z, kvCount]) => {
      const count = Zeno.ZKV.toCount(z as ZenoStep);
      expect(count).toBe(kvCount);
    });
  });

  it('zkvToZenoStep', () => {
    zkvTestCases.forEach(([z, kvCount]) => {
      const zeno = Zeno.ZKV.fromCount(kvCount);
      expect(zeno, `Zeno.ZKV.fromCount(${kvCount}) = ${z}`).toBe(z);
    });
  });

  it('verify ZKV bijection for all safe codomain values', () => {
    const limit = DBG.ZENO_STEP.VERIFY ? NATURAL_MAX_SAFE : 0;
    for (let i = 1; i < limit; i++) {
      const kvIn = i;
      const zeno = Zeno.ZKV.fromCount(kvIn);
      const kvZeno = Zeno.ZKV.toCount(zeno);
      const sZeno = JSON.parse(JSON.stringify(zeno));
      expect(sZeno).toBe(zeno);
      const kvOut = Zeno.ZKV.toCount(sZeno);
      expect(kvZeno).toEqual(kvIn);
      expect(kvOut).toEqual(kvIn);
    }
  }, 60000);
});
