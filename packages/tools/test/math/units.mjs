import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Units, Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { RIGHT_ARROW: URA } = Unicode;
const { cc } = ColorConsole;

import should from 'should';

const dbg = 0;
const units = new Units();
const G_OZ = new Fraction(10000000000, 352739619);

function testConvert(msg, srcN, srcD, srcU, dstN, dstD, dstU) {
  let src = new Fraction(srcN, srcD, srcU);
  let dst = new Fraction(dstN, dstD, dstU).reduce();
  dbg && cc.fyi(msg, src, URA, dst);

  should.deepEqual(units.convert(src).to(dstU), dst);
  should.deepEqual(units.convert(src).to(srcU), src);
}

describe('units', () => {
  it('convert to C', () => {
    const msg = 'u3s.convert.C';
    testConvert(msg, 32, 1, 'F', 0, 1, 'C');
    testConvert(msg, 32, 1, 'F', 0, 1, 'Centigrade');
    testConvert(msg, 32, 1, 'Fahrenheit', 0, 1, 'Centigrade');
    testConvert(msg, 32, 1, 'Fahrenheit', 0, 1, 'C');

    testConvert(msg, 212, 1, 'F', 100, 1, 'C');
  });
  it('convert F', () => {
    const msg = 'u3s.convert.F';
    testConvert(msg, 0, 1, 'C', 32, 1, 'F');
    testConvert(msg, 100, 1, 'C', 212, 1, 'F');
    testConvert(msg, 0, 1, 'Centigrade', 32, 1, 'Fahrenheit');
    testConvert(msg, 0, 1, 'Centigrade', 32, 1, 'F');
    testConvert(msg, 0, 1, 'C', 32, 1, 'Fahrenheit');
  });
  it('convert to nonsense', () => {
    const msg = 'u3s.convert';
    dbg && cc.tag1(msg, 'BEGIN');

    let C0 = new Fraction(0, 1, 'C');
    let F32 = new Fraction(32, 1, 'F');

    dbg && cc.tag(msg, 'illegal conversions are ignored');
    should(units.convert(C0).to('nonsense'), C0);
    should(units.convert(F32).to('nonsense'), F32);

    dbg && cc.tag1(msg, 'END');
  });
  it('convert to cm', () => {
    const msg = 'u3s.convert.cm';
    testConvert(msg, 1, 1, 'in', 254, 100, 'cm');
    testConvert(msg, 1, 2, 'ft', 6*254, 100, 'cm');
    testConvert(msg, 2, 1, 'mm', 2, 10, 'cm');
    testConvert(msg, 1, 2, 'meter', 1, 200, 'cm');
  });
  it('convert to in', () => {
    const msg = 'u3s.convert.in';
    testConvert(msg, 254, 100, 'cm', 1, 1, 'in');
    testConvert(msg, 3*254, 4*100, 'centimetre', 3, 4, 'in');
    testConvert(msg, 1, 2, 'foot', 6, 1, 'in');
    testConvert(msg, 254, 100, 'mm', 1, 10, 'in');
    testConvert(msg, 254, 100, 'm', 100, 1, 'in');
  });
  it('convert to ft', () => {
    const msg = 'u3s.convert.ft'
    testConvert(msg, 1, 1, 'mm', 10, 12*254, 'ft');
    testConvert(msg, 1, 1, 'cm', 100, 12*254, 'ft');
    testConvert(msg, 1, 1, 'm', 100*100, 12*254, 'ft');
    testConvert(msg, 1, 1, 'in', 1, 12, 'ft');
  });
  it('convert to m', () => {
    const msg = 'u3s.convert.ms';
    testConvert(msg, 1, 1, 'mm', 1, 1000, 'm');
    testConvert(msg, 1, 1, 'cm', 1, 100, 'm');
    testConvert(msg, 1, 1, 'in', 254, 100*100, 'm');
    testConvert(msg, 1, 1, 'ft', 254*12, 100*100, 'm');
  });

  it('convert to ms', () => {
    const msg = 'u3s.convert.ms';
    testConvert(msg, 1, 2, 's', 500, 1, 'ms');
    testConvert(msg, 10, 1, 'min', 10*60*1000, 1, 'ms');
    testConvert(msg, 3, 4, 'hour', 3*60*60*1000, 4, 'ms');
    testConvert(msg, 2, 24, 'd', 2 * 24 * 60 * 60*1000, 24, 'ms');
  });
  it('convert to s', () => {
    const msg = 'u3s.convert.s';
    testConvert(msg, 1000, 2, 'ms', 1, 2, 's');
    testConvert(msg, 10, 1, 'min', 10*60, 1, 's');
    testConvert(msg, 3, 4, 'hour', 3*60*60, 4, 's');
    testConvert(msg, 2, 24, 'd', 2 * 24 * 60 * 60, 24, 's');
  });
  it('convert to min', () => {
    const msg = 'u3s.convert.min';
    testConvert(msg, 1000, 2, 'ms', 1, 2 * 60, 'min');
    testConvert(msg, 600, 1, 's', 10, 1, 'min');
    testConvert(msg, 3, 4, 'hour', 45, 1, 'min');
    testConvert(msg, 2, 24, 'd', 2 * 24 * 60, 24, 'min');
  });
  it('convert to h', () => {
    const msg = 'u3s.convert.h';
    testConvert(msg, 1000, 2, 'ms', 1, 2 * 60 * 60, 'h');
    testConvert(msg, 600, 1, 's', 10, 60, 'h');
    testConvert(msg, 10, 1, 'min', 10, 60, 'h');
    testConvert(msg, 2, 24, 'd', 2 * 24, 24, 'h');
  });
  it('convert to mg', () => {
    const msg = 'u3s.convert.mg';
    testConvert(msg, 1, 1, 'kg', 1000*1000, 1, 'mg');
    testConvert(msg, 1, 1, 'kg', 1000*1000, 1, 'milligram');
    testConvert(msg, 1, 1, 'kg', 1000*1000, 1, 'milligrams');

    testConvert(msg, 1, 1, 'g', 1000, 1, 'mg');
    testConvert(msg, 1, 1, 'oz', G_OZ.n*1000, G_OZ.d, 'mg');
    testConvert(msg, 1, 1, 'lb', 16*G_OZ.n*1000, G_OZ.d, 'mg');
  });
  it('convert to g', () => {
    const msg = 'u3s.convert.g';
    testConvert(msg, 1, 1, 'kg', 1000, 1, 'g');
    testConvert(msg, 1, 1, 'kg', 1000, 1, 'gram');
    testConvert(msg, 1, 1, 'kg', 1000, 1, 'grams');

    testConvert(msg, 1000, 1, 'mg', 1, 1, 'g');
    testConvert(msg, 1, 1, 'oz', G_OZ.n, G_OZ.d, 'g');
    testConvert(msg, 1, 16, 'lb', G_OZ.n, G_OZ.d, 'g');
  });
  it('convert to kg', () => {
    const msg = 'u3s.convert.kg';
    testConvert(msg, 1, 1, 'g', 1, 1000, 'kg');
    testConvert(msg, 1, 1, 'g', 1, 1000, 'kilogram');
    testConvert(msg, 1, 1, 'g', 1, 1000, 'kilograms');

    testConvert(msg, 1000*1000, 1, 'mg', 1, 1, 'kg');
    testConvert(msg, 1, 1, 'oz', G_OZ.n, 1000*G_OZ.d, 'kg');
    testConvert(msg, 1, 16, 'lb', G_OZ.n, 1000*G_OZ.d, 'kg');
  });
  it('convert to oz', () => {
    const msg = 'u3s.convert.oz';
    testConvert(msg, 1, 1, 'lb', 16, 1, 'oz');
    testConvert(msg, 1, 1, 'lb', 16, 1, 'ounce');
    testConvert(msg, 1, 1, 'lb', 16, 1, 'ounces');

    testConvert(msg, 100, 1, 'g', 100*G_OZ.d, G_OZ.n, 'oz');
    testConvert(msg, 1, 1, 'kg', 1000*G_OZ.d, G_OZ.n, 'oz');
  });
  it('convert to lb', () => {
    const msg = 'u3s.convert.lb';
    testConvert(msg, 1, 1, 'oz', 1, 16, 'lb');
    testConvert(msg, 1, 1, 'oz', 1, 16, 'lbs');
    testConvert(msg, 1, 1, 'oz', 1, 16, 'pound');
    testConvert(msg, 1, 1, 'oz', 1, 16, 'pounds');

    testConvert(msg, 100, 1, 'g', 100*G_OZ.d, 16*G_OZ.n, 'lb');
    testConvert(msg, 1, 1, 'kg', 1000*G_OZ.d, 16*G_OZ.n, 'lb');
  });
});
