import fs from 'node:fs';
import { describe, it, expect } from '@sc-voice/vitest';
const { promises: fsp } = fs;
import path from 'node:path';
import { Text } from '../../index.mjs';
const { WordMapTransformer, WordSpace } = Text;
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, '../data');

const Vector = WordSpace.Vector;
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
const wsTest = new WordSpace(WSTEST_CONFIG);

describe('text/word-space', () => {
  it('default ctor', () => {
    let ws = new WordSpace();
    expect(ws.minWord).toBe(4);
    expect(ws.corpusSize).toBe(0);
    expect(ws.idfWeight).toBe(1.618033988749895);
    expect(ws.corpusBow).toEqual(new Vector());
  });
  it('custom ctor', () => {
    let wordMap = { a: 'x' };
    let corpusBow = { a: 1, b: 10 };
    let corpusSize = 2;
    let minWord = 3;
    let ws = new WordSpace({
      minWord,
      corpusBow,
      corpusSize,
      wordMap,
    });
    expect(ws.minWord).toBe(minWord);
    expect(ws.transformText('a fox')).toBe('x fox');
    expect(ws.corpusBow).toBe(corpusBow);
    expect(ws.corpusSize).toBe(corpusSize);
  });
  it('string2Vector() FOX', () => {
    let ws = new WordSpace({ normalizeVector: null });
    let v = ws.string2Vector(FOX);
    expect(v).toBeInstanceOf(Vector);
    expect(v).toEqual(
      new Vector({
        // a: 1, // minWord
        brown: 1,
        fence: 1,
        //fox: 2, // minWord
        jumped: 1,
        over: 1,
        quick: 1,
        //the: 1, // minWord
      }),
    );
    expect(v.length).toBe(5);

    let scale = 0.8;
    let v8 = ws.string2Vector(FOX, scale);
    expect(v8).toEqual(
      new Vector({
        // a: 1*scale, // minWord
        brown: 1 * scale,
        fence: 1 * scale,
        //fox: 2 * scale,
        jumped: 1 * scale,
        over: 1 * scale,
        quick: 1 * scale,
        //the: 1 * scale,
      }),
    );
    expect(v8.length).toBe(5);
  });
  it('string2Vector() Bienheureux', () => {
    let v = wsTest.string2Vector('le Bienheureux dit');
    expect(v).toBeInstanceOf(Vector);
    expect(Object.keys(v)).toEqual(['bouddha']);
    expect(v.bouddha).toBeGreaterThan(0.8);
    expect(v.bouddha).toBeLessThan(0.802);
  });
  it('add()', () => {
    let v1 = new Vector({ a: 1, b: 2 });
    let v2 = new Vector({ b: 10, c: 10 });
    let v3 = v1.add(v2);
    expect(v3).toEqual(new Vector({ a: 1, b: 12, c: 10 }));
  });
  it('increment()', () => {
    let v1 = new Vector({ a: 1, b: 2 });
    let v2 = new Vector({ b: 10, c: 10 });
    let v3 = v1.increment(v2);
    expect(v3).toBe(v1);
    expect(v3).toEqual(new Vector({ a: 1, b: 12, c: 10 }));
  });
  it('norm()', () => {
    let a = new Vector({ a: 2 });
    expect(a.norm()).toBe(2);
    let ab = new Vector({ a: 1, b: 1 });
    expect(ab.norm()).toBe(Math.sqrt(2));
    let abc = new Vector({ a: 1, b: 2, c: 3 });
    expect(abc.norm()).toBe(Math.sqrt(1 + 4 + 9));
    let cba = new Vector({ c: 1, b: 2, a: 3 });
    expect(cba.norm()).toBe(abc.norm());
    let xy = new Vector({ x: 10, y: 20 });
    expect(xy.norm()).toBe(Math.sqrt(100 + 400));
  });
  it('dot()', () => {
    let abc = new Vector({ a: 1, b: 2, c: 3 });
    expect(abc.dot(abc)).toBe(14);
    let ab = new Vector({ a: 10, b: 20 });
    expect(ab.dot(abc)).toBe(50);
    expect(abc.dot(ab)).toBe(50);
    let cba = new Vector({ a: 3, b: 2, c: 1 });
    expect(cba.dot(cba)).toBe(14);
    expect(abc.dot(cba)).toBe(10);
    let xyz = new Vector({ x: 10, y: 11, z: 12 });
    expect(xyz.dot(abc)).toBe(0);
  });
  it('similar()', () => {
    let abc = new Vector({ a: 1, b: 2, c: 3 });
    let ab = new Vector({ a: 1, b: 2 });
    expect(abc.similar(abc)).toBe(1);
    expect(ab.similar(abc)).toBe(0.5976143046671968);
    expect(abc.similar(ab)).toBe(0.5976143046671968);
    expect(abc.similar(ab)).toBe(0.5976143046671968);

    let AB = new Vector({ a: 10, b: 20 });
    expect(abc.similar(AB)).toBe(0.5976143046671968);

    let ab_c = new Vector({ a: 1, b: 2, c: 1 });
    expect(abc.similar(ab_c)).toBe(0.8728715609439696);

    let xyz = new Vector({ x: 1, y: 1, z: 1 });
    let wxyz = new Vector({ w: 1, x: 1, y: 1, z: 1 });
    expect(xyz.similar(wxyz)).toBe(0.8660254037844387);
    expect(wxyz.similar(xyz)).toBe(0.8660254037844387);
  });
  it('similar-mn8:3.4', () => {
    const msg = 'TW7e.similar-mn8:3.4:';
    let dbg = 0;
    let mn8Expected =
      'Un monastique renonce à ces croyances et se libère de ces conceptions en percevant avec clarté, grâce à la juste sagesse, leur origine, leur fondement et leur mécanisme, en réalisant : « Ceci n’est pas à moi, je ne suis pas cela, ce n’est pas mon soi. › ';
    let vmn8Expected = wsTest.string2Vector(MN8_NOE['mn8:2.1']);
    let scoreMax = 0;
    let mn8mohan =
      '<p>Le Bienheureux dit : « Ô Cunda, si toutes ces opinions diverses concernant la théorie du Soi ou concernant la théorie du monde se produisent chez les gens, lorsqu’on voit le lieu où ces diverses opinions se produisent, où ces diverses opinions restent installées, où ces diverses opinions circulent, lorsqu’on le voit selon la réalité tel qu’il est : « Ceci n’est pas à moi, ceci n’est pas moi, ceci n’est pas mon Soi », alors chez lui, ces mêmes opinions disparaissent, ces mêmes opinions sont abandonnées.</p>';
    let vmohan = wsTest.string2Vector(mn8mohan);
    dbg > 1 && console.log(msg, 'vmn8Expected', vmn8Expected, vmohan);
    let scan = Object.keys(MN8_NOE).reduce(
      (a, k) => {
        let segText = MN8_NOE[k];
        let vmn8 = wsTest.string2Vector(segText);
        let score = vmn8.similar(vmohan);
        a.similar[k] = score;
        if (scoreMax < score) {
          scoreMax = score;
          a.match = k;
          dbg &&
            console.log(msg, 'better', k, score, vmohan.intersect(vmn8));
        }
        return a;
      },
      { similar: {} },
    );
    dbg > 1 && console.log(msg, scan);
    expect(scan.match).toBe('mn8:3.4');
  });
  it('WordMapTransformer.normalizeFR()', () => {
    let { normalizeFR } = WordSpace.WordMapTransformer;
    expect(normalizeFR("d'entendu")).toBe('de entendu');
    expect(normalizeFR('L’effacement de')).toBe('le effacement de');
    expect(normalizeFR('de L’effacement')).toBe('de le effacement');
    expect(normalizeFR('s’étant abc')).toBe('se étant abc');
    expect(normalizeFR('abc s’étant')).toBe('abc se étant');
    expect(normalizeFR('abc ?')).toBe('abc $QUESTION');
    expect(normalizeFR('mal’')).toBe('mal’');
  });
  it('transformText() FR phrase', () => {
    let text1 =
      'En se disant : “D’autres prendraient ce qui n’est pas donné, mais ici nous, nous nous abstiendrions de prendre ce qui n’est pas donné”, le déracinement doit être pratiqué.';
    let wordMap = {
      'prendr[^ ]* ce qui n’est pas donné': 'adinnādāyī',
      'voleron[^ ]*': 'adinnādāyī',
    };
    let ws = new WordSpace({ wordMap });
    expect(ws.transformText(text1)).toBe(
      'en se disant  dautres adinnādāyī mais ici nous nous nous abstiendrions de adinnādāyī le déracinement doit être pratiqué',
    );

    let text2 =
      '‹ Certains voleront, cependant nous, ici, ne volerons pas. › ';
    expect(ws.transformText(text2)).toBe(
      '‹ certains adinnādāyī cependant nous ici ne adinnādāyī pas ›',
    );
  });
  it('normalizeVector()', () => {
    let v = new WordSpace.Vector({ a: 0, b: 1, c: 2, d: 10 });
    let ws = new WordSpace({
      normalizeVector: WordSpace.normalizeVector,
    });
    let vNorm = ws.normalizeVector(v);
    expect(v.a).toBe(0);
    expect(v.b).toBe(1);
    expect(v.c).toBe(2);
    expect(v.d).toBe(10);
    expect(vNorm.a).toBe(0);
    expect(vNorm.b).toBeGreaterThan(0.8);
    expect(vNorm.b).toBeLessThan(0.802);
    expect(vNorm.c).toBeGreaterThan(0.96);
    expect(vNorm.c).toBeLessThan(1);
    expect(vNorm.d).toBeGreaterThan(0.9999999);
    expect(vNorm.d).toBeLessThan(1);
  });
  it('intersect', () => {
    const msg = 'TW8e.intersect:';
    let ws = new WordSpace({ normalizeVector: null, minWord: 1 });
    let v1 = ws.string2Vector('a b');
    let v2 = ws.string2Vector('b c');
    let i12 = v1.intersect(v2);
    expect(i12).toEqual(new WordSpace.Vector({ b: 1 }));
    expect(v1.intersect()).toEqual(new WordSpace.Vector({}));
  });
  it('inverseDocumentFrequency', () => {
    const msg = 'tw7e.inverseDocumentFrequency:';
    let ws = WordSpace.createTfIdf();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    expect(ws.idf('human')).toBe(1); // not in corpus

    ws.addDocument(docs[0]);
    expect(ws.corpusBow).toEqual(
      new Vector({
        a: 1, // 1-hot
        dog: 1,
        is: 1,
        canine: 1,
      }),
    );
    expect(ws.corpusSize).toBe(1);
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('dog')).toBe(0); // in all docs
    expect(ws.idf('human')).toBe(1); // not in corpus

    ws.addDocument(docs[1]);
    expect(ws.corpusBow).toEqual(
      new Vector({
        a: 2,
        another: 1,
        is: 2,
        canine: 2,
        wolf: 1,
        dog: 1,
      }),
    );
    expect(ws.idf('a')).toBe(0); // in all docs
    expect(ws.idf('dog')).toBe(0.8017118471377938); // 1/2 of docs
    expect(ws.idf('human')).toBe(1); // not in corpus

    ws.addDocument(docs[2]);
    expect(ws.corpusBow).toEqual(
      new Vector({
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
    expect(ws.corpusSize).toBe(3);
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
  it('ermFrequency', () => {
    const msg = 'tw7e.tf:';
    let ws = WordSpace.createTfIdf();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];

    ws.addDocument(docs[0]);
    ws.addDocument(docs[1]);
    ws.addDocument(docs[2]);
    expect(ws.termFrequency('dog', docs[0])).toBe(0.2);
    expect(ws.termFrequency('a', docs[0])).toBe(0.4);
    expect(ws.termFrequency('human', docs[0])).toBe(0);
  });
  it('tfidf()', () => {
    const msg = 'tw7e.tfidf:';
    let ws = WordSpace.createTfIdf();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    ws.addDocument(docs[0]);
    ws.addDocument(docs[1]);
    ws.addDocument(docs[2]);

    // compute document tfidf vectors
    let vDocs = docs.map((doc) => ws.tfidf(doc));
    expect(vDocs[0]).toEqual(
      new Vector({
        dog: 0.19213636168689888,
        canine: 0.11094088415839597,
      }),
    );
    expect(vDocs[1]).toEqual(
      new Vector({
        wolf: 0.19213636168689888,
        another: 0.19213636168689888,
        canine: 0.11094088415839597,
      }),
    );
    expect(vDocs[2]).toEqual(
      new Vector({
        cat: 0.19213636168689888,
        the: 0.19213636168689888,
        feline: 0.19213636168689888,
      }),
    );

    // Compute similarity between TF_IDF vectors of query/docs

    // TF_IDF finds unique match
    let vDog = ws.tfidf('dog');
    expect(vDog).toEqual(new Vector({ dog: 0.9606818084344944 }));
    let vDogMatch = vDocs.map((vDoc) => vDog.similar(vDoc));
    expect(vDogMatch).toEqual([
      0.8660041217288018, // a dog is a canine
      0, // a wolf is another canine
      0, // the cat is a feline
    ]);

    // TF_IDF favors shorter document (more focus)
    let vCanine = ws.tfidf('canine');
    expect(vCanine).toEqual(new Vector({ canine: 0.5547044207919798 }));
    let vCanineMatch = vDocs.map((vDoc) => vCanine.similar(vDoc));
    expect(vCanineMatch).toEqual([
      0.5000368597900825, // a dog is a canine (shorter)
      0.3779963173777363, // a wolf is another canine (longer)
      0, // the cat is a feline
    ]);

    // although there are no cat canines,
    // query still matches shorter documents with partial match
    // since "cat" is rarer than "canine", the match there is stronger
    let vCatCanine = ws.tfidf('cat canine');
    expect(vCatCanine).toEqual(
      new Vector({
        cat: 0.4803409042172472,
        canine: 0.2773522103959899,
      }),
    );
    let vCatCanineMatch = vDocs.map((vDoc) => vCatCanine.similar(vDoc));
    expect(vCatCanineMatch).toEqual([
      0.2500368611487267, // a dog is a canine
      0.18901209155377868, // a wolf is another canine
      0.4999877127994492, // the cat is a feline
    ]);
  });
});
