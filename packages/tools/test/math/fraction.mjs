import should from 'should';

import { ScvMath } from '../../index.mjs';
const { Fraction } = ScvMath;

describe('TESTTESTscv-math/fraction', () => {
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
  });
  it('custom ctor -123', () => {
    let f = new Fraction(-123);
    should(f.numerator).equal(-123);
    should(f.denominator).equal(1);
    should(f.toString()).equal('-123');
    should(f.value).equal(-123);
  });
  it('custom ctor 2/3', () => {
    let f = new Fraction(2,3);
    should(f.numerator).equal(2);
    should(f.denominator).equal(3);
    should(f.toString()).equal('2/3');
    should(f.value).equal(2/3);
  });
  it('custom ctor 240/9', () => {
    let f = new Fraction(240, 9);
    should(f.value).equal(240/9);
    should(f.numerator).equal(240);
    should(f.denominator).equal(9);
    should(f.toString()).equal('240/9');
  });
  it('units', ()=>{
    let f = new Fraction(2, 3, 'lines');
    should(f.numerator).equal(2);
    should(f.denominator).equal(3);
    should(f.toString()).equal('2/3 lines');
    should(f.value).equal(2/3);
  });
  it('reduce() 240/9', ()=>{
    let f = new Fraction(9, 240, 'cars');
    let fr = f.reduce(); // mutative
    should(fr.numerator).equal(3);
    should(fr.denominator).equal(80);
    should(fr.toString()).equal('3/80 cars');
    should(fr.value).equal(9/240);
    should(fr).equal(f); 
  });
  it('add', ()=>{
    let f1 = new Fraction(30, 3);
    let f2 = new Fraction(9, 5);
    let f12 = f1.add(f2);
    should.deepEqual(f12, new Fraction(59, 5));

    let f3 = new Fraction(9, 5, 'dollars');
    let eCaught;
    try {
      f3.add(f1);
    } catch(e) { eCaught = e; }
    should(eCaught.message).match(/units.*dollars.*undefined/);
    let f4 = new Fraction(30, 3, 'euros');
    eCaught = undefined;
    try {
      f3.add(f4);
    } catch(e) { eCaught = e; }
    should(eCaught.message).match(/units.*dollars.*euros/);
  });
});

