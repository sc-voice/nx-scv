import fs from 'node:fs';
import should from 'should';
const { promises: fsp } = fs;
import path from 'node:path';
import { Text } from '../../index.mjs';
const { Corpus, WordVector, WordMapTransformer, TfidfSpace } = Text;
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, '../data');

const FOX = 'Fox, a quick brown fox, jumped over the fence';
const MN8_NOE = JSON.parse(
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_translation-fr-noeismet.json'),
  ),
);
const MN8_MOHAN_JSON = JSON.parse(
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_legacy-fr-wijayaratna.json'),
  ),
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
  it('bowOfText() FOX', () => {
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
  it('TESTTESTTfidSpace.normalizeFR()', () => {
    let { normalizeFR } = TfidfSpace;
    should(normalizeFR("d'entendu")).equal('de entendu');
    should(normalizeFR('L’effacement de')).equal('le effacement de');
    should(normalizeFR('de L’effacement')).equal('de le effacement');
    should(normalizeFR('s’étant abc')).equal('s_étant abc');
    should(normalizeFR('abc s’étant')).equal('abc s_étant');
    should(normalizeFR('abc ; def')).equal('abc def');
    should(normalizeFR('abc ?')).equal('abc');
    should(normalizeFR('mal’')).equal('mal');
    should(normalizeFR('j’ai')).equal('j_ai');
  });
  it('TESTTESTnormalizeText() FR phrase', () => {
    let lang = 'fr';
    let ws = new TfidfSpace({ lang });
    let text1 =
      'En se disant : “D’autres prendraient ce qui n’est pas donné, mais ici nous, nous nous abstiendrions de prendre ce qui n’est pas donné”, le déracinement doit être pratiqué.';
    should(ws.normalizeText(text1)).equal(
      'en se disant de autres prendraient ce qui n_est pas donné mais ici nous nous nous abstiendrions de prendre ce qui n_est pas donné le déracinement doit être pratiqué',
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
  it('idfStandard', () => {
    const msg = 'tt8e.idfStandard:';
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
  it('ermFrequency', () => {
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
  it('TESTTESTtfidf()', () => {
    const msg = 'tt8e.tfidf:';
    let ws = new TfidfSpace();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
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
        dog: 0.19213636168689888,
        canine: 0.11094088415839597,
      }),
    );
    should.deepEqual(
      vDocs[1],
      new WordVector({
        wolf: 0.19213636168689888,
        another: 0.19213636168689888,
        canine: 0.11094088415839597,
      }),
    );
    should.deepEqual(
      vDocs[2],
      new WordVector({
        cat: 0.19213636168689888,
        the: 0.19213636168689888,
        feline: 0.19213636168689888,
      }),
    );

    // Compute similarity between TF_IDF vectors of query/docs

    // TF_IDF finds unique match
    let vDog = ws.tfidf('dog');
    should.deepEqual(
      vDog,
      new WordVector({ dog: 0.9606818084344944 }),
    );
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
      0.3779963173777363, // a wolf is another canine (longer)
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
    let vCatCanineMatch = vDocs.map((vDoc) =>
      vCatCanine.similar(vDoc),
    );
    should.deepEqual(vCatCanineMatch, [
      0.2500368611487267, // a dog is a canine
      0.18901209155377868, // a wolf is another canine
      0.4999877127994492, // the cat is a feline
    ]);
  });
  it("addCorpusDocument()", () => {
    let ws = new TfidfSpace();
    let id = 'test-id';
    let bow = new WordVector({a:1, b:2}); // not 1-hot!
    let nWords = 3;
    let docInfo = ws.addCorpusDocument(id, bow, nWords);
    should.deepEqual(docInfo, { id, bow, nWords });
    should(ws.corpus.getDocument(id)).equal(docInfo);
    should.deepEqual(ws.corpus.wordDocCount, new WordVector({
      a:1, // 1-hot
      b:1, // 1-hot
    }));
  });
});
