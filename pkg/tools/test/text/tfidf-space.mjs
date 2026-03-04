import fs from 'node:fs';
import { describe, it, expect } from '@sc-voice/vitest';
const { promises: fsp } = fs;
import path from 'node:path';
import { Text } from '../../index.mjs';
const {
  ColorConsole,
  Corpus,
  WordVector,
  WordMapTransformer,
  TfidfSpace,
} = Text;
let { cc } = ColorConsole;
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, '../data');

const FOX = 'Fox, a quick brown fox, jumped over the fence';
const MN8_NOE = JSON.parse(
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_translation-fr-noeismet.json'),
  ),
);
const MN8_MOHAN_JSON = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mn8_legacy-fr-wijayaratna.json')),
);
const MN8_MOHAN = MN8_MOHAN_JSON.text;
const WSTEST_CONFIG = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mohan-noeismet-ws.json')),
);
const wsTest = new TfidfSpace(WSTEST_CONFIG);

import { testCorpus } from './corpus.mjs';

describe('text/tfidf-space', () => {
  it('default ctor', () => {
    let ws = new TfidfSpace();
    testCorpus(ws.corpus);
    expect(ws.corpus.size).toBe(0);
    expect(ws.idfWeight).toBe(1.618033988749895);
    expect(ws.idfFunction).toBe(TfidfSpace.idfTunable);
    expect(ws.corpus).toEqual(new Corpus());
  });
  it('custom ctor', () => {
    let corpus = new Corpus();
    corpus.addDocument('d1', 'the red fox');
    let corpusSize = 2;
    let ws = new TfidfSpace({
      corpus,
    });
    expect(ws.normalizeText('a "fox"!?')).toBe('a fox');
    expect(ws.corpus.size).toBe(1);
  });
  it('bowOfText() FOX', () => {
    let ws = new TfidfSpace();
    let v = ws.bowOfText(FOX);
    expect(v).toBeInstanceOf(WordVector);
    expect(v).toEqual(new WordVector({
        a: 1,
        brown: 1,
        fence: 1,
        fox: 2,
        jumped: 1,
        over: 1,
        quick: 1,
        the: 1,
      }),);
    expect(v.length).toBe(8);
  });
  it('wordWeightFromPrefix', () => {
    let word = 'test-word';
    let prefixLength = 3;
    let prefixBias = 0.9;
    let wordWeight = TfidfSpace.wordWeightFromPrefix(
      prefixLength,
      prefixBias,
    );

    // nWords larger than prefix
    let nWords = 4;
    expect(wordWeight(word, 0, nWords)).toBe(1.2);
    expect(wordWeight(word, 1, nWords)).toBe(1.2);
    expect(wordWeight(word, 2, nWords)).toBe(1.2);
    expect(wordWeight(word, 3, nWords))
      .above(0.399)
      .below(0.4);

    nWords = 5;
    expect(wordWeight(word, 0, nWords)).toBe(1.5);
    expect(wordWeight(word, 2, nWords)).toBe(1.5);
    expect(wordWeight(word, 4, nWords))
      .above(0.249)
      .below(0.25);
    expect(wordWeight(word, 10, nWords))
      .above(0.249)
      .below(0.25);

    expect(wordWeight(word, 0, 1)).toBe(1);
    expect(wordWeight(word, 0, 2)).toBe(1);
    expect(wordWeight(word, 0, 3)).toBe(1);
    expect(wordWeight(word, 0, 5)).toBe(1.5);
  });
  it('bowOfText() wordWeight', () => {
    const msg = 'tbowOfText.wordWeight';
    const dbg = 0;
    const ws = new TfidfSpace();
    const words = FOX.split(' ');
    const nWords = words.length;
    const prefixLength = 4; // only pay attention to first words

    // wordWeight sum is always nWords
    let wordWeight = TfidfSpace.wordWeightFromPrefix(prefixLength);
    let sum = 0;
    for (let i = 0; i < nWords; i++) {
      let word = words[i];
      let ww = wordWeight(word, i, nWords);
      sum += ww;
      dbg && cc.fyi1(msg + 0.1, { i, word, ww, sum });
    }
    expect(Math.abs(nWords - sum)).toBeLessThan(0.0000000001);

    let v = ws.bowOfText(FOX, { wordWeight });
    expect(v).toBeInstanceOf(WordVector);
    expect(v.a).toBeGreaterThan(1);
    expect(v.quick).toBe(v.brown);
    expect(v.fox).toBeGreaterThan(v.a);
    expect(v.over).toBeLessThan(1);
    expect(v.jumped).toBe(v.over);
    expect(v.over).toBe(v.the);
    expect(v.length).toBe(8);
  });
  it('TfidSpace.normalizeFR()', () => {
    let { normalizeFR } = TfidfSpace;
    expect(normalizeFR("d'entendu")).toBe('de entendu');
    expect(normalizeFR('L’effacement de')).toBe('le effacement de');
    expect(normalizeFR('de L’effacement')).toBe('de le effacement');
    expect(normalizeFR('s’étant abc')).toBe('s_étant abc');
    expect(normalizeFR('abc s’étant')).toBe('abc s_étant');
    expect(normalizeFR('[abc] ; def')).toBe('abc def');
    expect(normalizeFR('<span>abc</span> ?')).toBe('abc');
    expect(normalizeFR('mal’')).toBe('mal');
    expect(normalizeFR('j’ai')).toBe('j_ai');
  });
  it('normalizeText() FR phrase', () => {
    let lang = 'fr';
    let leftQuoteToken = '__LQUOTE '; // TBD: is this useful?
    let ws = new TfidfSpace({ lang, leftQuoteToken });
    expect(ws.leftQuoteToken).toBe(leftQuoteToken);
    let text1 =
      'En se disant : “D’autres prendraient ce qui n’est pas donné, mais ici nous, nous nous abstiendrions de prendre ce qui n’est pas donné”, le déracinement doit être pratiqué.';
    expect(ws.normalizeText(text1)).toBe(
      'en se disant __LQUOTE de autres prendraient ce qui n_est pas donné mais ici nous nous nous abstiendrions de prendre ce qui n_est pas donné le déracinement doit être pratiqué',
    );

    let text2 =
      '‹ Certains voleront, cependant nous, ici, ne volerons pas. › ';
    expect(ws.normalizeText(text2)).toBe(
      '‹ certains voleront cependant nous ici ne volerons pas ›',
    );
  });
  it('idf() idfTunable', () => {
    const msg = 'tt8e.idf:';
    // Default is idfTunable, which maps to [0:everywhere..1:rare]
    // In addition, the sensitivity to rarity is tunable.
    // Tunability is important because a unit change in raw word count
    // should not cause a major fluctuation in relevance scores.
    // Rarity is asymptotic to 1 (i.e., infinitely rare or not in corpus)
    // This non-standard IDF formula is NOT mentioned in Wikipedia,
    // so I guess it is "novel" :)
    // --Karl Lew Feb 15, 2025
    let ws = new TfidfSpace();
    expect(ws.idfFunction).toBe(TfidfSpace.idfTunable);
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    expect(ws.idf('human')).toBe(1); // not in corpus

    ws.addDocument('d0', docs[0]);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        a: 1, // 1-hot in single document
        dog: 1,
        is: 1,
        canine: 1,
      }),);
    expect(ws.corpus.size).toBe(1);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('dog')).toBe(0); // in all docs
    expect(ws.idf('human')).toBe(1); // not in corpus

    ws.addDocument('d1', docs[1]);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        a: 2, // multiple documents
        another: 1,
        is: 2,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('dog')).toBe(0.8017118471377938); // 1/2 of docs
    expect(ws.idf('human')).toBe(1); // not in corpus

    ws.addDocument('d2', docs[2]);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        the: 1,
        a: 3,
        cat: 1,
        feline: 1,
        another: 1,
        is: 3,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),);
    expect(ws.corpus.size).toBe(3);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('the')).toBe(0.9606818084344944); // 1/3 of docs
    expect(ws.idf('human')).toBe(1); // not in corpus

    // Different weights for 1/3 of docs
    expect(ws.idf('another', 1.4)).toBe(0.9391899373747821);
    expect(ws.idf('dog', 1.3)).toBe(0.9257264217856661);
    expect(ws.idf('wolf', 1.2)).toBe(0.9092820467105875);
    expect(ws.idf('cat', 1.1)).toBe(0.8891968416376661);
    expect(ws.idf('canine', 1.0)).toBe(0.3934693402873666);
  });
  it('idfStandard/idfTunable', () => {
    const msg = 'tt8e.idfStandard-idfTunable:';
    let { idfStandard, idfTunable } = TfidfSpace;
    let nDocs = 5;
    let wdc = []; // word document count
    for (let i = 0; i <= nDocs; i++) {
      wdc.push(i);
    }

    // Standard IDF doesn't map to [0..1] and is not tunable
    let ignored = Math.NaN; // don't care
    expect(wdc.map((c) => idfStandard(nDocs, c, ignored))).toEqual([
        1.791759469228055, // Outside [0..1]
        1.0986122886681096, // Outside [0..1]
        0.6931471805599453,
        0.4054651081081644,
        0.1823215567939546,
        0,
      ],);

    // Tunable IDF maps to [0..1] and is tunable for
    // sensitivity to rarity
    let weight1 = 1.618033988749895; // default weight
    expect(wdc.map((c) => idfTunable(nDocs, c, weight1))).toEqual([
        1, // not in corpus
        0.9984540798120182, // in 1 document of corpus
        0.9117031621211354,
        0.6599590834550455,
        0.33269528758743183, // in all but 1 document of corpus
        0,
      ],);

    let weight2 = 1; // less sensitive to rarity
    expect(wdc.map((c) => idfTunable(nDocs, c, weight2))).toEqual([
        1, // not in corpus
        0.9816843611112658, // in 1 document of corpus
        0.7768698398515702,
        0.486582880967408,
        0.22119921692859512, // in all but 1 document of corpus
        0,
      ],);

    let weightLow = 0.1; // very sensitive to rarity
    expect(wdc.map((c) => idfTunable(nDocs, c, weightLow))).toEqual([
        1, // not in corpus
        0.3296799539643607, // in 1 document
        0.1392920235749422,
        0.06449301496838222,
        0.024690087971667385, // in all but 1 document
        0,
      ],);
  });
  it('idfStandard', () => {
    const msg = 'tt8e.idfStandard2:';
    // IDF standard doesn't stay in [0..1] and isn't tunable
    let ws = new TfidfSpace({ idfFunction: TfidfSpace.idfStandard });
    expect(ws.idfFunction).toBe(TfidfSpace.idfStandard);
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    expect(ws.idf('human')).toBe(0); // not in corpus

    ws.addDocument('d1', docs[0]);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        a: 1, // 1-hot in single document
        dog: 1,
        is: 1,
        canine: 1,
      }),);
    expect(ws.corpus.size).toBe(1);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('dog')).toBe(0); // in all docs
    expect(ws.idf('human')).toBe(0.6931471805599453); // not in corpus

    ws.addDocument('d2', docs[1]);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        a: 2, // multiple documents
        another: 1,
        is: 2,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('dog')).toBe(0.4054651081081644); // 1/2 of docs
    expect(ws.idf('human')).toBe(1.0986122886681096); // not in corpus

    ws.addDocument('d3', docs[2]);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        the: 1,
        a: 3,
        cat: 1,
        feline: 1,
        another: 1,
        is: 3,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),);
    expect(ws.corpus.size).toBe(3);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('the')).toBe(0.6931471805599453); // 1/3 of docs
    expect(ws.idf('human')).toBe(1.3862943611198906); // not in corpus
  });
  it('termFrequency', () => {
    const msg = 'tt8e.tf:';
    let ws = new TfidfSpace();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];

    ws.addDocument('d1', docs[0]);
    ws.addDocument('d2', docs[1]);
    ws.addDocument('d3', docs[2]);
    expect(ws.termFrequency('dog', docs[0])).toBe(0.2);
    expect(ws.termFrequency('a', docs[0])).toBe(0.4);
    expect(ws.termFrequency('human', docs[0])).toBe(0);
  });
  it('tfidf()', () => {
    const msg = 'tt8e.tfidf:';
    let ws = new TfidfSpace();
    let docs = [
      'a dog is a canine',
      'the wolf is the wildest of a canine',
      'the cat is a feline',
    ];
    let res = docs.map((doc, i) => ws.addDocument(`d${i + 1}`, doc));
    expect(res[0].bow).toEqual(new WordVector({
        a: 2,
        dog: 1,
        is: 1,
        canine: 1,
      }),);

    // compute document tfidf mectors
    let vDocs = docs.map((doc) => ws.tfidf(doc));
    expect(vDocs[0]).toEqual(new WordVector({
        // a: ignored because omnipresent
        // is: ignored because omnipresent
        dog: 0.19213636168689888,
        canine: 0.11094088415839597,
      }),);
    expect(vDocs[1]).toEqual(new WordVector({
        wolf: 0.1200852260543118,
        of: 0.1200852260543118,
        wildest: 0.1200852260543118,
        canine: 0.06933805259899747,
        the: 0.13867610519799495,
      }),);
    expect(vDocs[2]).toEqual(new WordVector({
        cat: 0.19213636168689888,
        the: 0.11094088415839597,
        feline: 0.19213636168689888,
      }),);

    // Compute similarity between TF_IDF vectors of query/docs

    // TF_IDF finds unique match
    let vDog = ws.tfidf('dog');
    expect(vDog).toEqual(new WordVector({ dog: 0.9606818084344944 }));
    let vDogMatch = vDocs.map((vDoc) => vDog.similar(vDoc));
    expect(vDogMatch).toEqual([
      0.8660041217288018, // a dog is a canine
      0, // a wolf is another canine
      0, // the cat is a feline
    ]);

    // TF_IDF favors shorter document (more focus)
    let vCanine = ws.tfidf('canine');
    expect(vCanine).toEqual(new WordVector({ canine: 0.5547044207919798 }),);
    let vCanineMatch = vDocs.map((vDoc) => vCanine.similar(vDoc));
    expect(vCanineMatch).toEqual([
      0.5000368597900825, // a dog is a canine (shorter)
      0.2672781294055441, // a wolf is the other canine (longer)
      0, // the cat is a feline
    ]);

    // although there are no cat canines,
    // query still matches shorter documents with partial match
    // since "cat" is rarer than "canine", the match there is stronger
    let vCatCanine = ws.tfidf('cat canine');
    expect(vCatCanine).toEqual(new WordVector({
        cat: 0.4803409042172472,
        canine: 0.2773522103959899,
      }),);
    let vCatCanineMatch = vDocs.map((vDoc) => vCatCanine.similar(vDoc));
    expect(vCatCanineMatch).toEqual([
      0.2500368611487267, // a dog is a canine
      0.1336489165185156, // a wolf is the other canine
      0.5669248158502489, // the cat is a feline
    ]);
  });
  it('addCorpusDocument()', () => {
    let ws = new TfidfSpace();
    let id = 'test-id';
    let bow = new WordVector({ a: 1, b: 5 }); // not 1-hot!
    let nWords = bow.a + bow.b;
    let docInfo = ws.addCorpusDocument(id, bow);
    expect(docInfo).toEqual({ id, bow, nWords });
    expect(ws.corpus.getDocument(id)).toBe(docInfo);
    expect(ws.corpus.wordDocCount).toEqual(new WordVector({
        a: 1, // 1-hot
        b: 1, // 1-hot
      }),);
  });
});
