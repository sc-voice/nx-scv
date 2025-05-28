import avro from 'avro-js';
import should from 'should';
import { NameForma, ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Fraction } = ScvMath;
const { Forma } = NameForma;
const { cc } = Text.ColorConsole;
const { CHECKMARK: UOK } = Text.Unicode;

const dbg = DBG.T2T.FRACTION;

describe('scv-math/fraction', () => {
  it('default ctor', () => {
    const msg = 'tf6n.ctor';
    let f = new Fraction();
    should(f.isNull).equal(true);
    should(f.numerator).equal(0);
    should(f.denominator).equal(1);
    should(f.toString()).equal('?');
    should(f.value == null).equal(true);
    let proto = Object.getPrototypeOf(f);
    let obj1 = { a: 1 };
    should({}.toString).equal(obj1?.toString);
    should(f?.toString).not.equal({}.toString);
    should(typeof f?.toString).equal('function');

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
  });
  it('custom ctor PI', () => {
    // Is this useful?
    let n = Math.PI;
    let d = 1;
    let f = new Fraction(n, d);
    should(f.numerator).equal(n);
    should(f.denominator).equal(d);
    should(f.toString()).equal('3.14');
    should(Math.abs(Math.PI - f.value)).below(1e-15);

    f.reduce();
    should(Math.abs(Math.PI - f.value)).below(1e-15);
    should(f.numerator).equal(1570796326794897);
    should(f.denominator).equal(5e14);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
  });
  it('custom ctor 0', () => {
    let f = new Fraction(0, 1);
    should(f.numerator).equal(0);
    should(f.denominator).equal(1);
    should(f.toString()).equal('0');
    should(f.value).equal(0);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
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
    should.deepEqual(fNull, fUnits);
    should(fNull).not.equal(fUnits);
    should(fNull.numerator).equal(0);
    should(fNull.denominator).equal(1);
    should(fNull.toString()).equal(`?${units}`);
  });
  it('custom ctor 1', () => {
    let f = new Fraction(1, 1, 'inch');
    should(f.numerator).equal(1);
    should(f.denominator).equal(1);
    should(f.toString()).equal('1inch');
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

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
  });
  it('custom ctor 2/3', () => {
    let f = new Fraction(2, 3);
    should(f.numerator).equal(2);
    should(f.denominator).equal(3);
    should(f.toString()).equal('2/3');
    should(f.value).equal(2 / 3);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
  });
  it('custom ctor 240/9', () => {
    let f = new Fraction(240, 9);
    should(f.value).equal(240 / 9);
    should(f.numerator).equal(240);
    should(f.denominator).equal(9);
    should(f.toString()).equal('240/9');
  });
  it('units', () => {
    let f = new Fraction(2, 3, 'cm');
    should(f.numerator).equal(2);
    should(f.denominator).equal(3);
    should(f.toString()).equal('2/3cm');
    should(f.value).equal(2 / 3);

    // Fractions can be copied
    let fCopy = new Fraction(f);
    should.deepEqual(fCopy, f);
    should(fCopy).not.equal(f);
  });
  it('reduce() 3/64', () => {
    let f = new Fraction(9, 64 * 3, 'in');
    let fr = f.reduce(); // mutative
    should(fr.numerator).equal(3);
    should(fr.denominator).equal(64);
    should(fr.toString()).equal('3/64in');
    should(fr.value).equal(3 / 64);
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
  it('n d', () => {
    let f = new Fraction(1, 2);
    f.n++;
    f.d++;
    should(f.n).equal(2);
    should(f.d).equal(3);
    // biome-ignore lint/suspicious:
    let ff = (f.n = 5);
    should(ff).equal(5);
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
    should(eCaught.message).match(/units.*"dollars".*""/);
    let f4 = new Fraction(30, 3, 'euros');
    eCaught = undefined;
    try {
      f3.add(f4);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/units.*dollars.*euros/);
  });
  it('patch', () => {
    let f6n = new Fraction(1, 2, 'meter');
    f6n.patch({ numerator: 3 });
    should(f6n.toString()).equal('3/2meter');
    f6n.patch({ numerator: 4, denominator: 5, units: 'feet' });
    should(f6n.toString()).equal('4/5feet');
  });
  it('TESTTESTavro', () => {
    const msg = 'tf6n.avro';
    dbg > 1 && cc.tag(msg, '===============', 'register schema');
    let type = Forma.registerSchema(Fraction.SCHEMA, { avro });

    let tsp2 = new Fraction(2, 3, 'tbsp');
    let tsp2Buf = type.toBuffer(tsp2);
    let tsp2Parsed = type.fromBuffer(tsp2Buf);
    should(tsp2.toString()).equal('2/3tbsp');
    should.deepEqual(new Fraction(tsp2Parsed), tsp2);
    dbg > 1 && cc.tag(msg, 'fraction with units');

    dbg > 1 && cc.tag(msg, 'fraction without units');
    let half = new Fraction(1, 2);
    should(half.units).equal('');
    let halfBuf = type.toBuffer(half);
    let halfCopy = new Fraction(type.fromBuffer(halfBuf));
    should.deepEqual(halfCopy, half);

    dbg && cc.tag1(msg + UOK, 'Fraction serialized with avro');
  });
  it('toString()', () => {
    let f12 = new Fraction(1, 2, 'in');
    let f13 = new Fraction(1, 3, 'in');
    let f34 = new Fraction(3, 4, 'in');
    let f18 = new Fraction(1, 8, 'in');
    let f232 = new Fraction(2, 32, 'in');
    let f1632 = new Fraction(16, 32, 'in');
    let f254 = new Fraction(254, 100, 'cm');
    should(f12.toString()).equal('1/2in');
    should(f13.toString()).equal('1/3in');
    should(f34.toString()).equal('3/4in');
    should(f18.toString()).equal('1/8in');
    should(f232.toString()).equal('2/32in');
    should(f232.toString({ fixed: 1 })).equal('0.1in');
    should(f232.reduce().toString()).equal('1/16in');
    should(f1632.toString()).equal('0.5in');
    should(f1632.reduce().toString()).equal('1/2in');
    should(f254.toString()).equal('2.54cm');
  });
  it('patch', () => {
    let f = new Fraction(4, 5, 'F');
    f.patch({ numerator: 3 });
    should.deepEqual(f, new Fraction(3, 5, 'F'));
    f.patch({ denominator: 7 });
    should.deepEqual(f, new Fraction(3, 7, 'F'));
    f.patch({ units: 'Fahrenheit' });
    should.deepEqual(f, new Fraction(3, 7, 'Fahrenheit'));
  });
});
