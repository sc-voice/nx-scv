import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Units, Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;

import should from 'should';

describe('TESTTESTunits', () => {
  it('convert F to C', () => {
    const msg = 'u3s.convertFraction';
    let units = new Units();
    let F32 = new Fraction(32, 1, 'F');
    let F212 = new Fraction(212, 1, 'F');
    should.deepEqual(units.convert(F32).to('C'), new Fraction(0, 1, 'C'));
    should.deepEqual(
      units.convert(F212).to('C'),
      new Fraction(100, 1, 'C'),
    );
  });
  it('convert C to F', () => {
    const msg = 'u3s.convertFraction';
    let units = new Units();
    let C0 = new Fraction(0, 1, 'C');
    let C100 = new Fraction(100, 1, 'C');
    should.deepEqual(units.convert(C0).to('F'), new Fraction(32, 1, 'F'));
    should.deepEqual(
      units.convert(C100).to('F'),
      new Fraction(212, 1, 'F'),
    );
  });
});
