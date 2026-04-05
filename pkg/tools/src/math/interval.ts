import { Unicode } from '../text/unicode.js';
const { EMPTY_SET, INFINITY } = Unicode;
import { ColorConsole } from '../text/color-console.js';
const { cc } = ColorConsole;
import util from 'node:util';
import { DBG } from '../defines.js';

const MINUS_INFINITY = `-${INFINITY}`;
const PLUS_INFINITY = `+${INFINITY}`;

export class Interval {
  static styleText: ((text: string) => string) | undefined; // (text) => text
  static collapseDegenerate = false;

  declare readonly lo: number | string | null;
  declare readonly hi: number | string | null;
  declare readonly leftOpen: boolean;
  declare readonly rightOpen: boolean;

  constructor(a?: number | string | null, b?: number | string | null, opts: { leftOpen?: boolean; rightOpen?: boolean } = {}) {
    const msg = 'i6l.ctor';
    let hi: number | string | null = null;
    let lo: number | string | null = null;
    const dbg = 0;
    let { leftOpen = false, rightOpen = false } = opts;
    if (a === INFINITY || a == null) {
      leftOpen = true;
    }
    if (b === INFINITY || b == null) {
      rightOpen = true;
    }

    let an = typeof a === 'number' && !Number.isNaN(a);
    let bn = typeof b === 'number' && !Number.isNaN(b);

    if (an && bn) {
      if ((b as number) < (a as number)) {
        throw new Error(`${msg} invalid interval ${b}<${a}?`);
      }
      dbg && console.log(msg, 'an bn');
      lo = a as number;
      hi = b as number;
    } else if (an) {
      dbg && console.log(msg, 'an');
      lo = a as number;
      hi = INFINITY;
    } else if (bn) {
      dbg && console.log(msg, 'bn');
      lo = INFINITY;
      hi = b as number;
    } else {
      dbg && console.log(msg, '!an !bn');
    }

    Object.defineProperty(this, 'lo', {
      enumerable: true,
      value: lo,
    });
    Object.defineProperty(this, 'hi', {
      enumerable: true,
      value: hi,
    });
    Object.defineProperty(this, 'leftOpen', {
      enumerable: true,
      value: leftOpen,
    });
    Object.defineProperty(this, 'rightOpen', {
      enumerable: true,
      value: rightOpen,
    });
  }

  static get INFINITY() {
    return INFINITY;
  }

  get size(): number {
    return (this.hi as number) - (this.lo as number);
  }

  get isOpen(): boolean {
    return this.leftOpen || this.rightOpen || this.isEmpty;
  }

  get isClosed(): boolean {
    return (!this.leftOpen && !this.rightOpen) || this.isEmpty;
  }

  get isEmpty(): boolean {
    if (this.lo === null && this.hi === null) {
      return true;
    }
    if (this.lo === INFINITY || this.hi === INFINITY) {
      return false;
    }
    return (this.hi as number) < (this.lo as number);
  }

  get infimum(): number | string | null {
    return this.lo === INFINITY ? MINUS_INFINITY : this.lo;
  }

  get supremum(): number | string | null {
    return this.hi === INFINITY ? PLUS_INFINITY : this.hi;
  }

  get degenerate(): boolean {
    return this.hi === this.lo;
  }

  contains(num: number): boolean {
    const msg = 'i6l.contains';
    const dbg = DBG.I6L_CONTAINS;
    if (typeof num !== 'number' || Number.isNaN(num)) {
      dbg && cc.fyi1(msg + 0.1, false);
      return false;
    }
    let { lo, hi, leftOpen, rightOpen } = this;
    if (lo === INFINITY) {
      throw new Error(`${msg}TBD`);
    }
    if (hi === INFINITY) {
      throw new Error(`${msg}TBD`);
    }
    if (lo === num && leftOpen) {
      return false;
    }
    if (hi === num && rightOpen) {
      return false;
    }
    if ((lo as number) < num && num < (hi as number)) {
      return true;
    }
    if (num < (lo as number) || (hi as number) < num) {
      return false;
    }

    return true;
  }

  toString(): string {
    let { lo, hi, leftOpen, rightOpen, isEmpty } = this;
    let result = EMPTY_SET;
    if (!isEmpty) {
      if (lo === hi) {
        if (Interval.collapseDegenerate) {
          result = [
            leftOpen ? '(' : '[',
            lo === INFINITY ? MINUS_INFINITY : lo,
            rightOpen ? ')' : ']',
          ].join('');
        } else {
          result = [
            leftOpen ? '(' : '[',
            lo === INFINITY ? MINUS_INFINITY : lo,
            lo == null ? '' : ',',
            hi === INFINITY ? PLUS_INFINITY : hi,
            rightOpen ? ')' : ']',
          ].join('');
        }
      } else {
        result = [
          leftOpen ? '(' : '[',
          lo === INFINITY ? MINUS_INFINITY : lo,
          lo === hi ? '' : ',',
          hi === INFINITY ? PLUS_INFINITY : hi,
          rightOpen ? ')' : ']',
        ].join('');
      }
    }

    return Interval.styleText ? Interval.styleText(result) : result;
  }

  overlaps(iv2: Interval): boolean {
    const msg = 'i6l.overlaps';
    const dbg = DBG.I6L_OVERLAPS;
    let { lo: lo1, hi: hi1, leftOpen: lOpen1, rightOpen: rOpen1 } = this;
    let { lo: lo2, hi: hi2, leftOpen: lOpen2, rightOpen: rOpen2 } = iv2;

    //console.log(msg, {lo1, lo2, hi1, hi2});
    if (!lOpen1 && iv2.contains(lo1 as number)) {
      dbg && cc.fyi1(msg + 1, 'lo1');
      return true;
    }
    if (!rOpen1 && iv2.contains(hi1 as number)) {
      dbg && cc.fyi1(msg + 2, 'hi1');
      return true;
    }
    if (!lOpen2 && this.contains(lo2 as number)) {
      dbg && cc.fyi1(msg + 3, 'lo2');
      return true;
    }
    if (!rOpen2 && this.contains(hi2 as number)) {
      dbg && cc.fyi1(msg + 4, 'hi2');
      return true;
    }

    dbg && cc.fyi1(msg + 0.1, false);
    return false;
  }
} // Interval
