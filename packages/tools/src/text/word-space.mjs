import { DBG } from '../defines.mjs';

// The golden ratio is pretty.
// 1.6180339887498948482045868343656381177203091798057628621354;
const GOLDEN_FUDGE = 1.618033988749895;

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
      .replace(/\bd[’']/gi, 'de ')
      .replace(/\bl[’']/gi, 'le ')
      .replace(/\bs[’']/gi, 'se ')
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
      corpusBow = new Vector(), // corpus bag of words
      corpusSize = 0, // number of retrieval units (docs, segments, etc.)
      idfWeight = GOLDEN_FUDGE, // IDF dampening
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
      corpusBow,
      corpusSize,
      idfWeight,
      minWord,
      normalizeVector,
      reWordMap,
      transformer,
      wordMap: opts.wordMap, // DEPRECATED
    });
  }

  static createTfIdf() {
    let minWord = 1;
    let normalizeVector = (v) => v;
    return new WordSpace({ minWord, normalizeVector });
  }

  static get WordMapTransformer() {
    return WordMapTransformer;
  }

  static get Vector() {
    return Vector;
  }

  // Golden Ratio fudge factor scales a count of 1 to ~0.8
  static normalizeVector(v, scale = GOLDEN_FUDGE) {
    let vNew = new Vector(v);
    Object.entries(v).forEach((e) => {
      let [key, value] = e;
      vNew[key] = 1 - Math.exp(-value * scale);
    });

    return vNew;
  }

  addDocument(doc) {
    let { corpusBow } = this;
    this.corpusSize += 1;
    let { bow } = this.countWords(doc, 1); // one-hot
    corpusBow.increment(bow);

    return this;
  }

  inverseDocumentFrequency(word, idfWeight) {
    return this.idf(word, idfWeight);
  }

  idf(word, idfWeight = this.idfWeight) {
    const msg = 'w7e.idf:';
    let { corpusBow, corpusSize } = this;
    let wCount = corpusBow[word] || 0;
    // Map to [0:ignore..1:important]
    return corpusSize
      ? 1 - Math.exp(((wCount - corpusSize) / wCount) * idfWeight)
      : 1;
  }

  termFrequency(word, document) {
    return this.tf(word, document);
  }

  tf(word, doc) {
    let { bow, words } = this.countWords(doc);
    let count = bow[word] || 0;
    return count ? count / words.length : 0;
  }

  tfidf(doc) {
    const msg = 'w7e.tfidf:';
    let { corpusBow, corpusSize, idfWeight } = this;

    // More efficient implementation of tf * idf
    let { bow, words } = this.countWords(doc);
    let nWords = words.length;

    let vTfIdf = words.reduce((a, word) => {
      let wd = bow[word] || 0;
      let tf = wd ? wd / nWords : 0;
      let wc = corpusBow[word] || 0;
      let idf = corpusSize
        ? 1 - Math.exp(((wc - corpusSize) / wc) * idfWeight)
        : 1;
      let tfidf = tf * idf;
      if (tfidf) {
        a[word] = tfidf;
      }
      return a;
    }, new Vector());

    return vTfIdf;
  }

  countWords(str, maxCount) {
    const msg = 'w7e.countWords:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let sNorm = this.transformText(str);
    let words = sNorm.split(' ');
    let bow = words.reduce((a, w) => {
      let count = (a[w] || 0) + 1;
      a[w] = maxCount ? Math.min(maxCount, count) : count;
      return a;
    }, new Vector());

    return { bow, words };
  }

  string2Vector(str, scale = 1) {
    const msg = 'w7e.string2Vector:';
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
