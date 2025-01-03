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
      minWord = 3, // minimum word length
      normalize,
      wordMap = {}, // word replacement map
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
      wordMap,
    });
  }

  static normalizeFR(s) {
    return s
      .replace(/^s’|\ss’|^l’|\sl’/gi, ' ')
      .replace('?', '$QUESTION')
      .replace('!', '$EXCLAMATION')
      .trim();
  }

  static get Vector() {
    return Vector;
  }

  string2Vector(str, scale = 1) {
    const msg = 'WordSpace.string2Vector:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let { normalize, minWord, wordMap } = this;
    let sNorm = normalize(str)
      .toLowerCase()
      .trim()
      .replace(/[-]/g, ' ')
      .replace(/[.,_:;"'“”‘’!?]/g, '');
    let words = sNorm.split(' ');
    return words.reduce((a, w) => {
      if (wordMap[w]) {
        dbg && console.log(msg, w, wordMap[w]);
        w = wordMap[w].toLowerCase();
      }
      if (w.length >= minWord) {
        a[w] = (a[w] || 0) + scale;
      }
      return a;
    }, new Vector());
  }
}
