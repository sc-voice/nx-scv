/**
 * TfidfSpace module implements TF-IDF (Term Frequency-Inverse Document Frequency)
 * vector space model for text analysis and document similarity.
 *
 * TF-IDF converts text documents into numerical vectors where each dimension represents
 * a word and its value represents importance: common words get low weight while rare,
 * distinctive words get higher weight. This enables measuring similarity between documents
 * and ranking them by relevance to a query.
 *
 * Use cases:
 * - Document similarity and clustering
 * - Information retrieval (ranking documents by query relevance)
 * - Text classification and analysis
 * - Finding duplicate or near-duplicate documents
 *
 * Features:
 * - Supports multiple languages (English, French, etc.) with language-specific normalization
 * - Two IDF formulas: idfTunable (tunable sensitivity to word rarity) and idfStandard (logarithmic)
 * - Word weighting strategies (prefix bias for emphasizing early words)
 * - Document corpus management with word frequency tracking
 * - Text normalization with HTML removal and punctuation handling
 */

import { DBG } from '../defines.js';
import { ColorConsole } from './color-console.js';
import { Corpus } from './corpus.js';
import { WordVector } from './word-vector.js';
const { cc } = ColorConsole;

// The golden ratio is pretty.
// 1.6180339887498948482045868343656381177203091798057628621354;
// Used as default IDF weight for tunable IDF calculation
const GOLDEN_FUDGE = 1.618033988749895;

// Configuration options for TfidfSpace constructor
interface TfidfSpaceOpts {
  lang?: string; // Language code (e.g., 'en', 'fr') for language-specific normalization
  corpus?: Corpus; // Document corpus for IDF calculations
  idfWeight?: number; // Weight/sensitivity parameter for IDF calculation
  idfFunction?: (nDocs: number, wdc: number, idfWeight: number) => number; // Custom IDF calculation function
  normalizeText?: (s: string, ctx?: TfidfSpace) => string; // Custom text normalization function
  leftQuoteToken?: string; // Replacement token for left-side quotes
}

export class TfidfSpace {
  lang!: string;
  corpus!: Corpus;
  idfWeight!: number;
  leftQuoteToken?: string;
  _normalizeText!: (s: string, ctx?: TfidfSpace) => string;
  idfFunction!: (nDocs: number, wdc: number, idfWeight: number) => number;

