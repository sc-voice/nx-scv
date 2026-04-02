import avro from 'avro-js';
import { describe, it, expect } from '@sc-voice/vitest';
import { Text, ScvMath } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';
const { Rational, Schema, Forma } = NameForma;
const { cc } = Text.ColorConsole;
const { CHECKMARK: UOK } = Text.Unicode;

const dbg = 2;

describe('Rational', () => {
  it('default ctor', () => {
    const msg = 'tf6n.ctor';
    let f = new Rational();
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

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor PI', () => {
    // Is this useful?
    let n = Math.PI;
    let d = 1;
    let f = new Rational(n, d);
    expect(f.numerator).toBe(n);
    expect(f.denominator).toBe(d);
    expect(f.toString()).toBe('3.14');
    expect(Math.abs(Math.PI - f.value)).toBeLessThan(1e-15);

    f.reduce();
    expect(Math.abs(Math.PI - f.value)).toBeLessThan(1e-15);
    expect(f.numerator).toBe(1570796326794897);
    expect(f.denominator).toBe(5e14);

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor 0', () => {
    let f = new Rational(0, 1);
    expect(f.numerator).toBe(0);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('0');
    expect(f.value).toBe(0);

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('null', () => {
    let f = new Rational();
    let numerator = Math.random();
    let denominator = Math.random();
    let units = 'test-units';
    let fNull = new Rational({
      isNull: true,
      numerator,
      denominator,
      units,
    });
    let fUnits = new Rational({ isNull: true, units });

    // Null values can have units but numerator and denominator are 0/1
    expect(fNull).toEqual(fUnits);
    expect(fNull).not.toBe(fUnits);
    expect(fNull.numerator).toBe(0);
    expect(fNull.denominator).toBe(1);
    expect(fNull.toString()).toBe(`?${units}`);
  });
  it('custom ctor 1', () => {
    let f = new Rational(1, 1, 'inch');
    expect(f.numerator).toBe(1);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('1inch');
    expect(f.value).toBe(1);

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor -123', () => {
    let f = new Rational(-123);
    expect(f.numerator).toBe(-123);
    expect(f.denominator).toBe(1);
    expect(f.toString()).toBe('-123');
    expect(f.value).toBe(-123);

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor 2/3', () => {
    let f = new Rational(2, 3);
    expect(f.numerator).toBe(2);
    expect(f.denominator).toBe(3);
    expect(f.toString()).toBe('2/3');
    expect(f.value).toBe(2 / 3);

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('custom ctor 240/9', () => {
    let f = new Rational(240, 9);
    expect(f.value).toBe(240 / 9);
    expect(f.numerator).toBe(240);
    expect(f.denominator).toBe(9);
    expect(f.toString()).toBe('240/9');
  });
  it('units', () => {
    let f = new Rational(2, 3, 'cm');
    expect(f.numerator).toBe(2);
    expect(f.denominator).toBe(3);
    expect(f.toString()).toBe('2/3cm');
    expect(f.value).toBe(2 / 3);

    // Rational can be copied
    let fCopy = new Rational(f);
    expect(fCopy).toEqual(f);
    expect(fCopy).not.toBe(f);
  });
  it('reduce() 3/64', () => {
    let f = new Rational(9, 64 * 3, 'in');
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

    let f1 = new Rational(small, big);
    expect(f1.remainder).toBe(small % big);

    let f2 = new Rational(big, small);
    expect(f2.remainder).toBe(big % small);
  });
  it('n d', () => {
    let f = new Rational(1, 2);
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
      let f = new Rational(n, d);
      expect(f.difference).toBe(n - d);
    }
  });
  it('increment()', () => {
    const msg = 'Rational.increment:';
    let f = new Rational(1, 10);
    expect(f.increment()).toBe(f);
    expect(f.numerator).toBe(2);
    f.increment(-7);
    expect(f.numerator).toBe(-5);
    expect(f.denominator).toBe(10);
  });
  it('add', () => {
    let f1 = new Rational(30, 3);
    let f2 = new Rational(9, 5);
    let f12 = f1.add(f2);
    expect(f12).toEqual(new Rational(59, 5));

    let f3 = new Rational(9, 5, 'dollars');
    let eCaught;
    try {
      f3.add(f1);
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/units.*"dollars".*""/);
    let f4 = new Rational(30, 3, 'euros');
    eCaught = undefined;
    try {
      f3.add(f4);
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/units.*dollars.*euros/);
  });
  it('toString()', () => {
    let f12 = new Rational(1, 2, 'in');
    let f13 = new Rational(1, 3, 'in');
    let f34 = new Rational(3, 4, 'in');
    let f18 = new Rational(1, 8, 'in');
    let f232 = new Rational(2, 32, 'in');
    let f1632 = new Rational(16, 32, 'in');
    let f254 = new Rational(254, 100, 'cm');
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
  it('avro null', () => {
    const msg = 'tf6n.avro';
    dbg > 1 && cc.tag(msg, '===============', 'register schema');
    let schema = Rational.avroSchema;
    let { fullName } = schema;
    const registry = {id: "PrAr6Tg"};
    let avroType = Rational.registerAvro({avro, registry});

    let thing1 = new Rational(null, 3, 'seconds');
    let buf1 = avroType.toBuffer(thing1);
    let thing2 = avroType.fromBuffer(buf1);
    expect(thing1.toString()).toBe('?seconds');
    expect(new Rational(thing2)).toEqual(thing1);
    dbg > 1 && cc.tag(msg, 'Rational with units');

    dbg && cc.tag1(msg + UOK, 'Rational serialized with avro');
  });
  it('avro 2/3 tbsp', () => {
    const msg = 'tf6n.avro';
    dbg > 1 && cc.tag(msg, '===============', 'register schema');
    let schema = Rational.avroSchema;
    let { fullName } = schema;
    const registry = {id: "PrAr6Th"};
    let avroType = Rational.registerAvro({avro, registry});

    let thing1 = new Rational(2, 3, 'tbsp');
    let buf1 = avroType.toBuffer(thing1);
    let thing2 = avroType.fromBuffer(buf1);
    expect(thing1.toString()).toBe('2/3tbsp');
    expect(new Rational(thing2)).toEqual(thing1);
    dbg > 1 && cc.tag(msg, 'Rational with units');

    dbg && cc.tag1(msg + UOK, 'Rational serialized with avro');
  });
});
