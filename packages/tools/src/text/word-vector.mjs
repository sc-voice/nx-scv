import { DBG } from '../defines.mjs';
import { Unicode } from './unicode.mjs';
const {
  ELLIPSIS,
} = Unicode;

// The golden ratio is pretty.
// 1.6180339887498948482045868343656381177203091798057628621354;
const GOLDEN_FUDGE = 1.618033988749895;

export class WordVector extends Object {
  constructor(props) {
    super();
    Object.assign(this, props);
    Object.defineProperty(this, '$length', {
      writable: true,
    });
  }

  get length() {
    if (this.$length == null) {
      this.$length = Object.keys(this).length;
    }
    return this.$length;
  }

  toString(opts = {}) {
    const msg = 'w10r.toString:';
    let { order = 'value', minValue, precision = 2 } = opts;
    let skipped = 0;

    if (minValue == null) {
      minValue = Math.pow(10, -precision) / 2;
    }

    let entries = Object.entries(this);
    switch (order) {
      case 'key':
        entries.sort((a, b) => {
          let [ka] = a;
          let [kb] = b;
          return ka.localeCompare(kb);
        });
        break;
      case 'value':
      default:
        entries.sort((a, b) => {
          let [ka, va] = a;
          let [kb, vb] = b;
          return vb - va || ka.localeCompare(kb);
        });
        break;
    }
    let sv = entries.reduce((a, e) => {
      let [k, v] = e;
      if (minValue <= v) {
        let vf = v
          .toFixed(precision)
          .replace(/\.0*$/, '')
          .replace(/0\./, '.');
        a.push(`${k}:${vf}`);
      } else {
        skipped++;
      }
      return a;
    }, []);
    skipped && sv.push(`${ELLIPSIS}${skipped}`);
    return sv.join(',');
  }

  norm() {
    // L2 norm
    let keys = Object.keys(this);
    if (keys.length === 0) {
      return 0;
    }
    let sumSqr = keys.reduce((a, k) => {
      let v = this[k];
      return a + v * v;
    }, 0);
    return Math.sqrt(sumSqr);
  }

  add(vec2) {
    let keys = Object.keys(vec2);
    return keys.reduce((a, k) => {
      let v1 = a[k] || 0;
      let v2 = vec2[k];
      if (v2) {
        a[k] = v1 + v2;
      }
      return a;
    }, new WordVector(this));
  }

  increment(vec2) {
    let keys = Object.keys(vec2);
    return keys.reduce((a, k) => {
      let v1 = a[k] || 0;
      let v2 = vec2[k];
      if (v2) {
        a[k] = v1 + v2;
      }
      return a;
    }, this);
  }

  multiply(vec2) {
    const msg = 'w8r.multiply:';
    let keys = Object.keys(vec2);
    return keys.reduce((a, k) => {
      let v1 = this[k];
      let v2 = vec2[k];
      if (v1 && v2) {
        a[k] = v1 * v2;
      }
      return a;
    }, new WordVector({}));
  }

  dot(vec2) {
    const msg = 'w8r.dot:';
    if (vec2 == null) {
      throw new Error(`${msg} vec2?`);
    }
    let keys = Object.keys(this);
    return keys.reduce((a, k) => {
      let v1 = this[k];
      let v2 = vec2[k] || 0;

      return a + v1 * v2;
    }, 0);
  }

  scale(c) {
    return Object.keys(this).reduce((a, k) => {
      a[k] *= c;
      return a;
    }, this);
  }

  hadamardL1(vec2 = {}) {
    // L1-norm of Hadamard product shows how
    // the cosine similarity score is apportioned
    let keys = Object.keys(this);
    let n = 0;
    let hadamard = keys.reduce((a, k) => {
      let v1 = this[k];
      let v2 = vec2[k] || 0;
      if (v1 && v2) {
        a[k] = v1 * v2;
        n++;
      }

      return a;
    }, new WordVector());

    if (n === 0) {
      return hadamard; // empty vector
    }
    let n12 = this.norm() * vec2.norm();
    return hadamard.scale(1 / n12);
  }

  similar(vec2) {
    const msg = 'w8r.similar:';
    if (vec2 == null) {
      throw new Error(`${msg} vec2?`);
    }
    let d = this.dot(vec2);
    let norm1 = this.norm();
    let norm2 = vec2.norm();
    let n12 = norm1 * norm2;
    return n12 ? d / n12 : 0;
  }

  oneHot() {
    return Object.keys(this).reduce((a, k) => {
      if (this[k] > 0) {
        a[k] = 1;
      }
      return a;
    }, new WordVector());
  }

  andOneHot(vec2) {
    return Object.keys(this).reduce((a, k) => {
      if (this[k] && vec2[k]) {
        a[k] = 1;
      }
      return a;
    }, new WordVector());
  }

  orOneHot(vec2) {
    let result = Object.keys(this).reduce((a, k) => {
      if (this[k] || vec2[k]) {
        a[k] = 1;
      }
      return a;
    }, new WordVector());
    return Object.keys(vec2).reduce((a, k) => {
      if (this[k] || vec2[k]) {
        a[k] = 1;
      }
      return a;
    }, result);
  }
} // WordVector
