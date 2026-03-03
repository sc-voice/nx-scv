import { DBG } from '../defines.mjs';
import { ColorConsole } from './color-console.mjs';
import { Corpus } from './corpus.mjs';
import { WordVector } from './word-vector.mjs';
const { cc } = ColorConsole;

// The golden ratio is pretty.
// 1.6180339887498948482045868343656381177203091798057628621354;
const GOLDEN_FUDGE = 1.618033988749895;

export class TfidfSpace {
  constructor(opts = {}) {
    const msg = 't8e.ctor:';
    let {
      lang = 'en', // 2-letter code: fr, en, es, pt
      corpus = new Corpus(),
      idfWeight = GOLDEN_FUDGE, // IDF dampening
      idfFunction = TfidfSpace.idfTunable,
      normalizeText,
      leftQuoteToken,
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
    Object.defineProperty(this, '_normalizeText', {
      value: normalizeText,
    });
    Object.defineProperty(this, 'idfFunction', {
      value: idfFunction,
    });

    // Serializable properties
    Object.assign(this, {
      lang,
      corpus,
      idfWeight,
      leftQuoteToken,
    });
  }

  // Create wordWeight function that weighs the first words
  // of a document more than the remainder
  static wordWeightFromPrefix(prefixLength, prefixBias = 0.5) {
    const msg = 't8e.wordWeightFromPrefix';

    let wordWeight = (w, i, nWords) => {
      const nWeighted = Math.min(nWords, prefixLength);
      const nUnweighted = nWords - nWeighted;
      const wf = nUnweighted ? prefixBias : 1;
      return i < nWeighted
        ? (wf * nWords) / nWeighted
        : ((1 - wf) * nWords) / nUnweighted;
    };
    return wordWeight;
  }

  static removeHtml(s) {
    return s.replace(/<[^>]*>/gi, '');
  }

  static removeNonWords(s, opts = {}) {
    const RE_RESERVED = /[_-]/g; // allowed in bow words
    const RE_LQUOTE = /[“‘«]/g;
    const RE_PUNCT = /[.,:;$"'“”‘’!?«»\[\]]/g;
    const RE_SPACE = /\s+/g;
    let {
      leftQuoteToken = '', // TBD: is this useful?
    } = opts;
    return TfidfSpace.removeHtml(s)
      .replace(RE_LQUOTE, leftQuoteToken)
      .replace(RE_PUNCT, '')
      .replace(RE_SPACE, ' ')
      .trim();
  }

  static normalizeEN(s, opts = {}) {
    return TfidfSpace.removeNonWords(s.toLowerCase(), opts);
  }

  static normalizeFR(s, opts = {}) {
    let sAbbr = s
      .toLowerCase()
      .replace(/\bd[’']/gi, 'de ')
      .replace(/\bl[’']/gi, 'le ')
      .replace(/\bs[’']/gi, 's_')
      .replace(/\bj[’']/gi, 'j_')
      .replace(/\bm[’']/gi, 'm_')
      .replace(/\bn[’']/gi, 'n_')
      .replace(/\bc[’']/gi, 'c_');
    return TfidfSpace.removeNonWords(sAbbr, opts);
  }

  static idfStandard(nDocs, wdc, idfWeight) {
    return Math.log((nDocs + 1) / (wdc + 1));
  }

  static idfTunable(nDocs, wdc, idfWeight) {
    const msg = 'w7e.idfTunable:';
    // NOTE: This is NOT the usual formula
    // Map to [0:ignore..1:important]
    return nDocs ? 1 - Math.exp(((wdc - nDocs) / wdc) * idfWeight) : 1;
  }

  idf(word, idfWeight = this.idfWeight) {
    let { corpus } = this;
    let wdc = corpus.wordDocCount[word] || 0;
    let nDocs = corpus.size;
    return this.idfFunction(nDocs, wdc, idfWeight);
  }

  addCorpusDocument(id, bow) {
    const msg = 't8w.addCorpusDocument:';
    let { corpus } = this;
    if (id == null) {
      throw new Error(`${msg} id?`);
    }
    if (bow == null) {
      // Bag-of-words maps word to wordCount(word,doc)
      throw new Error(`${msg} bow?`);
    }
    let nWords = Object.values(bow).reduce((a, v) => a + v);
    let docInfo = { id, bow, nWords };
    corpus.wordDocCount.increment(bow.oneHot());
    corpus.addDocument(id, docInfo);

    return docInfo;
  }

  addDocument(id, doc) {
    let { corpus } = this;
    let { bow, words } = this.countWords(doc);

    return this.addCorpusDocument(id, bow, words.length);
  }

  termFrequency(word, document) {
    return this.tf(word, document);
  }

  tf(word, doc) {
    let { bow, words } = this.countWords(doc);
    let count = bow[word] || 0;
    return count ? count / words.length : 0;
  }

  tfidfOfBow(bow) {
    const msg = 'w7e.tfidfOfBow:';
    let { corpus, idfWeight } = this;

    // More efficient implementation of tf * idf
    let words = Object.keys(bow);
    let nWords = words.reduce((a, w) => a + bow[w], 0);

    let vTfIdf = words.reduce((a, word) => {
      let wd = bow[word] || 0;
      let tf = wd ? wd / nWords : 0;
      let wdc = corpus.wordDocCount[word] || 0;
      let idf = corpus.size
        ? 1 - Math.exp(((wdc - corpus.size) / wdc) * idfWeight)
        : 1;
      let tfidf = tf * idf;
      if (tfidf) {
        a[word] = tfidf;
      }
      return a;
    }, new WordVector());

    return vTfIdf;
  }

  tfidf(text) {
    // TfIdf of words in text w/r to corpus
    let { bow } = this.countWords(text);
    return this.tfidfOfBow(bow);
  }

  normalizeText(str) {
    return this._normalizeText(str, this);
  }

  countWords(str) {
    const msg = 'w7e.countWords:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let sNorm = this.normalizeText(str);
    let words = sNorm.split(' ');
    let bow = words.reduce((a, w) => {
      a[w] = (a[w] || 0) + 1;
      return a;
    }, new WordVector());

    return { bow, words };
  }

  bowOfText(text, opts = {}) {
    const msg = 'w7e.bowOfText:';
    let dbg = DBG.W7E_BOW_OF_TEXT;
    if (text == null) {
      throw new Error(`${msg} text?`);
    }
    let { wordWeight = (word, i, n) => 1 } = opts;
    let sNorm = this.normalizeText(text);
    let words = sNorm.split(' ');
    let nWords = words.length;
    let bow = words.reduce((a, word, i) => {
      let ww = wordWeight(word, i, nWords);
      a[word] = (a[word] || 0) + ww;
      dbg && cc.fyi1(msg + 0.1, { i, word, ww, sum: a[word] });
      return a;
    }, new WordVector());

    return bow;
  }
} // TfidfSpace
