import { describe, it, expect } from '@sc-voice/vitest';
import { RenderBuffer } from '../src/render-buffer.js';
import type { IView } from '../src/navigable-view.js';

const mockView = {} as unknown as IView;

describe('RenderBuffer', () => {
  it('initializes remainingRows to rowBudget', () => {
    const buf = new RenderBuffer(mockView, 5);
    expect(buf.remainingRows).toBe(5);
  });

  it('initializes with zero budget', () => {
    const buf = new RenderBuffer(mockView, 0);
    expect(buf.remainingRows).toBe(0);
  });

  it('throws on negative rowBudget', () => {
    expect(() => new RenderBuffer(mockView, -1)).toThrow(RangeError);
  });

  describe('pushCollection', () => {
    it('pushes all rows when within budget', () => {
      const buf = new RenderBuffer(mockView, 5);
      buf.pushCollection([['a'], ['b'], ['c']]);
      expect(buf.remainingRows).toBe(2);
    });

    it('truncates and appends ellipsis when over budget', () => {
      const buf = new RenderBuffer(mockView, 3);
      buf.pushCollection([['a'], ['b'], ['c'], ['d'], ['e']]);
      expect(buf.remainingRows).toBe(0);
    });

    it('ellipsis shows correct omitted count', () => {
      const buf = new RenderBuffer(mockView, 3);
      buf.pushCollection([['a'], ['b'], ['c'], ['d'], ['e']]);
      // budget=3: limit=2, push a,b then ellipsis '… [3]'
      const data = buf.getRenderData();
      expect(data.length).toBe(3);
      expect(data[0]).toEqual(['a']);
      expect(data[1]).toEqual(['b']);
      expect(data[2][0]).toBe('… [3]');
    });

    it('throws when budget exhausted and collection non-empty', () => {
      const buf = new RenderBuffer(mockView, 0);
      expect(() => buf.pushCollection([['a']])).toThrow(RangeError);
    });

    it('no-op on empty collection regardless of budget', () => {
      const buf = new RenderBuffer(mockView, 0);
      expect(() => buf.pushCollection([])).not.toThrow();
      expect(buf.remainingRows).toBe(0);
    });
  });

  describe('pushRow', () => {
    it('decrements remainingRows', () => {
      const buf = new RenderBuffer(mockView, 3);
      buf.pushRow(['a']);
      expect(buf.remainingRows).toBe(2);
    });

    it('throws when budget is zero', () => {
      const buf = new RenderBuffer(mockView, 0);
      expect(() => buf.pushRow(['a'])).toThrow(RangeError);
    });

    it('throws when budget goes negative', () => {
      const buf = new RenderBuffer(mockView, 1);
      buf.pushRow(['a']);
      expect(() => buf.pushRow(['b'])).toThrow(RangeError);
    });
  });
});
