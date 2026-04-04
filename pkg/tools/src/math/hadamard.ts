/**
 * Hadamard Transform Implementation
 *
 * The Hadamard transform is an orthogonal transformation that decomposes
 * a signal into Walsh functions (square waves). It's computationally efficient
 * (O(n log n)) and useful for signal processing, error correction, and
 * data compression. The Fast Walsh-Hadamard Transform (FWHT) algorithm
 * operates on signals with power-of-2 length, padding shorter signals as needed.
 *
 * NOTE: This is distinct from the Hadamard product (element-wise multiplication),
 * which is used in WordVector.hadamardL1(). Both are named after Jacques Hadamard
 * but serve different mathematical purposes.
 */

import { DBG } from '../defines.js';
import { ColorConsole } from '../text/color-console.js';
import { Unicode } from '../text/unicode.js';

const { CHECKMARK: UOK } = Unicode;
const { H6D } = DBG.M2H;
const { cc } = ColorConsole;

const SQRT2 = Math.sqrt(2);

// Module-level flag to prevent direct instantiation
let privateCtor = false;

/**
 * Hadamard transform for signal encoding/decoding.
 * Uses Fast Walsh-Hadamard Transform (FWHT) algorithm.
 */
export class Hadamard {
  signal?: number[];
  length?: number;

  /**
   * Private constructor - use Hadamard.encode() to create instances.
   */
  constructor(cfg: Record<string, unknown> = {}) {
    const msg = 'h6d.ctor:';
    if (!privateCtor) {
      throw new Error(`${msg} try: encode(signal)`);
    }

    Object.assign(this, cfg);
  }

  /**
   * Fast Walsh-Hadamard Transform (FWHT).
   * Transforms input signal into Hadamard domain.
   * @param input - Input signal (length should be power of 2)
   * @returns Transformed signal
   */
  static fwht(input: number[]): number[] {
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
        for (let j = i; j < i + h; j++) {
          let x = output[j];
          let y = output[j + h];
          output[j] = x + y;
          output[j + h] = x - y;
          dbg > 2 &&
            cc.fyi(msg, { h, length, i, j, ih: i + h, jh: j + h });
        }
      }
      dbg > 1 && cc.ok(msg, 'h:', h, 'output:', ...output);
      output = output.map((v) => v / SQRT2);
      h = hNext;
    }
    dbg && cc.ok1(msg + UOK, 'output:', ...output);

    return output;
  }

  /**
   * Encode signal using Hadamard transform.
   * Pads signal to power of 2 length if needed.
   * @param signal - Input signal to encode
   * @returns Hadamard instance with encoded signal
   */
  static encode(signal: number[]): Hadamard {
    const msg = 'h6d.encode';
    const dbg = H6D.ENCODE;
    let length = signal.length;
    let n = Math.ceil(Math.log2(length));
    let fullLength = Math.pow(2, n);
    let zeros = new Array(fullLength - length).fill(0);
    let input = [...signal, ...zeros];
    let output = Hadamard.fwht(input);

    let h6d: Hadamard;
    try {
      privateCtor = true;
      h6d = new Hadamard({ length, signal: output });
    } finally {
      privateCtor = false;
    }
    dbg > 1 && cc.ok(msg, 'output:', ...output);
    dbg && cc.ok1(msg, { length, n, fullLength });
    return h6d;
  }

  /**
   * Decode signal from Hadamard domain back to original.
   * Removes padding added during encoding.
   * @returns Decoded signal
   */
  decode(): number[] {
    const msg = 'h6d.decode';
    const dbg = H6D.DECODE;
    let { length, signal } = this;
    let output = Hadamard.fwht(signal!).slice(0, length);
    dbg && cc.ok1(msg + UOK, ...output);
    return output;
  }
}
