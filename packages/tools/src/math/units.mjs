import { DBG } from '../../src/defines.mjs';
const { U3S } = DBG.S5H;
import { Unicode } from '../text/unicode.mjs';
import { Fraction } from './fraction.mjs';
const { CHECKMARK: UOK, RIGHT_ARROW: URA } = Unicode;
import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;

const SHORT_UNIT = {
  inch: 'in',
  metre: 'm',
  meter: 'm',
  centimeter: 'cm',
  centimetre: 'cm',
  millimeter: 'mm',
  millimetre: 'mm',
  Fahrenheit: 'F',
  Centigrade: 'C',
};

export class Units {
  constructor() {}

  shortUnit(unit) {
    let d9t = SHORT_UNIT[unit];
    return d9t == null ? unit : d9t;
  }

  convertFraction(vSrc) {
    const msg = 'u3s.convertFraction';
    const dbg = U3S.CONVERT_FRACTION;
    let { n, d, units: uSrc } = vSrc;
    let convertTo;
    let vDst = vSrc;
    let convertUnit = (uDst) => {
      vDst = new Fraction(n, d, uDst);
      dbg && cc.ok1(msg + 1 + UOK, vSrc, URA, vDst);
    };
    let suSrc = this.shortUnit(uSrc);

    switch (suSrc) {
      case 'in': {
        convertTo = (uDst) => {
          switch (this.shortUnit(uDst)) {
            case 'cm':
              vDst = new Fraction(n * 254, d * 100, uDst).reduce();
              dbg && cc.ok1(msg + 2.1 + UOK, vSrc, URA, vDst);
              break;
            case suSrc:
              convertUnit(uDst);
              break;
            default:
              dbg && cc.bad1(msg + 2.2, `uDst:${uDst}?`);
              break;
          }
          return vDst;
        };
        break;
      }
      case 'F': {
        convertTo = (uDst) => {
          switch (this.shortUnit(uDst)) {
            case 'C':
              vDst = new Fraction((n - 32 * d) * 5, 9 * d, uDst).reduce();
              dbg && cc.ok1(msg + 3.1 + UOK, vSrc, URA, vDst);
              break;
            case suSrc:
              convertUnit(uDst);
              break;
            default:
              dbg && cc.bad1(msg + 3.2, `uDst:${uDst}?`);
              break;
          }
          return vDst;
        };
        break;
      }
      case 'Centigrade':
      case 'C':
        convertTo = (uDst) => {
          switch (this.shortUnit(uDst)) {
            case 'F':
              vDst = new Fraction(9 * n + 160 * d, 5 * d, uDst).reduce();
              dbg && cc.ok1(msg + 4.1 + UOK, vSrc, URA, vDst);
              break;
            case 'C':
              convertUnit(uDst);
              break;
            default:
              dbg && cc.bad1(msg + 4.2, `uDst:${uDst}?`);
              break;
          }
          return vDst;
        };
        break;
      default:
        convertTo = (uDst) => `uSrc:${uSrc}?`;
        break;
    }

    return { to: convertTo };
  } // convertFraction

  convert(value) {
    if (value instanceof Fraction) {
      return this.convertFraction(value);
    }

    throw new Error(`value?${value}`);
  } // convert
} // Units
