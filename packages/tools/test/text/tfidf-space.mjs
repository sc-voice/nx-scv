import fs from 'node:fs';
import should from 'should';
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

describe('TESTTESTtext/tfidf-space', () => {
  it('default ctor', () => {
    let ws = new TfidfSpace();
    testCorpus(ws.corpus);
    should(ws.corpus.size).equal(0);
    should(ws.idfWeight).equal(1.618033988749895);
    should(ws.idfFunction).equal(TfidfSpace.idfTunable);
    should.deepEqual(ws.corpus, new Corpus());
  });
  it('custom ctor', () => {
    let corpus = new Corpus();
    corpus.addDocument('d1', 'the red fox');
    let corpusSize = 2;
    let ws = new TfidfSpace({
      corpus,
    });
    should(ws.normalizeText('a "fox"!?')).equal('a fox');
    should(ws.corpus.size).equal(1);
  });
  it('TESTTESTbowOfText() FOX', () => {
    let ws = new TfidfSpace();
    let v = ws.bowOfText(FOX);
    should(v).instanceOf(WordVector);
    should.deepEqual(
      v,
      new WordVector({
        a: 1,
        brown: 1,
        fence: 1,
        fox: 2,
        jumped: 1,
        over: 1,
        quick: 1,
        the: 1,
      }),
    );
    should(v.length).equal(8);
  });
  it('TESTTESTwordWeightFromPrefix', () => {
    let word = 'test-word';
    let prefixLength = 3;
    let prefixBias = 0.9;
    let wordWeight = TfidfSpace.wordWeightFromPrefix(
      prefixLength,
      prefixBias,
    );

    // nWords larger than prefix
    let nWords = 4;
    should(wordWeight(word, 0, nWords)).equal(1.2);
    should(wordWeight(word, 1, nWords)).equal(1.2);
    should(wordWeight(word, 2, nWords)).equal(1.2);
    should(wordWeight(word, 3, nWords))
      .above(0.399)
      .below(0.4);

    nWords = 5;
    should(wordWeight(word, 0, nWords)).equal(1.5);
    should(wordWeight(word, 2, nWords)).equal(1.5);
    should(wordWeight(word, 4, nWords))
      .above(0.249)
      .below(0.25);
    should(wordWeight(word, 10, nWords))
      .above(0.249)
      .below(0.25);

    should(wordWeight(word, 0, 1)).equal(1);
    should(wordWeight(word, 0, 2)).equal(1);
    should(wordWeight(word, 0, 3)).equal(1);
    should(wordWeight(word, 0, 5)).equal(1.5);
  });
  it('TESTTESTbowOfText() wordWeight', () => {
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
    should(Math.abs(nWords - sum)).below(0.0000000001);

    let v = ws.bowOfText(FOX, { wordWeight });
    should(v).instanceOf(WordVector);
    should(v.a).above(1).equal(v.quick).equal(v.brown);
    should(v.fox).above(v.a);
    should(v.over).below(1).equal(v.jumped).equal(v.over).equal(v.the);
    should(v.length).equal(8);
  });
  it('TfidSpace.normalizeFR()', () => {
    let { normalizeFR } = TfidfSpace;
    should(normalizeFR("d'entendu")).equal('de entendu');
    should(normalizeFR('L’effacement de')).equal('le effacement de');
    should(normalizeFR('de L’effacement')).equal('de le effacement');
    should(normalizeFR('s’étant abc')).equal('s_étant abc');
    should(normalizeFR('abc s’étant')).equal('abc s_étant');
    should(normalizeFR('[abc] ; def')).equal('abc def');
    should(normalizeFR('<span>abc</span> ?')).equal('abc');
    should(normalizeFR('mal’')).equal('mal');
    should(normalizeFR('j’ai')).equal('j_ai');
  });
  it('normalizeText() FR phrase', () => {
    let lang = 'fr';
    let leftQuoteToken = '__LQUOTE '; // TBD: is this useful?
    let ws = new TfidfSpace({ lang, leftQuoteToken });
    should(ws.leftQuoteToken).equal(leftQuoteToken);
    let text1 =
      'En se disant : “D’autres prendraient ce qui n’est pas donné, mais ici nous, nous nous abstiendrions de prendre ce qui n’est pas donné”, le déracinement doit être pratiqué.';
    should(ws.normalizeText(text1)).equal(
      'en se disant __LQUOTE de autres prendraient ce qui n_est pas donné mais ici nous nous nous abstiendrions de prendre ce qui n_est pas donné le déracinement doit être pratiqué',
    );

    let text2 =
      '‹ Certains voleront, cependant nous, ici, ne volerons pas. › ';
    should(ws.normalizeText(text2)).equal(
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
    should(ws.idfFunction).equal(TfidfSpace.idfTunable);
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    should(ws.idf('human')).equal(1); // not in corpus

    ws.addDocument('d0', docs[0]);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        a: 1, // 1-hot in single document
        dog: 1,
        is: 1,
        canine: 1,
      }),
    );
    should(ws.corpus.size).equal(1);
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('dog')).equal(0); // in all docs
    should(ws.idf('human')).equal(1); // not in corpus

    ws.addDocument('d1', docs[1]);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        a: 2, // multiple documents
        another: 1,
        is: 2,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),
    );
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('dog')).equal(0.8017118471377938); // 1/2 of docs
    should(ws.idf('human')).equal(1); // not in corpus

    ws.addDocument('d2', docs[2]);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        the: 1,
        a: 3,
        cat: 1,
        feline: 1,
        another: 1,
        is: 3,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),
    );
    should(ws.corpus.size).equal(3);
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('the')).equal(0.9606818084344944); // 1/3 of docs
    should(ws.idf('human')).equal(1); // not in corpus

    // Different weights for 1/3 of docs
    should(ws.idf('another', 1.4)).equal(0.9391899373747821);
    should(ws.idf('dog', 1.3)).equal(0.9257264217856661);
    should(ws.idf('wolf', 1.2)).equal(0.9092820467105875);
    should(ws.idf('cat', 1.1)).equal(0.8891968416376661);
    should(ws.idf('canine', 1.0)).equal(0.3934693402873666);
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
    should.deepEqual(
      wdc.map((c) => idfStandard(nDocs, c, ignored)),
      [
        1.791759469228055, // Outside [0..1]
        1.0986122886681096, // Outside [0..1]
        0.6931471805599453,
        0.4054651081081644,
        0.1823215567939546,
        0,
      ],
    );

    // Tunable IDF maps to [0..1] and is tunable for
    // sensitivity to rarity
    let weight1 = 1.618033988749895; // default weight
    should.deepEqual(
      wdc.map((c) => idfTunable(nDocs, c, weight1)),
      [
        1, // not in corpus
        0.9984540798120182, // in 1 document of corpus
        0.9117031621211354,
        0.6599590834550455,
        0.33269528758743183, // in all but 1 document of corpus
        0,
      ],
    );

    let weight2 = 1; // less sensitive to rarity
    should.deepEqual(
      wdc.map((c) => idfTunable(nDocs, c, weight2)),
      [
        1, // not in corpus
        0.9816843611112658, // in 1 document of corpus
        0.7768698398515702,
        0.486582880967408,
        0.22119921692859512, // in all but 1 document of corpus
        0,
      ],
    );

    let weightLow = 0.1; // very sensitive to rarity
    should.deepEqual(
      wdc.map((c) => idfTunable(nDocs, c, weightLow)),
      [
        1, // not in corpus
        0.3296799539643607, // in 1 document
        0.1392920235749422,
        0.06449301496838222,
        0.024690087971667385, // in all but 1 document
        0,
      ],
    );
  });
  it('idfStandard', () => {
    const msg = 'tt8e.idfStandard2:';
    // IDF standard doesn't stay in [0..1] and isn't tunable
    let ws = new TfidfSpace({ idfFunction: TfidfSpace.idfStandard });
    should(ws.idfFunction).equal(TfidfSpace.idfStandard);
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    should(ws.idf('human')).equal(0); // not in corpus

    ws.addDocument('d1', docs[0]);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        a: 1, // 1-hot in single document
        dog: 1,
        is: 1,
        canine: 1,
      }),
    );
    should(ws.corpus.size).equal(1);
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('dog')).equal(0); // in all docs
    should(ws.idf('human')).equal(0.6931471805599453); // not in corpus

    ws.addDocument('d2', docs[1]);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        a: 2, // multiple documents
        another: 1,
        is: 2,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),
    );
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('dog')).equal(0.4054651081081644); // 1/2 of docs
    should(ws.idf('human')).equal(1.0986122886681096); // not in corpus

    ws.addDocument('d3', docs[2]);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        the: 1,
        a: 3,
        cat: 1,
        feline: 1,
        another: 1,
        is: 3,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),
    );
    should(ws.corpus.size).equal(3);
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('the')).equal(0.6931471805599453); // 1/3 of docs
    should(ws.idf('human')).equal(1.3862943611198906); // not in corpus
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
    should(ws.termFrequency('dog', docs[0])).equal(0.2);
    should(ws.termFrequency('a', docs[0])).equal(0.4);
    should(ws.termFrequency('human', docs[0])).equal(0);
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
    should.deepEqual(
      res[0].bow,
      new WordVector({
        a: 2,
        dog: 1,
        is: 1,
        canine: 1,
      }),
    );

    // compute document tfidf mectors
    let vDocs = docs.map((doc) => ws.tfidf(doc));
    should.deepEqual(
      vDocs[0],
      new WordVector({
        // a: ignored because omnipresent
        // is: ignored because omnipresent
        dog: 0.19213636168689888,
        canine: 0.11094088415839597,
      }),
    );
    should.deepEqual(
      vDocs[1],
      new WordVector({
        wolf: 0.1200852260543118,
        of: 0.1200852260543118,
        wildest: 0.1200852260543118,
        canine: 0.06933805259899747,
        the: 0.13867610519799495,
      }),
    );
    should.deepEqual(
      vDocs[2],
      new WordVector({
        cat: 0.19213636168689888,
        the: 0.11094088415839597,
        feline: 0.19213636168689888,
      }),
    );

    // Compute similarity between TF_IDF vectors of query/docs

    // TF_IDF finds unique match
    let vDog = ws.tfidf('dog');
    should.deepEqual(vDog, new WordVector({ dog: 0.9606818084344944 }));
    let vDogMatch = vDocs.map((vDoc) => vDog.similar(vDoc));
    should.deepEqual(vDogMatch, [
      0.8660041217288018, // a dog is a canine
      0, // a wolf is another canine
      0, // the cat is a feline
    ]);

    // TF_IDF favors shorter document (more focus)
    let vCanine = ws.tfidf('canine');
    should.deepEqual(
      vCanine,
      new WordVector({ canine: 0.5547044207919798 }),
    );
    let vCanineMatch = vDocs.map((vDoc) => vCanine.similar(vDoc));
    should.deepEqual(vCanineMatch, [
      0.5000368597900825, // a dog is a canine (shorter)
      0.2672781294055441, // a wolf is the other canine (longer)
      0, // the cat is a feline
    ]);

    // although there are no cat canines,
    // query still matches shorter documents with partial match
    // since "cat" is rarer than "canine", the match there is stronger
    let vCatCanine = ws.tfidf('cat canine');
    should.deepEqual(
      vCatCanine,
      new WordVector({
        cat: 0.4803409042172472,
        canine: 0.2773522103959899,
      }),
    );
    let vCatCanineMatch = vDocs.map((vDoc) => vCatCanine.similar(vDoc));
    should.deepEqual(vCatCanineMatch, [
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
    should.deepEqual(docInfo, { id, bow, nWords });
    should(ws.corpus.getDocument(id)).equal(docInfo);
    should.deepEqual(
      ws.corpus.wordDocCount,
      new WordVector({
        a: 1, // 1-hot
        b: 1, // 1-hot
      }),
    );
  });
});
