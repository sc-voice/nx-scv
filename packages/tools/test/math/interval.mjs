import should from 'should';

import { ScvMath, Text } from '../../index.mjs';
const { EMPTY_SET, INFINITY } = Text.Unicode;
const { Interval } = ScvMath;

describe('TESTTESTscv-math/interval', () => {
  it('default ctor', () => {
    let iv = new Interval();
    should(iv).properties(['lo', 'hi']);
    should(iv.toString()).equal(EMPTY_SET);
    should(iv.hi).equal(null);
    should(iv.lo).equal(null);
    should(iv.infimum).equal(null);
    should(iv.isClosed).equal(true);
    should(iv.isEmpty).equal(true);
    should(iv.isOpen).equal(true);
    should(iv.leftOpen).equal(true);
    should(iv.rightOpen).equal(true);
    should(iv.supremum).equal(null);
  });
  it('[3,2]', () => {
    let eCaught;
    try {
      new Interval(3, 2);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/invalid interval/);
  });
  it('[1,1]', () => {
    let iv = new Interval(1, 1);
    should(iv).properties({ lo: 1, hi: 1 });
    should(iv.toString()).equal(`[1,1]`);
    should(iv.infimum).equal(1);
    should(iv.isClosed).equal(true);
    should(iv.isOpen).equal(false);
    should(iv.isEmpty).equal(false);
    should(iv.leftOpen).equal(false);
    should(iv.rightOpen).equal(false);
    should(iv.supremum).equal(1);
  });
  it('[1, +infinity)', () => {
    let iv = new Interval(1);
    should(iv).properties({ lo: 1, hi: Interval.INFINITY });
    should(iv.toString()).equal(`[1,+${INFINITY})`);
    should(iv.infimum).equal(1);
    should(iv.isClosed).equal(false);
    should(iv.isEmpty).equal(false);
    should(iv.isOpen).equal(true);
    should(iv.leftOpen).equal(false);
    should(iv.rightOpen).equal(true);
    should(iv.supremum).equal('+' + Interval.INFINITY);
  });
  it('[-infinity, 1]', () => {
    let iv = new Interval(Interval.INFINITY, 1);
    should(iv).properties({ hi: 1, lo: Interval.INFINITY });
    should(iv.toString()).equal(`(-${INFINITY},1]`);
    should(iv.infimum).equal('-' + Interval.INFINITY);
    should(iv.isClosed).equal(false);
    should(iv.isEmpty).equal(false);
    should(iv.isOpen).equal(true);
    should(iv.leftOpen).equal(true);
    should(iv.rightOpen).equal(false);
    should(iv.supremum).equal(1);
  });
  it('[1,2]', () => {
    let iv = new Interval(1, 2);
    should(iv).properties({ lo: 1, hi: 2 });
    should(iv.toString()).equal(`[1,2]`);
    should(iv.contains(2)).equal(true);
    should(iv.infimum).equal(1);
    should(iv.isClosed).equal(true);
    should(iv.isEmpty).equal(false);
    should(iv.isOpen).equal(false);
    should(iv.leftOpen).equal(false);
    should(iv.rightOpen).equal(false);
    should(iv.supremum).equal(2);
  });
  it('[1,2)', () => {
    let iv = new Interval(1, 2, { rightOpen: true });
    should(iv).properties({ lo: 1, hi: 2 });
    should(iv.toString()).equal(`[1,2)`);
    should(iv.contains(1)).equal(true);
    should(iv.contains(2)).equal(false);
    should(iv.infimum).equal(1);
    should(iv.isClosed).equal(false);
    should(iv.isEmpty).equal(false);
    should(iv.isOpen).equal(true);
    should(iv.leftOpen).equal(false);
    should(iv.rightOpen).equal(true);
    should(iv.supremum).equal(2);
  });
  it('(1,2]', () => {
    let iv = new Interval(1, 2, { leftOpen: true });
    should(iv).properties({ lo: 1, hi: 2 });
    should(iv.toString()).equal(`(1,2]`);
    should(iv.contains(1)).equal(false);
    should(iv.contains(2)).equal(true);
    should(iv.infimum).equal(1);
    should(iv.isClosed).equal(false);
    should(iv.isEmpty).equal(false);
    should(iv.isOpen).equal(true);
    should(iv.leftOpen).equal(true);
    should(iv.rightOpen).equal(false);
    should(iv.supremum).equal(2);
  });
  it('[-1,PI]', () => {
    let iv = new Interval(-1, Math.PI);
    should(iv).properties({ lo: -1, hi: Math.PI });
    should(iv.toString()).equal(`[-1,${Math.PI}]`);
    should(iv.infimum).equal(-1);
    should(iv.isClosed).equal(true);
    should(iv.isOpen).equal(false);
    should(iv.isEmpty).equal(false);
    should(iv.leftOpen).equal(false);
    should(iv.rightOpen).equal(false);
    should(iv.supremum).equal(Math.PI);
  });
  it('overlaps', () => {
    let leftOpen = true;
    let rightOpen = true;
    let i1_5 = new Interval(1, 5);
    let io1_5 = new Interval(1, 5, {leftOpen});
    let i1_o5 = new Interval(1, 5, {rightOpen});
    let io1_o5 = new Interval(1, 5, {leftOpen,rightOpen});
    let i2_3 = new Interval(2, 3);
    let i6_9 = new Interval(6, 9);
    let i3_7 = new Interval(3, 7);
    let i1 = new Interval(1, 1);
    let i4 = new Interval(4, 4);
    let i5 = new Interval(5, 5);

    // degenerate
    should(i4.overlaps(i4)).equal(true);
    should(i4.overlaps(i1_5)).equal(true);
    should(i4.overlaps(i2_3)).equal(false);

    // subset
    should(i1_5.overlaps(i1_5)).equal(true);
    should(i2_3.overlaps(i1_5)).equal(true);
    should(i1_5.overlaps(i2_3)).equal(true);

    // partial overlap
    should(i1_5.overlaps(i3_7)).equal(true);
    should(i3_7.overlaps(i1_5)).equal(true);
    should(i3_7.overlaps(i2_3)).equal(true);
    should(i2_3.overlaps(i3_7)).equal(true);

    // disjoint
    should(i1_5.overlaps(i6_9)).equal(false);
    should(io1_5.overlaps(i1)).equal(false);
    should(i6_9.overlaps(i1_5)).equal(false);
    should(i4.overlaps(i6_9)).equal(false);
    should(i6_9.overlaps(i4)).equal(false);
  });
});
