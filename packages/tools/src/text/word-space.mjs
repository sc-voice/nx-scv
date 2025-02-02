import { DBG } from '../defines.mjs';

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
      let vf = v.toFixed(2);
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
    const msg = 'V4r.dot:';
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

  intersect(vec2 = {}) {
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
    const msg = 'V4r.similar:';
    if (vec2 == null) {
      throw new Error(`${msg} vec2?`);
    }
    let d = this.dot(vec2);
    let norm1 = this.norm();
    let norm2 = vec2.norm();
    let den = norm1 * norm2;
    return den ? d / den : 0;
  }
} // Vector

export class WordMapTransformer {
  // DEPRECATED
  constructor(oWordMap = {}, opts = {}) {
    let wordMap = Object.keys(oWordMap).reduce((a, w) => {
      let wLow = w.toLowerCase();
      a[wLow] = oWordMap[w].toLowerCase();
      return a;
    }, {});

    let { lang = 'en', normalize } = opts;

    if (!normalize) {
      switch (lang) {
        case 'fr':
          normalize = WordMapTransformer.normalizeFR;
          break;
        default:
          normalize = (s) => s;
          break;
      }
    }

    this.wordMap = wordMap;
    this.normalize = normalize;
  }

  static normalizeFR(s) {
    return s
      .replace(/[«»]/gi, '')
      .replace(/\bd’/gi, 'de ')
      .replace(/\bl’/gi, 'le ')
      .replace(/\bs’/gi, 'se ')
      .replace('?', '$QUESTION')
      .replace('!', '$EXCLAMATION')
      .trim();
  }

  #compileWordMap() {
    let { wordMap } = this;
    return Object.keys(wordMap).map((pat) => {
      let rep = wordMap[pat];
      return {
        re: new RegExp(pat, 'iugm'),
        rep,
      };
    });
  }

  transform(text) {
    const msg = 'W16r.transform:';
    const dbg = DBG.WORD_MAP_TRANSFORMER;
    let { wordMap, reWordMap, normalize } = this;
    if (reWordMap == null) {
      reWordMap = this.#compileWordMap();
      this.reWordMap = reWordMap;
    }
    dbg && console.log(msg, { text });
    let textMapped = text;
    for (let i = 0; i < reWordMap.length; i++) {
      let { re, rep } = reWordMap[i];
      textMapped = textMapped.replaceAll(re, rep);
      dbg && console.log(msg, { i, textMapped, re });
    }
    let rslt = normalize(textMapped)
      .toLowerCase()
      .trim()
      .replace(/[-]/g, ' ')
      .replace(/[.,_:;"'“”‘’!?]/g, '');
    return rslt;
  }
}

export class WordSpace {
  constructor(opts = {}) {
    let {
      lang, // 2-letter code: fr, en, es, pt
      minWord = 4, // minimum word length
      normalize,
      normalizeVector = WordSpace.normalizeVector,
      transformText,
      transformer,
      reWordMap,
    } = opts;

    if (transformer == null) {
      let wordMap = opts.wordMap;
      transformer = new WordMapTransformer(wordMap, {
        lang,
        normalize,
      });
      if (transformText == null) {
        transformText = (text) => transformer.transform(text);
      }
    }
    Object.defineProperty(this, 'transformText', {
      value: transformText,
    });

    Object.assign(this, {
      lang,
      minWord,
      normalizeVector,
      reWordMap,
      transformer,
      wordMap: opts.wordMap, // DEPRECATED
    });
  }

  static get WordMapTransformer() {
    return WordMapTransformer;
  }

  static get Vector() {
    return Vector;
  }

  // Golden Ratio fudge factor scales a count of 1 to ~0.8
  // 1.6180339887498948482045868343656381177203091798057628621354
  static normalizeVector(v, scale = 1.618033988749895) {
    let vNew = new Vector(v);
    Object.entries(v).forEach((e) => {
      let [key, value] = e;
      vNew[key] = 1 - Math.exp(-value * scale);
    });

    return vNew;
  }

  string2Vector(str, scale = 1) {
    const msg = 'W7e.string2Vector:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let { normalize, normalizeVector, minWord } = this;
    let sNorm = this.transformText(str);
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
} // WordSpace
