import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
import { Aligner, LegacyDoc, SegDoc, WordSpace } from '../index.mjs';
const { Vector } = WordSpace;
const { Alignment } = Aligner;
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, 'data');

const MN8_NOE = JSON.parse(
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_translation-fr-noeismet.json'),
  ),
);
const MN8_SRC_DOC = new SegDoc({ segMap: MN8_NOE });
const MN8_MOHAN_JSON = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mn8-fr.json')),
);
const MN8_MOHAN = MN8_MOHAN_JSON.text;
const MN8_LEG_DOC = LegacyDoc.create(MN8_MOHAN_JSON);
const WSTEST_CONFIG = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mohan-noeismet-ws.json')),
);
const WSTEST = new WordSpace(WSTEST_CONFIG);

describe('Alignment', () => {
  it('default ctor', () => {
    let eCaught;
    try {
      let alt = new Alignment();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/createAlignment()?/);
  });
  it('custom ctor', ()=>{
    let legacyDoc = MN8_LEG_DOC;
    let eCaught;
    try {
      let alt = new Alignment({ legacyDoc });
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/createAlignment()?/);
  });
  it('createAlignment', () => {
    let legacyDoc = MN8_LEG_DOC;
    let segDoc = MN8_SRC_DOC;
    let lang = 'fr';
    let wordSpace = WSTEST;
    let aligner = new Aligner({ lang, wordSpace});
    let alt = aligner.createAlignment({ legacyDoc, segDoc });
    should(alt.legacyDoc).equal(legacyDoc);
    should(alt.lang).equal(lang);
    should(alt.segDoc).equal(segDoc);
    should(alt.segIds).properties({
      0: 'mn8:0.1',
      1: 'mn8:0.2',
      2: 'mn8:1.1',
      3: 'mn8:1.2',
    });
  });
  it('TESTTESTlegacySegId()', () => {
    let legacyDoc = MN8_LEG_DOC;
    let segDoc = MN8_SRC_DOC;
    let scanSize = 2;
    let lang = 'fr';
    let wordSpace = WSTEST;
    let aligner = new Aligner({ lang, scanSize, wordSpace });
    let alt = aligner.createAlignment({ legacyDoc, segDoc });
    let { lines } = legacyDoc;
    let res0 = alt.legacySegId(lines[0], 0);
    should(res0.score).equal(0.5);
    should(res0.segId).equal('mn8:0.2');
    should(res0.intersection).properties({effacement: 1});
  });
});

describe('Aligner', () => {
  it('default ctor', () => {
    let al = new Aligner();
    should(al.wordSpace).instanceOf(WordSpace);
    should(al.groupSize).equal(2);
    should(al.minScore).equal(0.1);
    should(al.scanSize).equal(10);
  });
  it('custom ctor', () => {
    let lang = 'fr';
    let wordSpace = WSTEST;
    let groupSize = 3;
    let scanSize = 11;
    let authorLegacy = "legacy-author";
    let authorAligned = "aligned-author";
    let al = new Aligner({
      authorAligned,
      authorLegacy,
      groupSize,
      lang,
      scanSize,
      wordSpace,
    });
    should(al.wordSpace).equal(wordSpace);
    should(al.groupSize).equal(groupSize);
    should(al.scanSize).equal(scanSize);
    should(al.lang).equal(lang);
    should(al.wordSpace.lang).equal(lang);
  });
  it('segDocVectors', () => {
    let al = new Aligner({ wordSpace: WSTEST });
    let segDoc = {
      segMap: {
        s1: 'one',
        s2: 'two',
        s3: 'three',
      },
    };
    let vectors = al.segDocVectors(segDoc);
    should.deepEqual(vectors.s1, new Vector({ one: 1, two: 1 }));
    should.deepEqual(vectors.s2, new Vector({ two: 1, three: 1 }));
    should.deepEqual(vectors.s3, new Vector({ three: 1 }));
  });
  it('align2SegDoc()', () => {
    let al = new Aligner({ wordSpace: WSTEST });
    al.align2SegDoc(MN8_LEG_DOC, MN8_SRC_DOC);
  });
});
