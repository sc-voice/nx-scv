import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: UOK } = Unicode;
const { F6N } = DBG.M2H;
const { cc } = ColorConsole;

export class Fraction {
  #isNull;
  constructor(...args) {
    const msg = 'Fraction.ctor:';
    let cfg = args[0];
    let numerator;
    let denominator;
    let units;
    let isNull;

    if (cfg && typeof cfg === 'object') {
      let { isNull: i4l, numerator: n, denominator: d, units: u } = cfg;
      isNull = i4l;
      numerator = n;
      denominator = d;
      units = u;
    } else {
      let [n, d = 1, u = ''] = args;
      numerator = n;
      denominator = d;
      units = u;
    }

    this.put({ isNull, numerator, denominator, units });
  }

  static get SCHEMA_FIELDS() {
    return [
      { name: 'isNull', type: 'boolean' },
      { name: 'numerator', type: 'double' },
      { name: 'denominator', type: 'double' },
      { name: 'units', type: 'string' },
    ];
  }

  static get SCHEMA() {
    return {
      name: 'Fraction',
      namespace: 'scvoice.scvMath',
      type: 'record',
      fields: Fraction.SCHEMA_FIELDS,
    };
  }

  static gcd(a, b) {
    if (b === 0) {
      return a;
    }
    return Fraction.gcd(b, a % b);
  }

  get isNull() {
    return this.#isNull;
  }

  put(json = {}) {
    let { isNull, numerator, denominator = 1, units = '' } = json;

    if (isNull || numerator == null) {
      this.#isNull = true;
      numerator = 0;
      denominator = 1;
    } else {
      this.#isNull = false;
    }
    Object.assign(this, { numerator, denominator, units });
  }

  patch(json = {}) {
    let {
      numerator = this.n,
      denominator = this.d,
      units = this.units,
    } = json;

    this.put({ numerator, denominator, units });
  }

  get remainder() {
    let { n, d } = this;

    return n % d;
  }

  get difference() {
    let { n, d } = this;
    return n - d;
  }

  get percent() {
    return (this.value * 100).toFixed(0) + '%';
  }

  get n() {
    return this.numerator;
  }

  set n(value) {
    this.numerator = Number(value);
  }

  get d() {
    return this.denominator;
  }

  set d(value) {
    this.denominator = Number(value);
  }

  get value() {
    let { isNull, numerator, denominator } = this;
    return isNull ? null : numerator / denominator;
  }

  increment(delta = 1) {
    this.numerator += Math.round(delta);
    return this;
  }

  reduce() {
    const msg = 'f6n.reduce';
    const dbg = F6N.REDUCE;
    let { numerator: n, denominator: d, units } = this;
    if (Number.isInteger(n) && Number.isInteger(d)) {
      let g = Fraction.gcd(n, d);
      if (g) {
        this.numerator /= g;
        this.denominator /= g;
      }
      dbg && cc.ok1(msg + UOK, this.n, '/', this.d);
    } else {
      // Is this useful?
      for (let i = 0; i < 20; i++) {
        n *= 10;
        d *= 10;
        if (Number.isInteger(n) && Number.isInteger(d)) {
          this.n = n;
          this.d = d;
          this.reduce();
          dbg && cc.ok1(msg + UOK, n, '/', d);
          return this;
        }
      }
      throw new Error(
        `${msg} Why are you reducing non-integers? ${n}/${d}`,
      );
    }
    return this;
  }

  toString(cfg = {}) {
    let { isNull, units, numerator: n, denominator: d, value } = this;
    let s;
    if (isNull) {
      s = '?';
    } else {
      let { asRange, fixed = 2 } = cfg;
      if (asRange == null) {
        let sFraction = `${n}/${d}`;
        let sValue = value.toString();
        let sFixed = value.toFixed(fixed);
        s = sValue.length < sFixed.length ? sValue : sFixed;
        s = s.length < sFraction.length ? s : sFraction;
      } else {
        let sRange = `${n}${asRange}${d}`;
        s = sRange;
      }
    }
    return units ? `${s}${units}` : s;
  }

  add(f) {
    const msg = 'Fraction.add:';
    let { numerator: n1, denominator: d1, units: u1 } = this;
    let { numerator: n2, denominator: d2, units: u2 } = f;
    if (this.units !== f.units) {
      throw new Error(`${msg} units? "${u1}" vs. "${u2}"`);
    }

    return new Fraction(n1 * d2 + n2 * d1, d1 * d2).reduce();
  }
}
