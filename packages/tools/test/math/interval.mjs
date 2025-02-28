import should from 'should';

import { ScvMath } from '../../index.mjs';
const { Interval } = ScvMath;

describe('TESTTESTscv-math/interval', () => {
  it('default ctor', () => {
    let iv = new Interval();
    should(iv.hi).equal(null);
    should(iv.lo).equal(null);
    should(iv.isClosed).equal(false);
    should(iv.infimum).equal(null);
    should(iv.supremum).equal(null);
    should(iv.isEmpty).equal(true);
  });
  it('[1, +infinity)', () => {
    let iv = new Interval(1);
    should(iv).properties({lo:1, hi:Interval.INFINITY});
    should(iv.isClosed).equal(false);
    should(iv.infimum).equal(1);
    should(iv.supremum).equal('+' + Interval.INFINITY);
    should(iv.isEmpty).equal(false);
  });
  it('[-infinity, 1]', () => {
    let iv = new Interval(Interval.INFINITY, 1);
    should(iv).properties({hi:1, lo:Interval.INFINITY});
    should(iv.isClosed).equal(false);
    should(iv.infimum).equal('-' + Interval.INFINITY);
    should(iv.supremum).equal(1);
    should(iv.isEmpty).equal(false);
  });
  it('[1,2]', () => {
    let iv = new Interval(1, 2);
    should(iv).properties({lo:1, hi:2});
    should.deepEqual(iv, new Interval(2,1));
    should(iv.isClosed).equal(true);
    should(iv.infimum).equal(1);
    should(iv.supremum).equal(2);
    should(iv.isEmpty).equal(false);
  });
  it('[-1,PI]', () => {
    let iv = new Interval(-1, Math.PI);
    should(iv).properties({lo:-1, hi:Math.PI});
    should(iv.isClosed).equal(true);
    should(iv.infimum).equal(-1);
    should(iv.supremum).equal(Math.PI);
    should(iv.isEmpty).equal(false);
  });
});
