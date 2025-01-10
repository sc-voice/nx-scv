import { DBG } from './defines.mjs';

class Vector extends Object {
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

  toString() {
    let sv = Object.entries(this).reduce((a, e) => {
      let [k, v] = e;
      let vf = v.toFixed(3);
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
    }, new Vector(this));
  }

  dot(vec2) {
    const msg = 'WordSpace.dot:';
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

  intersect(vec2) {
    let keys = Object.keys(this);
    return keys.reduce((a, k) => {
      let v1 = this[k];
      let v2 = vec2[k] || 0;
      if (v1 && v2) {
        a[k] = v1 * v2;
      }

      return a;
    }, new Vector());
  }

  similar(vec2) {
    const msg = 'WordSpace.similar:';
    if (vec2 == null) {
      throw new Error(`${msg} vec2?`);
    }
    let d = this.dot(vec2);
    let norm1 = this.norm();
    let norm2 = vec2.norm();
    let den = norm1 * norm2;
    return den ? d / den : 0;
  }
}

export default class WordSpace {
  constructor(opts = {}) {
    let {
      lang, // 2-letter code: fr, en, es, pt
      minWord = 4, // minimum word length
      normalize,
      normalizeVector = WordSpace.normalizeVector,
      wordMap = {}, // word replacement map
      reWordMap,
    } = opts;

    wordMap = Object.keys(wordMap).reduce((a, w) => {
      let wLow = w.toLowerCase();
      a[wLow] = wordMap[w].toLowerCase();
      return a;
    }, {});
    if (!normalize) {
      switch (lang) {
        case 'fr':
          normalize = WordSpace.normalizeFR;
          break;
        default:
          normalize = (s) => s;
          break;
      }
    }

    Object.assign(this, {
      lang,
      minWord,
      normalize,
      normalizeVector,
      reWordMap,
      wordMap,
    });
  }

  static compileWordMap(wordMap) {
    return (
      wordMap &&
      Object.keys(wordMap).map((pat) => {
        let rep = wordMap[pat];
        return {
          re: new RegExp(pat, 'iugm'),
          rep,
        };
      })
    );
  }

  static normalizeFR(s) {
    return s
      .replace(/\bd’/gi, 'de ')
      .replace(/\bl’/gi, 'le ')
      .replace(/\bs’/gi, 'se ')
      .replace('?', '$QUESTION')
      .replace('!', '$EXCLAMATION')
      .trim();
  }

  applyWordMap(text) {
    const msg = 'WordSpace.applyWordMap:';
    const dbg = DBG.APPLY_WORD_MAP;
    let { wordMap, reWordMap } = this;
    if (reWordMap == null) {
      reWordMap = WordSpace.compileWordMap(wordMap);
      this.reWordMap = reWordMap;
    }
    dbg && console.log(msg, { text });
    let rslt = text;
    for (let i = 0; i < reWordMap.length; i++) {
      let { re, rep } = reWordMap[i];
      rslt = rslt.replaceAll(re, rep);
      dbg && console.log(msg, { i, rslt, re });
    }
    return rslt;
  }

  static get Vector() {
    return Vector;
  }

  static normalizeVector(v) {
    let tau = 0.618034; // Golden ratio
    let vNew = new Vector(v);
    Object.entries(v).forEach((e) => {
      let [key, value] = e;
      vNew[key] = 1 - Math.exp(-value / tau);
    });

    return vNew;
  }

  string2Vector(str, scale = 1) {
    const msg = 'WordSpace.string2Vector:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let { normalize, normalizeVector, minWord, wordMap } = this;
    let sWordMap = this.applyWordMap(str);
    let sNorm = normalize(sWordMap)
      .toLowerCase()
      .trim()
      .replace(/[-]/g, ' ')
      .replace(/[.,_:;"'“”‘’!?]/g, '');
    let words = sNorm.split(' ');
    let v = words.reduce((a, w) => {
      if (w.length >= minWord) {
        a[w] = (a[w] || 0) + scale;
      }
      return a;
    }, new Vector());

    if (normalizeVector) {
      v = normalizeVector(v);
    }

    return v;
  }
}
