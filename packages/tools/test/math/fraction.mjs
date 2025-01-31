import should from 'should';

import { ScvMath } from '../../index.mjs';
const { Fraction } = ScvMath;

describe('scv-math/fraction', () => {
  it('default ctor', () => {
    let f = new Fraction();
    should(f.numerator).equal(undefined);
    should(f.denominator).equal(1);
    should(f.toString()).equal('undefined/1');
    should(Number.isNaN(f.value)).equal(true);
  });
  it('custom ctor 1', () => {
    let f = new Fraction(1);
    should(f.numerator).equal(1);
    should(f.denominator).equal(1);
    should(f.toString()).equal('1');
    should(f.value).equal(1);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
  });
  it('custom ctor -123', () => {
    let f = new Fraction(-123);
    should(f.numerator).equal(-123);
    should(f.denominator).equal(1);
    should(f.toString()).equal('-123');
    should(f.value).equal(-123);
  });
  it('custom ctor 2/3', () => {
    let f = new Fraction(2, 3);
    should(f.numerator).equal(2);
    should(f.denominator).equal(3);
    should(f.toString()).equal('2/3');
    should(f.value).equal(2 / 3);
  });
  it('custom ctor 240/9', () => {
    let f = new Fraction(240, 9);
    should(f.value).equal(240 / 9);
    should(f.numerator).equal(240);
    should(f.denominator).equal(9);
    should(f.toString()).equal('240/9');
  });
  it('units', () => {
    let f = new Fraction(2, 3, 'lines');
    should(f.numerator).equal(2);
    should(f.denominator).equal(3);
    should(f.toString()).equal('2/3 lines');
    should(f.value).equal(2 / 3);
  });
  it('reduce() 240/9', () => {
    let f = new Fraction(9, 240, 'cars');
    let fr = f.reduce(); // mutative
    should(fr.numerator).equal(3);
    should(fr.denominator).equal(80);
    should(fr.toString()).equal('3/80 cars');
    should(fr.value).equal(9 / 240);
    should(fr).equal(f);
  });
  it('remainder', () => {
    let big = 240;
    let small = 9;

    let f1 = new Fraction(small, big);
    should(f1.remainder).equal(small % big);

    let f2 = new Fraction(big, small);
    should(f2.remainder).equal(big % small);
  });
  it('n d', () =>{
    let f = new Fraction(1,2);
    f.n++;
    f.d++;
    should(f.n).equal(2);
    should(f.d).equal(3);
  });
  it('difference', () => {
    for (let i = 0; i < 10; i++) {
      let n = Math.round(Math.random() * 1000);
      let d = Math.round(Math.random() * 1000);
      let f = new Fraction(n, d);
      should(f.difference).equal(n - d);
    }
  });
  it('increment()', () => {
    const msg = 'FRACTION.increment:';
    let f = new Fraction(1, 10);
    should(f.increment()).equal(f);
    should(f.numerator).equal(2);
    f.increment(-7);
    should(f.numerator).equal(-5);
    should(f.denominator).equal(10);
  });
  it('add', () => {
    let f1 = new Fraction(30, 3);
    let f2 = new Fraction(9, 5);
    let f12 = f1.add(f2);
    should.deepEqual(f12, new Fraction(59, 5));

    let f3 = new Fraction(9, 5, 'dollars');
    let eCaught;
    try {
      f3.add(f1);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/units.*dollars.*undefined/);
    let f4 = new Fraction(30, 3, 'euros');
    eCaught = undefined;
    try {
      f3.add(f4);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/units.*dollars.*euros/);
  });
});
