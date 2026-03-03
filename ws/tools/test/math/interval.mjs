import util from 'node:util';
import { describe, it, expect } from 'vitest';
import { ScvMath, Text } from '../../index.mjs';
const { EMPTY_SET, INFINITY } = Text.Unicode;
const { Interval } = ScvMath;

describe('scv-math/interval', () => {
  it('default ctor', () => {
    let iv = new Interval();
    expect(iv).toHaveProperty('lo');
    expect(iv).toHaveProperty('hi');
    expect(iv.toString()).toBe(EMPTY_SET);
    expect(iv.hi).toBe(null);
    expect(iv.lo).toBe(null);
    expect(iv.infimum).toBe(null);
    expect(iv.isClosed).toBe(true);
    expect(iv.isEmpty).toBe(true);
    expect(iv.isOpen).toBe(true);
    expect(iv.leftOpen).toBe(true);
    expect(iv.rightOpen).toBe(true);
    expect(iv.supremum).toBe(null);
  });
  it('[3,2]', () => {
    let eCaught;
    try {
      new Interval(3, 2);
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/invalid interval/);
  });
  it('[1,1]', () => {
    let iv = new Interval(1, 1);
    expect(iv).toMatchObject({ lo: 1, hi: 1 });
    expect(iv.toString()).toBe(`[1,1]`);
    expect(iv.infimum).toBe(1);
    expect(iv.isClosed).toBe(true);
    expect(iv.isOpen).toBe(false);
    expect(iv.isEmpty).toBe(false);
    expect(iv.leftOpen).toBe(false);
    expect(iv.rightOpen).toBe(false);
    expect(iv.supremum).toBe(1);
  });
  it('[1, +infinity)', () => {
    let iv = new Interval(1);
    expect(iv).toMatchObject({ lo: 1, hi: Interval.INFINITY });
    expect(iv.toString()).toBe(`[1,+${INFINITY})`);
    expect(iv.infimum).toBe(1);
    expect(iv.isClosed).toBe(false);
    expect(iv.isEmpty).toBe(false);
    expect(iv.isOpen).toBe(true);
    expect(iv.leftOpen).toBe(false);
    expect(iv.rightOpen).toBe(true);
    expect(iv.supremum).toBe('+' + Interval.INFINITY);
  });
  it('[-infinity, 1]', () => {
    let iv = new Interval(Interval.INFINITY, 1);
    expect(iv).toMatchObject({ hi: 1, lo: Interval.INFINITY });
    expect(iv.toString()).toBe(`(-${INFINITY},1]`);
    expect(iv.infimum).toBe('-' + Interval.INFINITY);
    expect(iv.isClosed).toBe(false);
    expect(iv.isEmpty).toBe(false);
    expect(iv.isOpen).toBe(true);
    expect(iv.leftOpen).toBe(true);
    expect(iv.rightOpen).toBe(false);
    expect(iv.supremum).toBe(1);
  });
  it('[1,2]', () => {
    let iv = new Interval(1, 2);
    expect(iv).toMatchObject({ lo: 1, hi: 2 });
    expect(iv.toString()).toBe(`[1,2]`);
    expect(iv.contains(2)).toBe(true);
    expect(iv.infimum).toBe(1);
    expect(iv.isClosed).toBe(true);
    expect(iv.isEmpty).toBe(false);
    expect(iv.isOpen).toBe(false);
    expect(iv.leftOpen).toBe(false);
    expect(iv.rightOpen).toBe(false);
    expect(iv.supremum).toBe(2);
  });
  it('[1,2)', () => {
    let iv = new Interval(1, 2, { rightOpen: true });
    expect(iv).toMatchObject({ lo: 1, hi: 2 });
    expect(iv.toString()).toBe(`[1,2)`);
    expect(iv.contains(1)).toBe(true);
    expect(iv.contains(2)).toBe(false);
    expect(iv.infimum).toBe(1);
    expect(iv.isClosed).toBe(false);
    expect(iv.isEmpty).toBe(false);
    expect(iv.isOpen).toBe(true);
    expect(iv.leftOpen).toBe(false);
    expect(iv.rightOpen).toBe(true);
    expect(iv.supremum).toBe(2);
  });
  it('(1,2]', () => {
    let iv = new Interval(1, 2, { leftOpen: true });
    expect(iv).toMatchObject({ lo: 1, hi: 2 });
    expect(iv.toString()).toBe(`(1,2]`);
    expect(iv.contains(1)).toBe(false);
    expect(iv.contains(2)).toBe(true);
    expect(iv.infimum).toBe(1);
    expect(iv.isClosed).toBe(false);
    expect(iv.isEmpty).toBe(false);
    expect(iv.isOpen).toBe(true);
    expect(iv.leftOpen).toBe(true);
    expect(iv.rightOpen).toBe(false);
    expect(iv.supremum).toBe(2);
  });
  it('[-1,PI]', () => {
    let iv = new Interval(-1, Math.PI);
    expect(iv).toMatchObject({ lo: -1, hi: Math.PI });
    expect(iv.toString()).toBe(`[-1,${Math.PI}]`);
    expect(iv.infimum).toBe(-1);
    expect(iv.isClosed).toBe(true);
    expect(iv.isOpen).toBe(false);
    expect(iv.isEmpty).toBe(false);
    expect(iv.leftOpen).toBe(false);
    expect(iv.rightOpen).toBe(false);
    expect(iv.supremum).toBe(Math.PI);
  });
  it('overlaps', () => {
    let leftOpen = true;
    let rightOpen = true;
    let i1_5 = new Interval(1, 5);
    let io1_5 = new Interval(1, 5, { leftOpen });
    let i1_o5 = new Interval(1, 5, { rightOpen });
    let io1_o5 = new Interval(1, 5, { leftOpen, rightOpen });
    let i2_3 = new Interval(2, 3);
    let i6_9 = new Interval(6, 9);
    let i3_7 = new Interval(3, 7);
    let i1 = new Interval(1, 1);
    let i4 = new Interval(4, 4);
    let i5 = new Interval(5, 5);

    // degenerate
    expect(i4.overlaps(i4)).toBe(true);
    expect(i4.overlaps(i1_5)).toBe(true);
    expect(i4.overlaps(i2_3)).toBe(false);

    // subset
    expect(i1_5.overlaps(i1_5)).toBe(true);
    expect(i2_3.overlaps(i1_5)).toBe(true);
    expect(i1_5.overlaps(i2_3)).toBe(true);

    // partial overlap
    expect(i1_5.overlaps(i3_7)).toBe(true);
    expect(i3_7.overlaps(i1_5)).toBe(true);
    expect(i3_7.overlaps(i2_3)).toBe(true);
    expect(i2_3.overlaps(i3_7)).toBe(true);

    // disjoint
    expect(i1_5.overlaps(i6_9)).toBe(false);
    expect(io1_5.overlaps(i1)).toBe(false);
    expect(i6_9.overlaps(i1_5)).toBe(false);
    expect(i4.overlaps(i6_9)).toBe(false);
    expect(i6_9.overlaps(i4)).toBe(false);
  });
  it('size', () => {
    expect(new Interval(-1, 5).size).toBe(6);
  });
  it('styleText', () => {
    let i6l = new Interval(1, 2);
    expect(Interval.styleText).toBe(undefined);
    let defaultToString = i6l.toString();
    Interval.styleText = (x) => `a${x}b`;
    expect(i6l.toString()).toBe(`a[1,2]b`);
    Interval.styleText = undefined;
    expect(i6l.toString()).toBe(defaultToString);
  });
  it('collapseDegenerate', () => {
    let i6l = new Interval(1, 1);
    expect(Interval.collapseDegenerate).toBe(false);
    Interval.collapseDegenerate = true;
    expect(i6l.toString()).toBe(`[1]`);
    Interval.collapseDegenerate = false;
  });
});
