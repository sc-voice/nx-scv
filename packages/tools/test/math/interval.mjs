import should from 'should';

import { ScvMath, Text } from '../../index.mjs';
const { INFINITY } = Text.Unicode;
const { Interval } = ScvMath;

describe('TESTTESTscv-math/interval', () => {
  it('default ctor', () => {
    let iv = new Interval();
    should(iv).properties(['lo', 'hi']);
    should(iv.hi).equal(null);
    should(iv.lo).equal(null);
    should(iv.isClosed).equal(false);
    should(iv.infimum).equal(null);
    should(iv.supremum).equal(null);
    should(iv.isEmpty).equal(true);
    should(iv.toString()).equal('[]');
  });
  it('[3,2]', () => {
    let eCaught;
    try {
      new Interval(3,2);
    } catch(e) { eCaught = e; }
    should(eCaught.message).match(/invalid interval/);
  });
  it('[1,1]', () => {
    let iv = new Interval(1, 1);
    should(iv).properties({ lo: 1, hi: 1 });
    should(iv.isClosed).equal(true);
    should(iv.infimum).equal(1);
    should(iv.supremum).equal(1);
    should(iv.isEmpty).equal(false);
    should(iv.toString()).equal(`[1,1]`);
  });
  it('[1, +infinity)', () => {
    let iv = new Interval(1);
    should(iv).properties({ lo: 1, hi: Interval.INFINITY });
    should(iv.isClosed).equal(false);
    should(iv.infimum).equal(1);
    should(iv.supremum).equal('+' + Interval.INFINITY);
    should(iv.isEmpty).equal(false);
    should(iv.toString()).equal(`[1,+${INFINITY})`);
  });
  it('[-infinity, 1]', () => {
    let iv = new Interval(Interval.INFINITY, 1);
    should(iv).properties({ hi: 1, lo: Interval.INFINITY });
    should(iv.isClosed).equal(false);
    should(iv.infimum).equal('-' + Interval.INFINITY);
    should(iv.supremum).equal(1);
    should(iv.isEmpty).equal(false);
    should(iv.toString()).equal(`(-${INFINITY},1]`);
  });
  it('[1,2]', () => {
    let iv = new Interval(1, 2);
    should(iv).properties({ lo: 1, hi: 2 });
    should(iv.isClosed).equal(true);
    should(iv.infimum).equal(1);
    should(iv.supremum).equal(2);
    should(iv.isEmpty).equal(false);
    should(iv.contains(2)).equal(true);
    should(iv.toString()).equal(`[1,2]`);
  });
  it('[-1,PI]', () => {
    let iv = new Interval(-1, Math.PI);
    should(iv).properties({ lo: -1, hi: Math.PI });
    should(iv.isClosed).equal(true);
    should(iv.infimum).equal(-1);
    should(iv.supremum).equal(Math.PI);
    should(iv.isEmpty).equal(false);
    should(iv.toString()).equal(`[-1,${Math.PI}]`);
  });
  it('overlaps', () => {
    let i1_5 = new Interval(1,5);
    let i2_3 = new Interval(2,3);
    let i6_9 = new Interval(6,9);
    let i3_7 = new Interval(3,7);
    let i4 = new Interval(4,4);

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
    should(i6_9.overlaps(i1_5)).equal(false);
    should(i4.overlaps(i6_9)).equal(false);
    should(i6_9.overlaps(i4)).equal(false);
  });
});
