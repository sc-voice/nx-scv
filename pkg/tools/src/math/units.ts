/**
 * Unit Conversion System
 *
 * Provides conversion between different units of measurement using fractional
 * arithmetic for exact results. Supports length, temperature, time, and weight
 * conversions with customizable unit definitions.
 *
 * Each unit has a canonical abbreviation (e.g., 'in', 'ft', 'm') and may have
 * multiple aliases (e.g., 'inch', 'foot', 'meter'). Conversions resolve aliases
 * to canonical abbreviations for lookup.
 *
 * Conversions use linear transformation matrices [a, b, c, d] where:
 *   numerator' = a * numerator + b * denominator
 *   denominator' = c * numerator + d * denominator
 */

import { DBG } from '../defines.js';
const { U3S } = DBG.S5H;
import { Unicode } from '../text/unicode.js';
import { Fraction } from './fraction.js';
const { CHECKMARK: UOK, RIGHT_ARROW: URA } = Unicode;
import { ColorConsole } from '../text/color-console.js';
const { cc } = ColorConsole;

interface ConversionMatrix {
  [key: string]: number[];
}

interface UnitDefinition {
  aliases: string[];
  from?: { [key: string]: number[] };
}

interface UnitMap {
  [key: string]: UnitDefinition;
}

const DEFAULT_LENGTH: UnitMap = {
  in: {
    aliases: ['inch'],
    from: {
      ft: [12, 0, 0, 1],
      mm: [10, 0, 0, 254],
      cm: [100, 0, 0, 254],
      m: [100 * 100, 0, 0, 254],
    },
  },
  ft: {
    aliases: ['foot', 'feet'],
    from: {
      in: [1, 0, 0, 12],
      mm: [100, 0, 0, 10 * 254 * 12],
      cm: [100, 0, 0, 254 * 12],
      m: [100 * 100, 0, 0, 254 * 12],
    },
  },
  m: {
    aliases: ['meter', 'metre'],
    from: {
      mm: [1, 0, 0, 1000],
      cm: [1, 0, 0, 100],
      ft: [12 * 254, 0, 0, 100 * 100],
      in: [254, 0, 0, 100 * 100],
    },
  },
  cm: {
    aliases: ['centimeter', 'centimetre'],
    from: {
      in: [254, 0, 0, 100],
      ft: [12 * 254, 0, 0, 100],
      mm: [1, 0, 0, 10],
      m: [1, 0, 0, 100],
    },
  },
  mm: {
    aliases: ['millimeter', 'millimetre'],
  },
}; // DEFAULT_LENGTH

const DEFAULT_TEMPERATURE: UnitMap = {
  F: {
    aliases: ['Fahrenheit'],
    from: {
      C: [9, 160, 0, 5],
    },
  },
  C: {
    aliases: ['Centigrade'],
    from: {
      F: [5, -5 * 32, 0, 9],
    },
  },
};

const DEFAULT_TIME: UnitMap = {
  ms: {
    aliases: ['millisecond', 'milliseconds'],
    from: {
      s: [1000, 0, 0, 1],
      min: [60 * 1000, 0, 0, 1],
      h: [60 * 60 * 1000, 0, 0, 1],
      d: [24 * 60 * 60 * 1000, 0, 0, 1],
    },
  },
  s: {
    aliases: ['seconds'],
    from: {
      ms: [1, 0, 0, 1000],
      min: [60, 0, 0, 1],
      h: [60 * 60, 0, 0, 1],
      d: [24 * 60 * 60, 0, 0, 1],
    },
  },
  min: {
    aliases: ['minutes'],
    from: {
      ms: [1, 0, 0, 60 * 1000],
      s: [1, 0, 0, 60],
      h: [60, 0, 0, 1],
      d: [24 * 60, 0, 0, 1],
    },
  },
  h: {
    aliases: ['hour', 'hours', 'hr'],
    from: {
      ms: [1, 0, 0, 60 * 60 * 1000],
      s: [1, 0, 0, 60 * 60],
      min: [1, 0, 0, 60],
      d: [24, 0, 0, 1],
    },
  },
  d: {
    aliases: ['day', 'days'],
    from: {
      ms: [1, 0, 0, 24 * 60 * 60 * 1000],
      s: [1, 0, 0, 24 * 60 * 60],
      min: [1, 0, 0, 24 * 60],
      h: [1, 0, 0, 24],
    },
  },
}; // DEFAULT_TIME

const G_OZ = new Fraction(10000000000, 352739619);

