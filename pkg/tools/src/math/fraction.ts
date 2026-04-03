import { DBG } from '../defines.js';
import { ColorConsole } from '../text/color-console.js';
import { Unicode } from '../text/unicode.js';

const { CHECKMARK: UOK } = Unicode;
const { FRACTION: F6N } = DBG;
const { cc } = ColorConsole;

interface FractionConfig {
  isNull?: boolean;
  numerator?: number;
  denominator?: number;
  units?: string;
}

interface ToStringConfig {
  asRange?: string;
  fixed?: number;
}

export class Fraction {
  numerator: number = 0;
  denominator: number = 1;
  units: string = '';
  isNull?: boolean;

  constructor(...args: any[]) {
    const msg = 'Fraction.ctor:';
    let cfg = args[0];
    let numerator: number;
    let denominator: number;
    let units: string;
    let isNull: boolean;

    if (cfg && typeof cfg === 'object') {
      let { isNull: i4l, numerator: n, denominator: d, units: u } = cfg;
      isNull = i4l;
      numerator = n;
      denominator = d;
      units = u;
    } else {
      let [n, d = 1, u = ''] = args;
      isNull = false;
      numerator = n;
      denominator = d;
      units = u;
    }

    this.put({ isNull, numerator, denominator, units });

    // Define isNull as getter that reads from put()
    let _isNull = isNull || numerator == null;
    Object.defineProperty(this, 'isNull', {
      enumerable: true,
      get() {
        return _isNull;
      },
    });
  }

  static gcd(a: number, b: number): number {
    if (b === 0) {
      return a;
    }
    return Fraction.gcd(b, a % b);
  }

  put(json: FractionConfig = {}): void {
    let { isNull, numerator, denominator = 1, units = '' } = json;

    if (isNull || numerator == null) {
      Object.defineProperty(this, 'isNull', {
        enumerable: true,
        value: true,
        configurable: true,
      });
      numerator = 0;
      denominator = 1;
    } else {
      Object.defineProperty(this, 'isNull', {
        enumerable: true,
        value: false,
        configurable: true,
      });
    }
    Object.assign(this, { numerator, denominator, units });
  }

  patch(json: FractionConfig = {}): void {
    let {
      numerator = this.n,
      denominator = this.d,
      units = this.units,
    } = json;

    this.put({ numerator, denominator, units });
  }

  get remainder(): number {
    let { n, d } = this;
    return n % d;
  }

  get difference(): number {
    let { n, d } = this;
    return n - d;
  }

  get percent(): string {
    return (this.value! * 100).toFixed(0) + '%';
  }

  get n(): number {
    return this.numerator;
  }

  set n(value: number) {
    this.numerator = Number(value);
  }

  get d(): number {
    return this.denominator;
  }

  set d(value: number) {
    this.denominator = Number(value);
  }

  get value(): number | null {
    let { numerator, denominator } = this;
    return (this as any).isNull ? null : numerator / denominator;
  }

  increment(delta: number = 1): this {
    this.numerator += Math.round(delta);
    return this;
  }

  reduce(): this {
    const msg = 'f6n.reduce';
    const dbg = F6N.REDUCE;
    let { numerator: n, denominator: d } = this;
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

  toString(cfg: ToStringConfig = {}): string {
    let { units, numerator: n, denominator: d, value } = this;
    let s: string;
    if ((this as any).isNull) {
      s = '?';
    } else {
      let { asRange, fixed = 2 } = cfg;
      if (asRange == null) {
        let sFraction = `${n}/${d}`;
        let sValue = value!.toString();
        let sFixed = value!.toFixed(fixed);
        s = sValue.length < sFixed.length ? sValue : sFixed;
        s = s.length < sFraction.length ? s : sFraction;
      } else {
        let sRange = `${n}${asRange}${d}`;
        s = sRange;
      }
    }
    return units ? `${s}${units}` : s;
  }

  add(f: Fraction): Fraction {
    const msg = 'Fraction.add:';
    let { numerator: n1, denominator: d1, units: u1 } = this;
    let { numerator: n2, denominator: d2, units: u2 } = f;
    if (this.units !== f.units) {
      throw new Error(`${msg} units? "${u1}" vs. "${u2}"`);
    }

    return new (this.constructor as typeof Fraction)(n1 * d2 + n2 * d1, d1 * d2).reduce();
  }
}
