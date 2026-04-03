interface ActivationOpts {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  fEval: (x: number, a?: number, b?: number, c?: number, d?: number) => any;
  dEval: (x: number, a?: number, b?: number, c?: number, d?: number) => any;
}

export class Activation {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  fEval: (x: number, a?: number, b?: number, c?: number, d?: number) => any;
  dEval: (x: number, a?: number, b?: number, c?: number, d?: number) => any;

  constructor(opts: ActivationOpts = {} as ActivationOpts) {
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

  f(x: number): any {
    let { fEval, a, b, c, d } = this;
    return fEval(x, a, b, c, d);
  }

  df(x: number): any {
    let { dEval, a, b, c, d } = this;
    return dEval(x, a, b, c, d);
  }

  // https://en.wikipedia.org/wiki/Soboleva_modified_hyperbolic_tangent
  static createSoboleva(a = 1, b = 1, c = 1, d = 1): Activation {
    const msg = 'a8n.createSoboleva';
    let fEval = (x: number, a?: number, b?: number, c?: number, d?: number) => {
      return (
        (Math.exp((a || 1) * x) - Math.exp(-(b || 1) * x)) /
        (Math.exp((c || 1) * x) + Math.exp(-(d || 1) * x))
      );
    };
    let dEval = (x: number, a?: number, b?: number, c?: number, d?: number) => {
      console.log(msg, 'UNTESTED');
      return (
        ((a || 1) * Math.exp((a || 1) * x) + (b || 1) * Math.exp(-(b || 1) * x)) /
          (Math.exp((c || 1) * x) + Math.exp(-(d || 1) * x)) -
        (fEval(x, a, b, c, d) *
          ((c || 1) * Math.exp((c || 1) * x) - (d || 1) * Math.exp(-(d || 1) * x))) /
          (Math.exp((c || 1) * x) + Math.exp(-(d || 1) * x))
      );
    };

    return new Activation({ a, b, c, d, fEval, dEval });
  }

  static createRareN(a = 100, b = 1): Activation {
    let fEval = (x: number, a?: number) => (x < 1 ? 1 : 1 - Math.exp(((x - (a || 100)) / x) * b));
    let dEval = (x: number, a?: number) =>
      x < 1 ? 0 : -(((a || 100) * b * fEval(x, a)) / (x * x));
    return new Activation({ a, b, fEval, dEval });
  }

  static createElu(a = 0): Activation {
    let fEval = (x: number) => (x >= 0 ? x : a * (Math.exp(x) - 1));
    let dEval = (x: number) => 'TBD';
    //let dEval = (x) => (x >= 0 ? 1 : fEval(x,a)+a);
    return new Activation({ a, fEval, dEval });
  }
}
