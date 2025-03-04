import { Unicode } from '../text/unicode.mjs';
const { INFINITY } = Unicode;

const MINUS_INFINITY = `-${INFINITY}`;
const PLUS_INFINITY = `+${INFINITY}`;

export class Interval {
  constructor(a, b) {
    const msg = 'i6l.ctor';
    let hi = null;
    let lo = null;
    const dbg = 0;

    let an = typeof a === 'number' && !Number.isNaN(a);
    let bn = typeof b === 'number' && !Number.isNaN(b);

    let isClosed = true;
    if (an && bn) {
      if (b < a) {
        throw new Error(`${msg} invalid interval ${b}<${a}?`);
      }
      dbg && console.log(msg, 'an bn');
      lo = a;
      hi = b;
      isClosed = true;
    } else if (an) {
      dbg && console.log(msg, 'an');
      lo = a;
      hi = INFINITY;
      isClosed = false;
    } else if (bn) {
      dbg && console.log(msg, 'bn');
      lo = INFINITY;
      hi = b;
      isClosed = false;
    } else {
      dbg && console.log(msg, '!an !bn');
      isClosed = false;
    }

    Object.defineProperty(this, 'isClosed', {
      value: isClosed,
    });
    Object.defineProperty(this, 'lo', {
      enumerable: true,
      value: lo,
    });
    Object.defineProperty(this, 'hi', {
      enumerable: true,
      value: hi,
    });
  }

  static get INFINITY() {
    return INFINITY;
  }

  get isEmpty() {
    if (this.lo === null && this.hi === null) {
      return true;
    }
    if (this.lo === INFINITY || this.hi === INFINITY) {
      return false;
    }
    return this.hi < this.lo;
  }

  get infimum() {
    return this.lo === INFINITY ? MINUS_INFINITY : this.lo;
  }

  get supremum() {
    return this.hi === INFINITY ? PLUS_INFINITY : this.hi;
  }

  contains(num) {
    if (typeof num !== 'number' || Number.isNaN(num)) {
      return false;
    }
    let { lo, hi } = this;
    if (lo === INFINITY) {
      throw new Error(`${msg}TBD`);
    }
    if (hi === INFINITY) {
      throw new Error(`${msg}TBD`);
    }
    if (lo < num && num < hi) {
      return true;
    }
    if (num < lo || hi < num) {
      return false;
    }

    return true;
  }

  toString() {
    let { lo, hi } = this;
    if (lo === hi) {
      return [
        lo === INFINITY ? '(' : '[',
        lo === INFINITY ? MINUS_INFINITY : lo,
        lo == null ? '' : ',',
        hi === INFINITY ? PLUS_INFINITY : hi,
        hi === INFINITY ? ')' : ']',
      ].join('');
    }
    return [
      lo === INFINITY ? '(' : '[',
      lo === INFINITY ? MINUS_INFINITY : lo,
      lo === hi ? '' : ',',
      hi === INFINITY ? PLUS_INFINITY : hi,
      hi === INFINITY ? ')' : ']',
    ].join('');
  }

  overlaps(iv2) {
    const msg = 'i6l.overlaps';
    let { lo:lo1, hi:hi1 } = this;
    let { lo:lo2, hi:hi2 } = iv2;

    //console.log(msg, {lo1, lo2, hi1, hi2});
    return (
      (lo2 <= lo1 && lo1 <= hi2) ||
      (lo2 <= hi1 && hi1 <= hi2) ||
      (lo1 <= lo2 && lo2 <= hi1)
    );
  }
}
