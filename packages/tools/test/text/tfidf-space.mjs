import fs from 'node:fs';
import should from 'should';
const { promises: fsp } = fs;
import path from 'node:path';
import { Text } from '../../index.mjs';
const { WordVector, WordMapTransformer, TfidfSpace } = Text;
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

describe('TESTTESTtext/tfidf-space', () => {
  it('default ctor', () => {
    let ws = new TfidfSpace();
    should(ws.corpusSize).equal(0);
    should(ws.idfWeight).equal(1.618033988749895);
    should.deepEqual(ws.corpusBow, new WordVector());
  });
  it('custom ctor', () => {
    let corpusBow = { a: 1, b: 10 };
    let corpusSize = 2;
    let ws = new TfidfSpace({
      corpusBow,
      corpusSize,
    });
    should(ws.normalizeText('a "fox"!?')).equal('a fox');
    should(ws.corpusBow).equal(corpusBow);
    should(ws.corpusSize).equal(corpusSize);
  });
  it('string2Vector() FOX', () => {
    let ws = new TfidfSpace();
    let v = ws.string2Vector(FOX);
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

    let scale = 0.8;
    let v8 = ws.string2Vector(FOX, scale);
    should.deepEqual(
      v8,
      new WordVector({
        a: 1 * scale,
        brown: 1 * scale,
        fence: 1 * scale,
        fox: 2 * scale,
        jumped: 1 * scale,
        over: 1 * scale,
        quick: 1 * scale,
        the: 1 * scale,
      }),
    );
    should(v8.length).equal(8);
  });
  it('string2Vector() Bienheureux', () => {
    let v = wsTest.string2Vector('le Bienheureux dit');
    should(v).instanceOf(WordVector);
    should.deepEqual(
      v,
      new WordVector({
        le: 1,
        bienheureux: 1,
        dit: 1,
      }),
    );
  });
  it('TfidSpace.normalizeFR()', () => {
    let { normalizeFR } = TfidfSpace;
    should(normalizeFR("d'entendu")).equal('de entendu');
    should(normalizeFR('L’effacement de')).equal('le effacement de');
    should(normalizeFR('de L’effacement')).equal('de le effacement');
    should(normalizeFR('s’étant abc')).equal('se étant abc');
    should(normalizeFR('abc s’étant')).equal('abc se étant');
    should(normalizeFR('abc ; def')).equal('abc def');
    should(normalizeFR('abc ?')).equal('abc');
    should(normalizeFR('mal’')).equal('mal');
  });
  it('normalizeText() FR phrase', () => {
    let lang = 'fr';
    let ws = new TfidfSpace({ lang });
    let text1 =
      'En se disant : “D’autres prendraient ce qui n’est pas donné, mais ici nous, nous nous abstiendrions de prendre ce qui n’est pas donné”, le déracinement doit être pratiqué.';
    should(ws.normalizeText(text1)).equal(
      'en se disant de autres prendraient ce qui nest pas donné mais ici nous nous nous abstiendrions de prendre ce qui nest pas donné le déracinement doit être pratiqué',
    );

    let text2 =
      '‹ Certains voleront, cependant nous, ici, ne volerons pas. › ';
    should(ws.normalizeText(text2)).equal(
      '‹ certains voleront cependant nous ici ne volerons pas ›',
    );
  });
  it('inverseDocumentFrequency', () => {
    const msg = 'tt8e.inverseDocumentFrequency:';
    let ws = new TfidfSpace();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    should(ws.idf('human')).equal(1); // not in corpus

    ws.addDocument(docs[0]);
    should.deepEqual(
      ws.corpusBow,
      new WordVector({
        a: 1, // 1-hot
        dog: 1,
        is: 1,
        canine: 1,
      }),
    );
    should(ws.corpusSize).equal(1);
    should(ws.idf('a')).equal(0); // in all docs
    should(ws.idf('dog')).equal(0); // in all docs
    should(ws.idf('human')).equal(1); // not in corpus

    ws.addDocument(docs[1]);
    should.deepEqual(
      ws.corpusBow,
      new WordVector({
        a: 2,
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

    ws.addDocument(docs[2]);
    should.deepEqual(
      ws.corpusBow,
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
    should(ws.corpusSize).equal(3);
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
  it('ermFrequency', () => {
    const msg = 'tt8e.tf:';
    let ws = new TfidfSpace();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];

    ws.addDocument(docs[0]);
    ws.addDocument(docs[1]);
    ws.addDocument(docs[2]);
    should(ws.termFrequency('dog', docs[0])).equal(0.2);
    should(ws.termFrequency('a', docs[0])).equal(0.4);
    should(ws.termFrequency('human', docs[0])).equal(0);
  });
  it('tfidf()', () => {
    const msg = 'tt8e.tfidf:';
    let ws = new TfidfSpace();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    ws.addDocument(docs[0]);
    ws.addDocument(docs[1]);
    ws.addDocument(docs[2]);

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
});
