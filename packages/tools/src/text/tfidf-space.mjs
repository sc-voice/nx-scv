import { DBG } from '../defines.mjs';
import { WordVector } from './word-vector.mjs';

// The golden ratio is pretty.
// 1.6180339887498948482045868343656381177203091798057628621354;
const GOLDEN_FUDGE = 1.618033988749895;

export class TfidfSpace {
  constructor(opts = {}) {
    const msg = 't8e.ctor:';
    let {
      lang = 'en', // 2-letter code: fr, en, es, pt
      corpusBow = new WordVector(), // corpus bag of words
      corpusSize = 0, // number of retrieval units (docs, segments, etc.)
      idfWeight = GOLDEN_FUDGE, // IDF dampening
      idfFunction = TfidfSpace.idfTunable,
      normalizeText,
    } = opts;
    if (lang == null) {
      throw new Error(`${msg} lang?`);
    }
    if (normalizeText == null) {
      switch (lang) {
        case 'fr':
          normalizeText = TfidfSpace.normalizeFR;
          break;
        case 'en':
          normalizeText = TfidfSpace.normalizeEN;
          break;
        default:
          throw new Error(`${msg} normalizeText?`);
      }
    }
    Object.defineProperty(this, 'normalizeText', {
      value: normalizeText,
    });
    Object.defineProperty(this, 'idfFunction', {
      value: idfFunction,
    });

    // Serializable properties
    Object.assign(this, {
      lang,
      corpusBow,
      corpusSize,
      idfWeight,
    });
  }

  static removeNonWords(s) {
    const RE_RESERVED = /[_-]/g; // allowed in bow words
    const RE_PUNCT = /[.,:;$"'“”‘’!?«»]/g;
    const RE_SPACE = /\s+/g;
    return s.replace(RE_PUNCT, '').replace(RE_SPACE, ' ').trim();
  }

  static normalizeEN(s) {
    return TfidfSpace.removeNonWords(s.toLowerCase());
  }

  static normalizeFR(s) {
    let sAbbr = s.toLowerCase()
      .replace(/\bd[’']/gi, 'de ')
      .replace(/\bl[’']/gi, 'le ')
      .replace(/\bs[’']/gi, 'se ')
    return TfidfSpace.removeNonWords(sAbbr);
  }

  static idfStandard(space, word) {
    const msg = 'w7e.idfStandard:';
    let { corpusBow, corpusSize } = space;
    let wordDocs = corpusBow[word] || 0;
    return Math.log((corpusSize + 1) / (wordDocs+1));
  }

  static idfTunable(space, word, idfWeight = this.idfWeight) {
    const msg = 'w7e.idf:';
    let { corpusBow, corpusSize } = space;
    let wordDocs = corpusBow[word] || 0;
    // NOTE: This is NOT the usual formula
    // Map to [0:ignore..1:important]
    return corpusSize
      ? 1 - Math.exp(((wordDocs - corpusSize) / wordDocs) * idfWeight)
      : 1;
  }

  idf(word, idfWeight) {
    return this.idfFunction(this, word, idfWeight);
  }

  addDocument(doc) {
    let { corpusBow } = this;
    this.corpusSize += 1;
    let { bow } = this.countWords(doc, 1); // one-hot
    corpusBow.increment(bow);

    return this;
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
    }, new WordVector());

    return vTfIdf;
  }

  countWords(str, maxCount) {
    const msg = 'w7e.countWords:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let sNorm = this.normalizeText(str);
    let words = sNorm.split(' ');
    let bow = words.reduce((a, w) => {
      let count = (a[w] || 0) + 1;
      a[w] = maxCount ? Math.min(maxCount, count) : count;
      return a;
    }, new WordVector());

    return { bow, words };
  }

  bowOfText(text) {
    const msg = 'w7e.bowOfText:';
    if (text == null) {
      throw new Error(`${msg} text?`);
    }
    let dbg = 0;
    let sNorm = this.normalizeText(text);
    let words = sNorm.split(' ');
    let bow = words.reduce((a, w) => {
      a[w] = (a[w] || 0) + 1;
      return a;
    }, new WordVector());

    return bow;
  }
} // TfidfSpace
