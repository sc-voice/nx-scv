export class Activation {
  constructor(opts = {}) {
    const msg = 'A8n.ctor';
    let { a, b, c, d, fEval, dEval } = opts;
    if (fEval == null) {
      throw new Error(`${msg} fEval?`);
    }
    this.fEval = fEval;
    if (dEval == null) {
      throw new Error(`${msg} dEval?`);
    }
    this.dEval = dEval;

    if (a != null) {
      this.a = a;
    }
    if (b != null) {
      this.b = b;
    }
    if (c != null) {
      this.c = c;
    }
    if (d != null) {
      this.d = d;
    }
  }

  f(x) {
    let { fEval, a, b, c, d } = this;
    return fEval(x, a, b, c, d);
  }

  df(x) {
    let { dEval, a, b, c, d } = this;
    return dEval(x, a, b, c, d);
  }

  // https://en.wikipedia.org/wiki/Soboleva_modified_hyperbolic_tangent
  static createSoboleva(a = 1, b = 1, c = 1, d = 1) {
    const msg = 'a8n.createSoboleva';
    let fEval = (x, a, b, c, d) => {
      return (
        (Math.exp(a * x) - Math.exp(-b * x)) /
        (Math.exp(c * x) + Math.exp(-d * x))
      );
    };
    let dEval = (x, a, b, c, d) => {
      console.log(msg, 'UNTESTED');
      return (
        (a * Math.exp(a * x) + b * Math.exp(-b * x)) /
          (Math.exp(c * x) + Math.exp(-d * x)) -
        (fEval(x, a, b, c, d) *
          (c * Math.exp(c * x) - d * Math.exp(-d * x))) /
          (Math.exp(c * x) + Math.exp(-d * x))
      );
    };

    return new Activation({ a, b, c, d, fEval, dEval });
  }

  static createRareN(a = 100, b = 1) {
    let fEval = (x, a) =>
      x < 1 ? 1 : 1 - Math.exp(((x - a) / x) * b);
    let dEval = (x, a) =>
      x < 1 ? 0 : -(a * b * fEval(x, a, b)) / (x * x);
    return new Activation({ a, b, fEval, dEval });
  }

  static createElu(a = 0) {
    let fEval = (x) => (x >= 0 ? x : a * (Math.exp(x) - 1));
    let dEval = (x) => 'TBD';
    //let dEval = (x) => (x >= 0 ? 1 : fEval(x,a)+a);
    return new Activation({ a, fEval, dEval });
  }
}
