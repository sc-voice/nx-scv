import { DBG } from '../../src/defines.mjs';
import { Fraction } from './fraction.mjs';
import { Unicode } from '../text/unicode.mjs';
import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;

export class Units {
  constructor() {}

  convertFraction(value) {
    let { n, d, units: uSrc } = value;
    let convertTo;

    switch (uSrc) {
      case 'F': {
        convertTo = (uDst) => {
          let vDst;
          switch (uDst) {
            case 'C':
              vDst = new Fraction((n - 32 * d) * 5, 9 * d, uDst).reduce();
              break;
            default:
              vDst = `uDst:${uDst}?`;
              break;
          }
          return vDst;
        };
        break;
      }
      case 'C':
        convertTo = (uDst) => {
          let vDst;
          switch (uDst) {
            case 'F':
              vDst = new Fraction(9 * n + 160 * d, 5 * d, uDst).reduce();
              break;
            default:
              vDst = `uDst:${uDst}?`;
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
