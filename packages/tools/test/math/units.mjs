import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Units, Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;

import should from 'should';

const dbg = 0;

describe('TESTTESTunits', () => {
  it('convert F to C', () => {
    const msg = 'u3s.convertFraction';
    let units = new Units();
    let F32 = new Fraction(32, 1, 'F');
    let F212 = new Fraction(212, 1, 'Fahrenheit');
    should.deepEqual(units.convert(F32).to('C'), new Fraction(0, 1, 'C'));
    should.deepEqual(
      units.convert(F32).to('Centigrade'),
      new Fraction(0, 1, 'Centigrade'),
    );
    should.deepEqual(
      units.convert(F212).to('C'),
      new Fraction(100, 1, 'C'),
    );
    should.deepEqual(
      units.convert(F212).to('Centigrade'),
      new Fraction(100, 1, 'Centigrade'),
    );

    // convert to same value
    should.deepEqual(units.convert(F32).to('F'), F32);
    should.deepEqual(
      units.convert(F32).to('Fahrenheit'),
      new Fraction(32, 1, 'Fahrenheit'),
    );
  });
  it('convert C to F', () => {
    const msg = 'u3s.convertFraction';
    let units = new Units();
    let C0 = new Fraction(0, 1, 'C');
    let C100 = new Fraction(100, 1, 'Centigrade');
    should.deepEqual(units.convert(C0).to('F'), new Fraction(32, 1, 'F'));
    should.deepEqual(
      units.convert(C0).to('Fahrenheit'),
      new Fraction(32, 1, 'Fahrenheit'),
    );
    should.deepEqual(
      units.convert(C100).to('F'),
      new Fraction(212, 1, 'F'),
    );
    should.deepEqual(
      units.convert(C100).to('Fahrenheit'),
      new Fraction(212, 1, 'Fahrenheit'),
    );

    // convert to same value
    should.deepEqual(units.convert(C0).to('C'), C0);
    should.deepEqual(
      units.convert(C0).to('Centigrade'),
      new Fraction(0, 1, 'Centigrade'),
    );
  });
  it('convert to nonsense', () => {
    const msg = 'u3s.convertFraction';
    dbg && cc.tag1(msg, 'BEGIN');

    let units = new Units();
    let C0 = new Fraction(0, 1, 'C');
    let F32 = new Fraction(32, 1, 'F');

    dbg && cc.tag(msg, 'illegal conversions are ignored');
    should(units.convert(C0).to('nonsense'), C0);
    should(units.convert(F32).to('nonsense'), F32);

    dbg && cc.tag1(msg, 'END');
  });
  it('TESTTESTconvert in to cm', () => {
    const msg = 'u3s.convertFraction.in.cm';
    let units = new Units();
    let IN1 = new Fraction(1, 1, 'in');
    let IN34 = new Fraction(3, 4, 'inch');
    should.deepEqual(
      units.convert(IN1).to('cm'),
      new Fraction(254, 100, 'cm').reduce(),
    );
    should.deepEqual(
      units.convert(IN34).to('centimeter'),
      new Fraction(3 * 254, 4 * 100, 'centimeter').reduce(),
    );

    // convert to same value
    should.deepEqual(units.convert(IN34).to('inch'), IN34);
    should.deepEqual(
      units.convert(IN1).to('inch'),
      new Fraction(1, 1, 'inch'),
    );
  });
  it('TESTTESTconvert in to cm', () => {
    const msg = 'u3s.convertFraction.cm.in';
    let units = new Units();
    let CM1 = new Fraction(254, 100, 'cm');
    let CM34 = new Fraction(3*254, 4*100, 'centimeter');
    should.deepEqual(
      units.convert(CM1).to('in'),
      new Fraction(1,1, 'in'),
    );
    should.deepEqual(
      units.convert(CM34).to('inch'),
      new Fraction(3, 4, 'inch'),
    );
  });
});
