export class Fraction {
  constructor(...args) {
    const msg = 'Fraction.ctor:';
    let cfg = args[0];

    if (typeof cfg === 'object') {
      this.put(args[0]);
    } else {
      let [numerator, denominator, units] = args;

      this.put({ numerator, denominator, units });
    }
  }

  static get SCHEMA_FIELDS() {
    return [
      { name: 'numerator', type: 'int' },
      { name: 'denominator', type: 'int' },
      { name: 'units', type: 'string' },
    ];
  }

  static get SCHEMA() {
    return {
      name: 'Fraction',
      namespace: 'scVoice.tools.scvMath',
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

  put(json = {}) {
    let { numerator = null, denominator = 1, units = '' } = json;
    Object.assign(this, { numerator, denominator, units });
  }

  patch(json = {}) {
    let { numerator, denominator, units } = json;
    if (numerator != null) {
      this.numerator = numerator;
    }
    if (denominator != null) {
      this.denominator = denominator;
    }
    if (units != null) {
      this.units = units;
    }
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
    let { numerator, denominator } = this;
    return numerator == null ? null : numerator / denominator;
  }

  increment(delta = 1) {
    this.numerator += Math.round(delta);
    return this;
  }

  reduce() {
    let { numerator: n, denominator: d, units } = this;
    if (Number.isInteger(n) && Number.isInteger(d)) {
      let g = Fraction.gcd(n, d);
      if (g) {
        this.numerator /= g;
        this.denominator /= g;
      }
    }
    return this;
  }

  toString(cfg = {}) {
    let { units, numerator: n, denominator: d, value } = this;
    let s;
    if (n == null) {
      return n;
    }
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
