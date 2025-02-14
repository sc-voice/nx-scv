import fs from 'node:fs';
import should from 'should';
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
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_legacy-fr-wijayaratna.json'),
  ),
);
const MN8_MOHAN = MN8_MOHAN_JSON.text;
const WSTEST_CONFIG = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mohan-noeismet-ws.json')),
);
const wsTest = new WordSpace(WSTEST_CONFIG);

describe('text/word-space', () => {
  it('TESTTESTdefault ctor', () => {
    let ws = new WordSpace();
    should(ws.minWord).equal(4);
    should(ws.corpusSize).equal(0);
    should(ws.idfWeight).equal(1.618033988749895);
    should.deepEqual(ws.corpusBow, new Vector());
  });
  it('TESTTESTcustom ctor', () => {
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
    should(ws.minWord).equal(minWord);
    should(ws.transformText('a fox')).equal('x fox');
    should(ws.corpusBow).equal(corpusBow);
    should(ws.corpusSize).equal(corpusSize);
  });
  it('string2Vector() FOX', () => {
    let ws = new WordSpace({ normalizeVector: null });
    let v = ws.string2Vector(FOX);
    should(v).instanceOf(Vector);
    should.deepEqual(
      v,
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
    should(v.length).equal(5);

    let scale = 0.8;
    let v8 = ws.string2Vector(FOX, scale);
    should.deepEqual(
      v8,
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
    should(v8.length).equal(5);
  });
  it('string2Vector() Bienheureux', () => {
    let v = wsTest.string2Vector('le Bienheureux dit');
    should(v).instanceOf(Vector);
    should.deepEqual(Object.keys(v), ['bouddha']);
    should(v.bouddha).above(0.8).below(0.802);
  });
  it('add()', () => {
    let v1 = new Vector({ a: 1, b: 2 });
    let v2 = new Vector({ b: 10, c: 10 });
    let v3 = v1.add(v2);
    should.deepEqual(v3, new Vector({ a: 1, b: 12, c: 10 }));
  });
  it('TESTTESTincrement()', () => {
    let v1 = new Vector({ a: 1, b: 2 });
    let v2 = new Vector({ b: 10, c: 10 });
    let v3 = v1.increment(v2);
    should(v3).equal(v1);
    should.deepEqual(v3, new Vector({ a: 1, b: 12, c: 10 }));
  });
  it('norm()', () => {
    let a = new Vector({ a: 2 });
    should(a.norm()).equal(2);
    let ab = new Vector({ a: 1, b: 1 });
    should(ab.norm()).equal(Math.sqrt(2));
    let abc = new Vector({ a: 1, b: 2, c: 3 });
    should(abc.norm()).equal(Math.sqrt(1 + 4 + 9));
    let cba = new Vector({ c: 1, b: 2, a: 3 });
    should(cba.norm()).equal(abc.norm());
    let xy = new Vector({ x: 10, y: 20 });
    should(xy.norm()).equal(Math.sqrt(100 + 400));
  });
  it('dot()', () => {
    let abc = new Vector({ a: 1, b: 2, c: 3 });
    should(abc.dot(abc)).equal(14);
    let ab = new Vector({ a: 10, b: 20 });
    should(ab.dot(abc)).equal(50);
    should(abc.dot(ab)).equal(50);
    let cba = new Vector({ a: 3, b: 2, c: 1 });
    should(cba.dot(cba)).equal(14);
    should(abc.dot(cba)).equal(10);
    let xyz = new Vector({ x: 10, y: 11, z: 12 });
    should(xyz.dot(abc)).equal(0);
  });
  it('similar()', () => {
    let abc = new Vector({ a: 1, b: 2, c: 3 });
    let ab = new Vector({ a: 1, b: 2 });
    should(abc.similar(abc)).equal(1);
    should(ab.similar(abc)).equal(0.5976143046671968);
    should(abc.similar(ab)).equal(0.5976143046671968);
    should(abc.similar(ab)).equal(0.5976143046671968);

    let AB = new Vector({ a: 10, b: 20 });
    should(abc.similar(AB)).equal(0.5976143046671968);

    let ab_c = new Vector({ a: 1, b: 2, c: 1 });
    should(abc.similar(ab_c)).equal(0.8728715609439696);

    let xyz = new Vector({ x: 1, y: 1, z: 1 });
    let wxyz = new Vector({ w: 1, x: 1, y: 1, z: 1 });
    should(xyz.similar(wxyz)).equal(0.8660254037844387);
    should(wxyz.similar(xyz)).equal(0.8660254037844387);
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
            console.log(
              msg,
              'better',
              k,
              score,
              vmohan.intersect(vmn8),
            );
        }
        return a;
      },
      { similar: {} },
    );
    dbg > 1 && console.log(msg, scan);
    should(scan.match).equal('mn8:3.4');
  });
  it('TESTTESTWordMapTransformer.normalizeFR()', () => {
    let { normalizeFR } = WordSpace.WordMapTransformer;
    should(normalizeFR('d\'entendu')).equal('de entendu');
    should(normalizeFR('L’effacement de')).equal('le effacement de');
    should(normalizeFR('de L’effacement')).equal('de le effacement');
    should(normalizeFR('s’étant abc')).equal('se étant abc');
    should(normalizeFR('abc s’étant')).equal('abc se étant');
    should(normalizeFR('abc ?')).equal('abc $QUESTION');
    should(normalizeFR('mal’')).equal('mal’');
  });
  it('transformText() FR phrase', () => {
    let text1 =
      'En se disant : “D’autres prendraient ce qui n’est pas donné, mais ici nous, nous nous abstiendrions de prendre ce qui n’est pas donné”, le déracinement doit être pratiqué.';
    let wordMap = {
      'prendr[^ ]* ce qui n’est pas donné': 'adinnādāyī',
      'voleron[^ ]*': 'adinnādāyī',
    };
    let ws = new WordSpace({ wordMap });
    should(ws.transformText(text1)).equal(
      'en se disant  dautres adinnādāyī mais ici nous nous nous abstiendrions de adinnādāyī le déracinement doit être pratiqué',
    );

    let text2 =
      '‹ Certains voleront, cependant nous, ici, ne volerons pas. › ';
    should(ws.transformText(text2)).equal(
      '‹ certains adinnādāyī cependant nous ici ne adinnādāyī pas ›',
    );
  });
  it('normalizeVector()', () => {
    let v = new WordSpace.Vector({ a: 0, b: 1, c: 2, d: 10 });
    let ws = new WordSpace({
      normalizeVector: WordSpace.normalizeVector,
    });
    let vNorm = ws.normalizeVector(v);
    should(v.a).equal(0);
    should(v.b).equal(1);
    should(v.c).equal(2);
    should(v.d).equal(10);
    should(vNorm.a).equal(0);
    should(vNorm.b).above(0.8).below(0.802);
    should(vNorm.c).above(0.96).below(1);
    should(vNorm.d).above(0.9999999).below(1);
  });
  it('intersect', () => {
    const msg = 'TW8e.intersect:';
    let ws = new WordSpace({ normalizeVector: null, minWord: 1 });
    let v1 = ws.string2Vector('a b');
    let v2 = ws.string2Vector('b c');
    let i12 = v1.intersect(v2);
    should.deepEqual(i12, new WordSpace.Vector({ b: 1 }));
    should.deepEqual(v1.intersect(), new WordSpace.Vector({}));
  });
  it('TESTTESTinverseDocumentFrequency', () => {
    const msg = 'tw7e.inverseDocumentFrequency:';
    let ws = WordSpace.createTfIdf();
    let docs = [
      'a dog is a canine',
      'a wolf is another canine',
      'the cat is a feline',
    ];
    should(ws.idf('human')).equal(1); // not in corpus

    ws.addDocument(docs[0]);
    should.deepEqual(
      ws.corpusBow,
      new Vector({
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
      new Vector({
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
  it('TESTTEStermFrequency', () => {
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
    should(ws.termFrequency('dog', docs[0])).equal(0.2);
    should(ws.termFrequency('a', docs[0])).equal(0.4);
    should(ws.termFrequency('human', docs[0])).equal(0);
  });
  it('TESTTESTtfidf()', () => {
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
    let vDocs = docs.map(doc=>ws.tfidf(doc));
    should.deepEqual(vDocs[0], new Vector({
      dog: 0.19213636168689888,
      canine: 0.11094088415839597,
    }));
    should.deepEqual(vDocs[1], new Vector({
      wolf: 0.19213636168689888,
      another: 0.19213636168689888,
      canine: 0.11094088415839597,
    }));
    should.deepEqual(vDocs[2], new Vector({
      cat: 0.19213636168689888,
      the: 0.19213636168689888,
      feline: 0.19213636168689888,
    }));

    // Compute similarity between TF_IDF vectors of query/docs

    // TF_IDF finds unique match
    let vDog = ws.tfidf('dog');
    should.deepEqual(vDog, new Vector({dog:0.9606818084344944}));
    let vDogMatch = vDocs.map(vDoc=>vDog.similar(vDoc));
    should.deepEqual(vDogMatch, [
      0.8660041217288018, // a dog is a canine
      0, // a wolf is another canine
      0, // the cat is a feline
    ]);

    // TF_IDF favors shorter document (more focus)
    let vCanine = ws.tfidf('canine');
    should.deepEqual(vCanine, new Vector({canine:0.5547044207919798}));
    let vCanineMatch = vDocs.map(vDoc=>vCanine.similar(vDoc));
    should.deepEqual(vCanineMatch, [
      0.5000368597900825, // a dog is a canine (shorter)
      0.3779963173777363, // a wolf is another canine (longer)
      0, // the cat is a feline
    ]);

    // although there are no cat canines, 
    // query still matches shorter documents with partial match
    // since "cat" is rarer than "canine", the match there is stronger
    let vCatCanine = ws.tfidf('cat canine');
    should.deepEqual(vCatCanine, new Vector({
      cat: 0.4803409042172472,
      canine: 0.2773522103959899,
    }));
    let vCatCanineMatch = vDocs.map(vDoc=>vCatCanine.similar(vDoc));
    should.deepEqual(vCatCanineMatch, [
      0.2500368611487267, // a dog is a canine
      0.18901209155377868, // a wolf is another canine
      0.4999877127994492, // the cat is a feline
    ]);
  });
  it('TESTTESTtbd', () => {
    const msg = 'tw7e.tbd:';
    let ws = new WordSpace({ normalizeVector: null, minWord: 1 });
    let mlt = {};

    /*
    let { alignMethod, groupDecay, groupSize, wordSpace } = this;
    let { wordMap } = wordSpace;
    let { segMap, lang } = mld;
    let segs = Object.entries(segMap);
    let iLastSeg = segs.length - 1;
    let reList;

    if (alignMethod === 'alignPali') {
      let entries = Object.entries(wordMap);
      reList = entries.reduce((a, e) => {
        let [legacyText, paliText] = e;
        if (paliText) {
          a.set(paliText, new RegExp(`\\b${paliText}`, 'gi'));
        }
        return a;
      }, new Map());
    }

    let vectorMap = {};
    let segGroup = [];
    for (let i = segs.length; i-- > 0; ) {
      let [scid, seg] = segs[i];
      let { pli } = seg;
      let segData = seg[lang] || '';
      let vGroup = new WordSpace.Vector();
      if (alignMethod === 'alignPali') {
        // for aligning Pali, we add all Pali words that
        // occur in the Pali for a segment to the
        // vector input text
        let pliWords = [];
        reList.forEach((re, paliText, map) => {
          let nMatch = pli.match(re)?.length || 0;
          if (nMatch) {
            for (let i = 0; i < nMatch; i++) {
              pliWords.push(paliText);
            }
          }
        });
        if (pliWords.length) {
          segData += ' ' + pliWords.join(' ');
          dbg === scid && console.log(msg, 'segData', scid, segData);
        }
      }
      segGroup.unshift(segData);
      if (segGroup.length > groupSize) {
        segGroup.pop();
      }
      let scale = 1;
      vGroup = segGroup.reduce((a, seg, i) => {
        let vScale = wordSpace.string2Vector(segData, scale);
        scale *= groupDecay;
        return a.add(vScale);
      }, vGroup);
      vectorMap[scid] = vGroup;
    }
  */
  });
});
