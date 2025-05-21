import { DBG } from '../../src/defines.mjs';
const { U3S } = DBG.S5H;
import { Unicode } from '../text/unicode.mjs';
import { Fraction } from './fraction.mjs';
const { CHECKMARK: UOK, RIGHT_ARROW: URA } = Unicode;
import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;

const DEFAULT_ABBREVIATIONS = {
  in: ['inch'],
  ft: ['foot'],
  F: ['Fahrenheit'],
  C: ['Centigrade'],
  m: ['meter', 'metre'],
  cm: ['centimeter', 'centimetre'],
  mm: ['millimeter', 'millimetre'],
};

export class Units {
  #abbrMap;
  constructor(cfg = {}) {
    let { abbreviations = DEFAULT_ABBREVIATIONS } = cfg;
    this.#abbrMap = Object.entries(abbreviations).reduce((a, entry) => {
      let [abbr, names] = entry;
      a[abbr] = abbr;
      names.forEach((n) => {
        a[n] = abbr;
      });
      return a;
    }, {});
  }

  abbreviation(unit) {
    let d9t = this.#abbrMap[unit];
    return d9t == null ? unit : d9t;
  }

  convertFraction(vSrc) {
    const msg = 'u3s.convertFraction';
    const dbg = U3S.CONVERT_FRACTION;
    let { n, d, units: uSrc } = vSrc;
    let srcAbbr = this.abbreviation(uSrc);
    let convertTo = (uDst) => {
      let dstAbbr = this.abbreviation(uDst);
      let vDst;
      if (dstAbbr === srcAbbr) {
        vDst = new Fraction(n, d, uDst);
        dbg && cc.ok1(msg + 1 + UOK, vSrc, URA, vDst);
      } else {
        switch (dstAbbr) {
          case 'in':
            switch (srcAbbr) {
              case 'cm':
                vDst = new Fraction(n * 100, d * 254, uDst).reduce();
                dbg && cc.ok1(msg + UOK, vSrc, URA, vDst);
                break;
            }
            break;
          case 'cm':
            switch (srcAbbr) {
              case 'in':
                vDst = new Fraction(n * 254, d * 100, uDst).reduce();
                dbg && cc.ok1(msg + UOK, vSrc, URA, vDst);
                break;
            }
            break;
          case 'C':
            switch (srcAbbr) {
              case 'F':
                vDst = new Fraction(
                  (n - 32 * d) * 5,
                  9 * d,
                  uDst,
                ).reduce();
                dbg && cc.ok1(msg + UOK, vSrc, URA, vDst);
                break;
            }
            break;
          case 'F':
            switch (srcAbbr) {
              case 'C':
                vDst = new Fraction(9 * n + 160 * d, 5 * d, uDst).reduce();
                dbg && cc.ok1(msg + UOK, vSrc, URA, vDst);
                break;
            }
            break;
        }
      }
      if (vDst == null) {
        vDst = vSrc;
        dbg && cc.ok1(msg + UOK, vSrc, URA, vDst);
      }
      return vDst;
    };

    return { to: convertTo };
  } // convertFraction

  convert(value) {
    if (value instanceof Fraction) {
      return this.convertFraction(value);
    }

    throw new Error(`value?${value}`);
  } // convert
} // Units