const DEFAULT_WEIGHT: UnitMap = {
  mg: {
    aliases: ['milligram', 'milligrams'],
    from: {
      kg: [1000 * 1000, 0, 0, 1],
      g: [1000, 0, 0, 1],
      oz: [G_OZ.n * 1000, 0, 0, G_OZ.d],
      lb: [16 * G_OZ.n * 1000, 0, 0, G_OZ.d],
    },
  },
  g: {
    aliases: ['gram', 'grams'],
    from: {
      kg: [1000, 0, 0, 1],
      mg: [1, 0, 0, 1000],
      oz: [G_OZ.n, 0, 0, G_OZ.d],
      lb: [16 * G_OZ.n, 0, 0, G_OZ.d],
    },
  },
  kg: {
    aliases: ['kilogram', 'kilograms'],
    from: {
      g: [1, 0, 0, 1000],
      mg: [1, 0, 0, 1000 * 1000],
      oz: [G_OZ.n, 0, 0, 1000 * G_OZ.d],
      lb: [16 * G_OZ.n, 0, 0, 1000 * G_OZ.d],
    },
  },
  oz: {
    aliases: ['ounce', 'ounces'],
    from: {
      g: [G_OZ.d, 0, 0, G_OZ.n],
      kg: [G_OZ.d * 1000, 0, 0, G_OZ.n],
      lb: [16, 0, 0, 1],
    },
  },
  lb: {
    aliases: ['pound', 'pounds', 'lbs'],
    from: {
      oz: [1, 0, 0, 16],
      g: [G_OZ.d, 0, 0, 16 * G_OZ.n],
      kg: [1000 * G_OZ.d, 0, 0, 16 * G_OZ.n],
    },
  },
};

const DEFAULT_UNITS: UnitMap = Object.assign(
  {},
  DEFAULT_LENGTH,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIME,
  DEFAULT_WEIGHT,
);

interface UnitsConfig {
  unitMap?: UnitMap;
}

/**
 * Unit conversion system supporting length, temperature, time, and weight.
 * Uses fractional arithmetic for exact conversions.
 */
export class Units {
  private abbrMap: { [key: string]: string };
  private unitMap: UnitMap;

  /**
   * Create a new Units converter.
   * @param cfg - Optional configuration with custom unit definitions
   */
  constructor(cfg: UnitsConfig = {}) {
    let { unitMap = DEFAULT_UNITS } = cfg;
    this.unitMap = unitMap;
    this.abbrMap = Object.entries(unitMap).reduce((a, entry) => {
      const [abbr, def] = entry;
      const { aliases } = def;
      a[abbr] = abbr;
      aliases.forEach((n) => {
        a[n] = abbr;
      });
      return a;
    }, {} as { [key: string]: string });
  }

  /**
   * Get standard abbreviation for a unit name.
   * Resolves aliases to canonical abbreviations.
   * @param unit - Unit name or alias
   * @returns Canonical abbreviation
   */
  abbreviation(unit: string): string {
    let d9t = this.abbrMap[unit];
    return d9t == null ? unit : d9t;
  }

  /**
   * Convert a Fraction value from one unit to another.
   * @param vSrc - Source fraction with units
   * @returns Object with to() method for target unit conversion
   */
  convertFraction(vSrc: Fraction): { to: (uDst: string) => Fraction } {
    const msg = 'u3s.convertFraction';
    const dbg = U3S.CONVERT_FRACTION;
    let { n, d, units: uSrc } = vSrc;
    let srcAbbr = this.abbreviation(uSrc);
    let convertTo = (uDst: string): Fraction => {
      let dstAbbr = this.abbreviation(uDst);
      let vDst: Fraction | undefined;
      if (dstAbbr === srcAbbr) {
        vDst = new Fraction(n, d, uDst);
        dbg && cc.ok1(msg + 1 + UOK, vSrc, URA, vDst);
      } else {
        let dstBase = this.unitMap[dstAbbr];
        let srcMatrix = dstBase?.from?.[srcAbbr];
        if (srcMatrix) {
          let nDst = srcMatrix[0] * n + srcMatrix[1] * d;
          let dDst = srcMatrix[2] * n + srcMatrix[3] * d;
          vDst = new Fraction(nDst, dDst, uDst).reduce();
          dbg && cc.ok1(msg + 2 + UOK, vSrc, URA, vDst);
        } // srcMatrix
      } // dstAbbr !== srcAbbr
      if (vDst == null) {
        vDst = vSrc;
        dbg && cc.ok1(msg + 3 + UOK, vSrc, URA, vDst);
      }
      return vDst;
    };

    return { to: convertTo };
  } // convertFraction

  /**
   * Convert a value from one unit to another.
   * @param value - Fraction value with units to convert
   * @returns Object with to() method for target unit conversion
   */
  convert(value: Fraction): { to: (uDst: string) => Fraction } {
    if (value instanceof Fraction) {
      return this.convertFraction(value);
    }

    throw new Error(`value?${value}`);
  } // convert
} // Units
