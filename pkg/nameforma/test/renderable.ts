import { describe, it, expect } from '@sc-voice/vitest';
import {
  ZenoStep,
  zenoStep,
  ZenoCoord,
  zenoStepToDetail,
  detailToZenoStep,
  zenoStepToLines,
} from '../src/navigable-view.js';

const MAX = ZenoCoord.MAX_ZENO_STEP;

describe('renderable', () => {
  describe('ZenoStep', () => {
    it('creates valid ZenoStep from non-negative integer', () => {
      expect(zenoStep(0)).toBe(0);
      expect(zenoStep(5)).toBe(5);
      expect(zenoStep(MAX)).toBe(MAX);
    });

    it('throws on too big integer', () => {
      expect(() => zenoStep(MAX + 1)).toThrow(RangeError);
    });

    it('throws on negative integer', () => {
      expect(() => zenoStep(-1)).toThrow(RangeError);
    });

    it('throws on non-integer', () => {
      expect(() => zenoStep(3.5)).toThrow(RangeError);
    });

    it('throws on NaN', () => {
      expect(() => zenoStep(NaN)).toThrow(RangeError);
    });
  });

  describe('ZenoCoord', () => {
    it('holds anchor and pivot ZenoSteps', () => {
      const coord = new ZenoCoord(zenoStep(3), zenoStep(7));
      expect(coord.anchorStep).toBe(3);
      expect(coord.pivotStep).toBe(7);
    });

    it('toRenderDetail at (0,0) returns 0', () => {
      const coord = new ZenoCoord(zenoStep(0), zenoStep(0));
      expect(coord.toRenderDetail()).toBe(0);
    });

    it('toRenderDetail at (MAX,0) returns ZenoDetail[MAX]', () => {
      const coord = new ZenoCoord(zenoStep(MAX), zenoStep(0));
      expect(coord.toRenderDetail()).toBe(zenoStepToDetail(zenoStep(MAX)));
    });

    it('toRenderDetail increases as pivot increases', () => {
      const anchor = zenoStep(5);
      const d0 = new ZenoCoord(anchor, zenoStep(0)).toRenderDetail();
      const d5 = new ZenoCoord(anchor, zenoStep(5)).toRenderDetail();
      const dMAX = new ZenoCoord(anchor, zenoStep(MAX)).toRenderDetail();
      expect(d5).toBeGreaterThan(d0);
      expect(dMAX).toBeGreaterThan(d5);
    });

    it('toRenderDetail increases as anchor increases', () => {
      const pivot = zenoStep(0);
      const d0 = new ZenoCoord(zenoStep(0), pivot).toRenderDetail();
      const d5 = new ZenoCoord(zenoStep(5), pivot).toRenderDetail();
      const dMAX = new ZenoCoord(zenoStep(MAX), pivot).toRenderDetail();
      expect(d5).toBeGreaterThan(d0);
      expect(dMAX).toBeGreaterThan(d5);
    });

    it('toRenderDetail result is in [0,1)', () => {
      for (let a = 0; a <= MAX; a++) {
        for (let p = 0; p <= MAX; p++) {
          const d = new ZenoCoord(zenoStep(a), zenoStep(p)).toRenderDetail();
          expect(d).toBeGreaterThanOrEqual(0);
          expect(d).toBeLessThan(1);
        }
      }
    });

    it('fromRenderDetail at 0 returns (0,0)', () => {
      const coord = ZenoCoord.fromRenderDetail(0);
      expect(coord.anchorStep).toBe(0);
      expect(coord.pivotStep).toBe(0);
    });

    it('fromRenderDetail recovers anchor and pivot exactly for all (a,p) pairs', () => {
      for (let a = 0; a <= MAX; a++) {
        for (let p = 0; p <= MAX; p++) {
          const detail = new ZenoCoord(zenoStep(a), zenoStep(p)).toRenderDetail();
          const coord = ZenoCoord.fromRenderDetail(detail);
          expect(coord.anchorStep).toBe(a);
          expect(coord.pivotStep).toBe(p);
        }
      }
    });

    it('fromRenderDetail clamps detail < 0 to (0,0)', () => {
      const coord = ZenoCoord.fromRenderDetail(-0.5);
      expect(coord.anchorStep).toBe(0);
      expect(coord.pivotStep).toBe(0);
    });

    it('fromRenderDetail clamps detail >= 1 to (MAX,MAX)', () => {
      const coord = ZenoCoord.fromRenderDetail(1.5);
      expect(coord.anchorStep).toBe(MAX);
      expect(coord.pivotStep).toBe(MAX);
    });
  });

  describe('zenoStepToDetail', () => {
    it('follows formula 1-(8/13)^n', () => {
      for (let n = 0; n <= MAX; n++) {
        const expected = 1 - Math.pow(8/13, n);
        expect(zenoStepToDetail(zenoStep(n))).toBeCloseTo(expected, 10);
      }
    });

    it('starts at 0 and converges toward 1', () => {
      expect(zenoStepToDetail(zenoStep(0))).toBeCloseTo(0, 5);
      expect(zenoStepToDetail(zenoStep(MAX))).toBeCloseTo(1, 3);
    });

    it('is strictly increasing', () => {
      for (let i = 1; i <= MAX; i++) {
        expect(zenoStepToDetail(zenoStep(i))).toBeGreaterThan(zenoStepToDetail(zenoStep(i - 1)));
      }
    });

    it('throws on out-of-bounds step', () => {
      expect(() => zenoStepToDetail(MAX + 1 as ZenoStep)).toThrow(RangeError);
      expect(() => zenoStepToDetail(-1 as ZenoStep)).toThrow(RangeError);
    });
  });

  describe('detailToZenoStep', () => {
    it('roundtrips with zenoStepToDetail', () => {
      for (let n = 0; n <= MAX; n++) {
        expect(detailToZenoStep(zenoStepToDetail(zenoStep(n)))).toBe(n);
      }
    });

    it('snaps to nearest step', () => {
      const d5 = 1 - Math.pow(8/13, 5);
      const d6 = 1 - Math.pow(8/13, 6);
      const mid = (d5 + d6) / 2;
      const step = detailToZenoStep(mid);
      expect(step === 5 || step === 6).toBe(true);
    });

    it('clamps detail below 0 to step 0', () => {
      expect(detailToZenoStep(-1)).toBe(0);
    });

    it('clamps detail above 1 to step MAX', () => {
      expect(detailToZenoStep(2)).toBe(MAX);
    });
  });

  describe('zenoStepToLines', () => {
    it('follows Fibonacci(n+2) sequence', () => {
      const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
      for (let n = 0; n <= MAX; n++) {
        expect(zenoStepToLines(zenoStep(n))).toBe(fib[n]);
      }
    });

    it('is strictly increasing', () => {
      for (let i = 1; i <= MAX; i++) {
        expect(zenoStepToLines(zenoStep(i))).toBeGreaterThan(zenoStepToLines(zenoStep(i - 1)));
      }
    });

    it('throws on out-of-bounds step', () => {
      expect(() => zenoStepToLines(MAX + 1 as ZenoStep)).toThrow(RangeError);
      expect(() => zenoStepToLines(-1 as ZenoStep)).toThrow(RangeError);
    });
  });

});