  constructor(opts: TfidfSpaceOpts = {}) {
    const msg = 't8e.ctor:';
    let {
      lang = 'en', // 2-letter code: fr, en, es, pt
      corpus = new Corpus(), // Corpus for word frequency and IDF calculations
      idfWeight = GOLDEN_FUDGE, // IDF dampening factor for tunable IDF
      idfFunction = TfidfSpace.idfTunable, // Default: use tunable IDF formula
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
  static wordWeightFromPrefix(prefixLength: number, prefixBias: number = 0.5): (w: string, i: number, nWords: number) => number {
    const msg = 't8e.wordWeightFromPrefix';

    let wordWeight = (w: string, i: number, nWords: number): number => {
      const nWeighted = Math.min(nWords, prefixLength);
      const nUnweighted = nWords - nWeighted;
      const wf = nUnweighted ? prefixBias : 1;
      return i < nWeighted
        ? (wf * nWords) / nWeighted
        : ((1 - wf) * nWords) / nUnweighted;
    };
    return wordWeight;
  }

  /**
   * Removes HTML tags from text
   */
  static removeHtml(s: string): string {
    return s.replace(/<[^>]*>/gi, '');
  }

  /**
   * Removes non-word characters (punctuation, special characters) from text
   * Preserves underscores and hyphens which are allowed in words
   */
  static removeNonWords(s: string, opts: any = {}): string {
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

  /**
   * English text normalization: lowercase and remove non-words
   */
  static normalizeEN(s: string, opts: any = {}): string {
    return TfidfSpace.removeNonWords(s.toLowerCase(), opts);
  }

  /**
   * French text normalization: handles French contractions (d', l', s', etc.)
   * and converts them to expanded forms (de, le, s_, etc.)
   */
  static normalizeFR(s: string, opts: any = {}): string {
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

  /**
   * Standard IDF formula: log((nDocs+1)/(wdc+1))
   * Maps to unbounded range, not tunable
   */
  static idfStandard(nDocs: number, wdc: number, idfWeight: number): number {
    return Math.log((nDocs + 1) / (wdc + 1));
  }

  /**
   * Tunable IDF formula: maps word rarity to [0:everywhere..1:rare]
   * Sensitivity to rarity is controlled by idfWeight parameter
   * NOTE: This is NOT the standard IDF formula found in literature
   */
  static idfTunable(nDocs: number, wdc: number, idfWeight: number): number {
    const msg = 'w7e.idfTunable:';
    // Map to [0:ignore..1:important]
    return nDocs ? 1 - Math.exp(((wdc - nDocs) / wdc) * idfWeight) : 1;
  }

  /**
   * Calculates IDF (Inverse Document Frequency) for a word
   * Higher values indicate rarer words (more distinctive)
   */
  idf(word: string, idfWeight: number = this.idfWeight): number {
    let { corpus } = this;
    let wdc = (corpus.wordDocCount as any)[word] || 0; // Word document count
    let nDocs = corpus.size; // Total documents in corpus
    return this.idfFunction(nDocs, wdc, idfWeight);
  }

  /**
   * Adds a document's bag-of-words to the corpus
   * Updates word frequency counts for IDF calculations
   */
  addCorpusDocument(id: string, bow: WordVector): any {
    const msg = 't8w.addCorpusDocument:';
    let { corpus } = this;
    if (id == null) {
      throw new Error(`${msg} id?`);
    }
    if (bow == null) {
      // Bag-of-words maps word to wordCount(word,doc)
      throw new Error(`${msg} bow?`);
    }
    let nWords = Object.values(bow).reduce((a, v) => a + (v as number));
    let docInfo = { id, bow, nWords };
    corpus.wordDocCount.increment(bow.oneHot()); // Update word document counts
    corpus.addDocument(id, docInfo);

    return docInfo;
  }

  /**
   * Adds a document (text string) to the corpus
   * Automatically counts words and creates bag-of-words representation
   */
  addDocument(id: string, doc: string): any {
    let { corpus } = this;
    let { bow, words } = this.countWords(doc);

    return this.addCorpusDocument(id, bow);
  }

  /**
   * Alias for tf() - calculates term frequency
   */
  termFrequency(word: string, document: string): number {
    return this.tf(word, document);
  }

  /**
   * Calculates TF (Term Frequency) for a word in a document
   * Normalized by total word count
   */
  tf(word: string, doc: string): number {
    let { bow, words } = this.countWords(doc);
    let count = (bow as any)[word] || 0;
    return count ? count / words.length : 0;
  }

  /**
   * Calculates TF-IDF vector from a bag-of-words
   * More efficient than computing TF*IDF separately for each word
   */
  tfidfOfBow(bow: WordVector): WordVector {
    const msg = 'w7e.tfidfOfBow:';
    let { corpus, idfWeight } = this;

    // More efficient implementation of tf * idf
    let words = Object.keys(bow);
    let nWords = words.reduce((a, w) => a + (bow as any)[w], 0);

    let vTfIdf = words.reduce((a, word) => {
      let wd = (bow as any)[word] || 0;
      let tf = wd ? wd / nWords : 0;
      let wdc = (corpus.wordDocCount as any)[word] || 0;
      let idf = corpus.size
        ? 1 - Math.exp(((wdc - corpus.size) / wdc) * idfWeight)
        : 1;
      let tfidf = tf * idf;
      if (tfidf) {
        (a as any)[word] = tfidf;
      }
      return a;
    }, new WordVector());

    return vTfIdf;
  }

  /**
   * Calculates TF-IDF vector for a text string with respect to corpus
   */
  tfidf(text: string): WordVector {
    // TfIdf of words in text w/r to corpus
    let { bow } = this.countWords(text);
    return this.tfidfOfBow(bow);
  }

  /**
   * Normalizes text using language-specific normalization function
   */
  normalizeText(str: string): string {
    return this._normalizeText(str, this);
  }

  /**
   * Counts words in text and creates bag-of-words representation
   * Returns both the bow and the list of normalized words
   */
  countWords(str: string): { bow: WordVector; words: string[] } {
    const msg = 'w7e.countWords:';
    if (str == null) {
      throw new Error(`${msg} str?`);
    }
    let dbg = 0;
    let sNorm = this.normalizeText(str);
    let words = sNorm.split(' ');
    let bow = words.reduce((a, w) => {
      (a as any)[w] = ((a as any)[w] || 0) + 1;
      return a;
    }, new WordVector());

    return { bow, words };
  }

  /**
   * Creates bag-of-words with optional word weighting
   * wordWeight can implement strategies like prefix bias (weight early words more)
   */
  bowOfText(text: string, opts: any = {}): WordVector {
    const msg = 'w7e.bowOfText:';
    let dbg = DBG.W7E_BOW_OF_TEXT;
    if (text == null) {
      throw new Error(`${msg} text?`);
    }
    let { wordWeight = (word: string, i: number, n: number) => 1 } = opts;
    let sNorm = this.normalizeText(text);
    let words = sNorm.split(' ');
    let nWords = words.length;
    let bow = words.reduce((a, word, i) => {
      let ww = wordWeight(word, i, nWords); // Apply custom weighting
      (a as any)[word] = ((a as any)[word] || 0) + ww;
      dbg && cc.fyi1(msg + 0.1, { i, word, ww, sum: (a as any)[word] });
      return a;
    }, new WordVector());

    return bow;
  }
} // TfidfSpace
