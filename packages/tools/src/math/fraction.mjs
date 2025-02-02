export class Fraction {
  constructor(...args) {
    //constructor(numerator, denominator = 1, units = undefined) {
    const msg = 'Fraction.ctor:';
    if (args[0] instanceof Fraction) {
      let { numerator: n, denominator: d, units: u } = args[0];
      args = [n, d, u];
    }
    let [numerator, denominator = 1, units = undefined] = args;

    Object.assign(this, {
      numerator,
      denominator,
      units,
    });
  }

  static gcd(a, b) {
    if (b === 0) {
      return a;
    }
    return Fraction.gcd(b, a % b);
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
    return numerator / denominator;
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

  toString() {
    let { units, numerator: n, denominator: d, value } = this;
    if (n == null || d == null) {
      return `${n}/${d}`;
    }
    if (d < 0) {
      d = -d;
      n = -n;
    }
    let s = d === 1 ? `${n}` : `${n}/${d}`;

    return units ? `${s} ${units}` : s;
  }

  add(f) {
    const msg = 'Fraction.add:';
    let { numerator: n1, denominator: d1, units: u1 } = this;
    let { numerator: n2, denominator: d2, units: u2 } = f;
    if (this.units !== f.units) {
      throw new Error(`${msg} units? ${u1}? ${u2}?`);
    }

    return new Fraction(n1 * d2 + n2 * d1, d1 * d2).reduce();
  }
}
