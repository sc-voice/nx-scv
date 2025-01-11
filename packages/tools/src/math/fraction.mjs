export class Fraction {
  constructor(numerator, denominator = 1, units = undefined) {
    Object.assign(this, {
      numerator,
      denominator,
      units,
    });
  }

  get value() {
    let { numerator, denominator } = this;
    return numerator / denominator;
  }

  static gcd(a, b) {
    if (b === 0) {
      return a;
    }
    return Fraction.gcd(b, a % b);
  }

  reduce() {
    let { numerator:n, denominator:d, units,} = this; 
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
    let { units, numerator, denominator, value } = this;
    let s =
      value === Math.floor(value)
        ? `${value}`
        : `${numerator}/${denominator}`;

    return units ? `${s} ${units}` : s;
  }

  add(f) {
    const msg = 'Fraction.add:';
    let { numerator:n1, denominator:d1, units:u1 } = this;
    let { numerator:n2, denominator:d2, units:u2 } = f;
    if (this.units !== f.units) {
      throw new Error(`${msg} units? ${u1}? ${u2}?`);
    }

    return new Fraction(n1*d2 + n2*d1, d1*d2).reduce();
  }
}
