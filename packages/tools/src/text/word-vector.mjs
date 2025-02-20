import { DBG } from '../defines.mjs';

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
    let { order = 'value', precision = 2 } = opts;
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
      let vf = v.toFixed(precision).replace(/\.0*$/, '');
      a.push(`${k}:${vf}`);
      return a;
    }, []);
    return sv.join(',');
  }

  norm() {
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
      let v2 = vec2[k];
      if (v2) {
        a[k] = (a[k] || 0) + v2;
      }
      return a;
    }, new WordVector(this));
  }

  increment(vec2) {
    let keys = Object.keys(vec2);
    return keys.reduce((a, k) => {
      let v2 = vec2[k];
      if (v2) {
        a[k] = (a[k] || 0) + v2;
      }
      return a;
    }, this);
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

  intersect(vec2 = {}) {
    let keys = Object.keys(this);
    return keys.reduce((a, k) => {
      let v1 = this[k];
      let v2 = vec2[k] || 0;
      if (v1 && v2) {
        a[k] = v1 * v2;
      }

      return a;
    }, new WordVector());
  }

  similar(vec2) {
    const msg = 'w8r.similar:';
    if (vec2 == null) {
      throw new Error(`${msg} vec2?`);
    }
    let d = this.dot(vec2);
    let norm1 = this.norm();
    let norm2 = vec2.norm();
    let den = norm1 * norm2;
    return den ? d / den : 0;
  }

  oneHot() {
    return Object.keys(this).reduce((a, k) => {
      if (this[k] > 0) {
        a[k] = 1;
      }
      return a;
    }, new WordVector());
  }
} // WordVector
