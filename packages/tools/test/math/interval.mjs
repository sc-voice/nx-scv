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
  it('[1,1]', () => {
    let iv = new Interval(1,1);
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
  it('[2,1]', () => {
    let iv = new Interval(2, 1);
    should(iv).properties({ lo: 2, hi: 1 });
    should(iv.isClosed).equal(true);
    should(iv.infimum).equal(2);
    should(iv.supremum).equal(1);
    should(iv.isEmpty).equal(true);
    should(iv.contains(2)).equal(false);
    should(iv.toString()).equal(`[2,1]`);
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
});
