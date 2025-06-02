import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: UOK } = Unicode;
const { H6D } = DBG.M2H;
const { cc } = ColorConsole;

const SQRT2 = Math.sqrt(2);

export class Hadamard {
  static #ctor = false;
  constructor(cfg={}) {
    const msg = 'h6d.ctor:';
    if (!Hadamard.#ctor) {
      throw new Error(`${msg} try: encode(signal)`);
    }

    Object.assign(this, cfg);

  }

  static fwht(input) { // Fast Walsh-Hadamard Transform
    const msg = 'h6d.fwht';
    const dbg = H6D.FWHT;
    const length = input.length;
    let h = 1;
    let scale = 1;
    let output = [...input];
    dbg && cc.ok(msg, 'input:', ...input);
    while (h < length) {
      let hNext = h * 2;
      for (let i = 0; i < length; i += hNext) {
        for (let j = i; j < i+h; j++) {
          let x = output[j];
          let y = output[j + h];
          output[j] = x + y;
          output[j + h] = x - y;
          dbg > 2 && cc.fyi(msg, {h, length, i,j, ih: i + h, jh:j+h});
        }
      }
      dbg > 1 && cc.ok(msg, 'h:', h, 'output:', ...output);
      output = output.map(v=>v/SQRT2);
      h = hNext;
    }
    dbg && cc.ok1(msg+UOK, 'output:', ...output);

    return output;
  }

  static encode(signal) {
    const msg = 'h6d.encode';
    const dbg = H6D.ENCODE;
    let length = signal.length;
    let n = Math.ceil(Math.log2(length));
    let fullLength = Math.pow(2,n); 
    let zeros = new Array(fullLength-length).fill(0);
    let input = [...signal, ...zeros];
    let output = Hadamard.fwht(input);

    let h6d;
    try {
      Hadamard.#ctor = true;
      h6d = new Hadamard({length, signal: output});
    } finally {
      Hadamard.#ctor = false;
    } 
    dbg > 1 && cc.ok(msg, 'output:', ...output);
    dbg && cc.ok1(msg, {length, n, fullLength });
    return h6d;
  }

  decode() {
    const msg = 'h6d.decode';
    const dbg = H6D.DECODE;
    let { length, signal } = this;
    let output = Hadamard.fwht(signal).slice(0, length);
    dbg && cc.ok1(msg+UOK, ...output);
    return output;
  }

}
