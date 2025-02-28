import { Unicode } from '../text/unicode.mjs';

export class Interval {
  constructor(a, b) {
    const msg = 'i6l.ctor';
    let hi = null;
    let lo = null;
    const dbg = 0;

    let an = typeof a === 'number' && !Number.isNaN(a);
    let bn = typeof b === 'number' && !Number.isNaN(b);

    if (an && bn) {
      dbg && console.log(msg, 'an bn');
      lo = a;
      hi = b;
      this.isClosed = true;
    } else if (an) {
      dbg && console.log(msg, 'an');
      lo = a;
      hi = Interval.INFINITY;
      this.isClosed = false;
    } else if (bn) {
      dbg && console.log(msg, 'bn');
      lo = Interval.INFINITY;
      hi = b;
      this.isClosed = false;
    } else {
      dbg && console.log(msg, '!an !bn');
      this.isClosed = false;
    }

    Object.defineProperty(this, 'lo', { value: lo });
    Object.defineProperty(this, 'hi', { value: hi });
  }

  static get INFINITY() {
    return Unicode.INFINITY;
  }

  get isEmpty() {
    if (this.lo === null && this.hi === null) {
      return true;
    }
    if (
      this.lo === Interval.INFINITY ||
      this.hi === Interval.INFINITY
    ) {
      return false;
    }
    return this.hi < this.lo;
  }

  get infimum() {
    return this.lo === Interval.INFINITY
      ? '-' + Interval.INFINITY
      : this.lo;
  }

  get supremum() {
    return this.hi === Interval.INFINITY
      ? '+' + Interval.INFINITY
      : this.hi;
  }

  contains(num) {
    if (typeof num !== 'number' || Number.isNaN(num)) {
      return false;
    }
    let { lo, hi } = this;
    if (lo === Interval.INFINITY) {
      throw new Error(`${msg}TBD`);
    }
    if (hi === Interval.INFINITY) {
      throw new Error(`${msg}TBD`);
    }
    if (lo < num && num < hi) {
      return true;
    }
    if (num < lo || hi < num) {
      return false;
    }
  }
}
