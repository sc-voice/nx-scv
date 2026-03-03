import { describe, it, expect } from 'vitest';
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Fraction } = ScvMath;
const { cc } = Text.ColorConsole;
const { CHECKMARK: UOK } = Text.Unicode;

const dbg = DBG.FRACTION.TEST;

describe('fraction', () => {
  it('default ctor', () => {
    const msg = 'tf6n.ctor';
    let f = new Fraction();
    expect(f.isNull).toBe(true);
    expect(f.numerator).toBe(0);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('?');
    expect(f.value == null).toBe(true);
    let proto = Object.getPrototypeOf(f);
    let obj1 = { a: 1 };
    expect({}.toString).toBe(obj1?.toString);
    expect(f?.toString).not.toBe({}.toString);
    expect(typeof f?.toString).toBe('function');

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor PI', () => {
    // Is this useful?
    let n = Math.PI;
    let d = 1;
    let f = new Fraction(n, d);
    expect(f.numerator).toBe(n);
    expect(f.denominator).toBe(d);
    expect(f.toString()).toBe('3.14');
    expect(Math.abs(Math.PI - f.value)).toBeLessThan(1e-15);

    f.reduce();
    expect(Math.abs(Math.PI - f.value)).toBeLessThan(1e-15);
    expect(f.numerator).toBe(1570796326794897);
    expect(f.denominator).toBe(5e14);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor 0', () => {
    let f = new Fraction(0, 1);
    expect(f.numerator).toBe(0);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('0');
    expect(f.value).toBe(0);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('null', () => {
    let f = new Fraction();
    let numerator = Math.random();
    let denominator = Math.random();
    let units = 'test-units';
    let fNull = new Fraction({
      isNull: true,
      numerator,
      denominator,
      units,
    });
    let fUnits = new Fraction({ isNull: true, units });

    // Null values can have units but numerator and denominator are 0/1
    expect(fNull).toEqual(fUnits);
    expect(fNull).not.toBe(fUnits);
    expect(fNull.numerator).toBe(0);
    expect(fNull.denominator).toBe(1);
    expect(fNull.toString()).toBe(`?${units}`);
  });
  it('custom ctor 1', () => {
    let f = new Fraction(1, 1, 'inch');
    expect(f.numerator).toBe(1);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('1inch');
    expect(f.value).toBe(1);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor -123', () => {
    let f = new Fraction(-123);
    expect(f.numerator).toBe(-123);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('-123');
    expect(f.value).toBe(-123);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor 2/3', () => {
    let f = new Fraction(2, 3);
    expect(f.numerator).toBe(2);
    expect(f.denominator).toBe(3);
    expect(f.toString()).toBe('2/3');
    expect(f.value).toBe(2 / 3);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor 240/9', () => {
    let f = new Fraction(240, 9);
    expect(f.value).toBe(240 / 9);
    expect(f.numerator).toBe(240);
    expect(f.denominator).toBe(9);
    expect(f.toString()).toBe('240/9');
  });
  it('units', () => {
    let f = new Fraction(2, 3, 'cm');
    expect(f.numerator).toBe(2);
    expect(f.denominator).toBe(3);
    expect(f.toString()).toBe('2/3cm');
    expect(f.value).toBe(2 / 3);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('reduce() 3/64', () => {
    let f = new Fraction(9, 64 * 3, 'in');
    let fr = f.reduce(); // mutative
    expect(fr.numerator).toBe(3);
    expect(fr.denominator).toBe(64);
    expect(fr.toString()).toBe('3/64in');
    expect(fr.value).toBe(3 / 64);
    expect(fr).toBe(f);
  });
  it('remainder', () => {
    let big = 240;
    let small = 9;

    let f1 = new Fraction(small, big);
    expect(f1.remainder).toBe(small % big);

    let f2 = new Fraction(big, small);
    expect(f2.remainder).toBe(big % small);
  });
  it('n d', () => {
    let f = new Fraction(1, 2);
    f.n++;
    f.d++;
    expect(f.n).toBe(2);
    expect(f.d).toBe(3);
    // biome-ignore lint/suspicious:
    let ff = (f.n = 5);
    expect(ff).toBe(5);
  });
  it('difference', () => {
    for (let i = 0; i < 10; i++) {
      let n = Math.round(Math.random() * 1000);
      let d = Math.round(Math.random() * 1000);
      let f = new Fraction(n, d);
      expect(f.difference).toBe(n - d);
    }
  });
  it('increment()', () => {
    const msg = 'FRACTION.increment:';
    let f = new Fraction(1, 10);
    expect(f.increment()).toBe(f);
    expect(f.numerator).toBe(2);
    f.increment(-7);
    expect(f.numerator).toBe(-5);
    expect(f.denominator).toBe(10);
  });
  it('add', () => {
    let f1 = new Fraction(30, 3);
    let f2 = new Fraction(9, 5);
    let f12 = f1.add(f2);
    expect(f12).toEqual(new Fraction(59, 5));

    let f3 = new Fraction(9, 5, 'dollars');
    let eCaught;
    try {
      f3.add(f1);
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/units.*"dollars".*""/);
    let f4 = new Fraction(30, 3, 'euros');
    eCaught = undefined;
    try {
      f3.add(f4);
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/units.*dollars.*euros/);
  });
  it('patch', () => {
    let f6n = new Fraction(1, 2, 'meter');
    f6n.patch({ numerator: 3 });
    expect(f6n.toString()).toBe('3/2meter');
    f6n.patch({ numerator: 4, denominator: 5, units: 'feet' });
    expect(f6n.toString()).toBe('4/5feet');
  });
  it('toString()', () => {
    let f12 = new Fraction(1, 2, 'in');
    let f13 = new Fraction(1, 3, 'in');
    let f34 = new Fraction(3, 4, 'in');
    let f18 = new Fraction(1, 8, 'in');
    let f232 = new Fraction(2, 32, 'in');
    let f1632 = new Fraction(16, 32, 'in');
    let f254 = new Fraction(254, 100, 'cm');
    expect(f12.toString()).toBe('1/2in');
    expect(f13.toString()).toBe('1/3in');
    expect(f34.toString()).toBe('3/4in');
    expect(f18.toString()).toBe('1/8in');
    expect(f232.toString()).toBe('2/32in');
    expect(f232.toString({ fixed: 1 })).toBe('0.1in');
    expect(f232.reduce().toString()).toBe('1/16in');
    expect(f1632.toString()).toBe('0.5in');
    expect(f1632.reduce().toString()).toBe('1/2in');
    expect(f254.toString()).toBe('2.54cm');
  });
  it('patch', () => {
    let f = new Fraction(4, 5, 'F');
    f.patch({ numerator: 3 });
    expect(f).toEqual(new Fraction(3, 5, 'F'));
    f.patch({ denominator: 7 });
    expect(f).toEqual(new Fraction(3, 7, 'F'));
    f.patch({ units: 'Fahrenheit' });
    expect(f).toEqual(new Fraction(3, 7, 'Fahrenheit'));
  });
});
