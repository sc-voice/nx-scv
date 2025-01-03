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
const MN8_MLD_PATH = path.join(TEST_DATA, 'mn8-fr-noeismet.mld.json');
const MN8_MLD = JSON.parse(fs.readFileSync(MN8_MLD_PATH));
const MN8_SRC_DOC = new SegDoc({ segMap: MN8_NOE });
const MN8_MOHAN_JSON = JSON.parse(
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_legacy-fr-wijayaratna.json'),
  ),
);
const MN8_MOHAN = MN8_MOHAN_JSON.text;
const MN8_LEG_DOC = LegacyDoc.create(MN8_MOHAN_JSON);
const WSTEST_CONFIG = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mohan-noeismet-ws.json')),
);
const WSTEST = new WordSpace(WSTEST_CONFIG);

let testId = '';
describe('Aligner', () => {
  it('default ctor', () => {
    let aligner = new Aligner();
    should(aligner.wordSpace).instanceOf(WordSpace);
    should(aligner.groupSize).equal(1);
    should(aligner.groupDecay).equal(0.5);
    should(aligner.minScore).equal(0.1);
    should(aligner.scanSize).equal(10);
  });
  it('custom ctor', () => {
    let lang = 'fr';
    let wordSpace = WSTEST;
    let groupSize = 3;
    let groupDecay = 0.7;
    let scanSize = 11;
    let authorLegacy = 'legacy-author';
    let authorAligned = 'aligned-author';
    let aligner = new Aligner({
      authorAligned,
      authorLegacy,
      groupSize,
      groupDecay,
      lang,
      scanSize,
      wordSpace,
    });
    should(aligner.wordSpace).equal(wordSpace);
    should(aligner.groupSize).equal(groupSize);
    should(aligner.groupDecay).equal(groupDecay);
    should(aligner.scanSize).equal(scanSize);
    should(aligner.lang).equal(lang);
    should(aligner.wordSpace.lang).equal(lang);
  });
  it('segDocVectors groupSize:1', () => {
    let groupSize = 1;
    let wordSpace = WSTEST;
    let aligner = new Aligner({ wordSpace, groupSize });
    let segDoc = {
      segMap: {
        s1: 'one',
        s2: 'two',
        s3: 'three',
      },
    };
    let vectors = aligner.segDocVectors(segDoc);
    should.deepEqual(vectors.s1, new Vector({ one: 1 }));
    should.deepEqual(vectors.s2, new Vector({ two: 1 }));
    should.deepEqual(vectors.s3, new Vector({ three: 1 }));
  });
  it('segDocVectors groupSize:2', () => {
    let groupSize = 2;
    let groupDecay = 0.7;
    let wordSpace = WSTEST;
    let aligner = new Aligner({ wordSpace, groupSize, groupDecay });
    let segDoc = {
      segMap: {
        s1: 'one',
        s2: 'two',
        s3: 'three',
      },
    };
    let vectors = aligner.segDocVectors(segDoc);
    should.deepEqual(
      vectors.s1,
      new Vector({ one: 1, two: groupDecay }),
    );
    should.deepEqual(
      vectors.s2,
      new Vector({ two: 1, three: groupDecay }),
    );
    should.deepEqual(vectors.s3, new Vector({ three: 1 }));
  });
  it('segDocVectors groupSize:3', () => {
    let groupSize = 3;
    let groupDecay = 0.7;
    let wordSpace = WSTEST;
    let aligner = new Aligner({ wordSpace, groupSize, groupDecay });
    let segDoc = {
      segMap: {
        s1: 'one',
        s2: 'two',
        s3: 'three',
        s4: 'four',
      },
    };
    let vectors = aligner.segDocVectors(segDoc);
    let groupDecay2 = groupDecay * groupDecay;
    should.deepEqual(
      vectors.s1,
      new Vector({ one: 1, two: groupDecay, three: groupDecay2 }),
    );
    should.deepEqual(
      vectors.s2,
      new Vector({ two: 1, three: groupDecay, four: groupDecay2 }),
    );
    should.deepEqual(
      vectors.s3,
      new Vector({ three: 1, four: groupDecay }),
    );
    should.deepEqual(vectors.s4, new Vector({ four: 1 }));
  });
  it('align2SegDoc()', () => {
    let aligner = new Aligner({ wordSpace: WSTEST });
    aligner.align2SegDoc(MN8_LEG_DOC, MN8_SRC_DOC);
  });
});

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
  it('custom ctor', () => {
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
    let aligner = new Aligner({ lang, wordSpace });
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
  it('legacySegId() groupDecay:0', () => {
    const msg = 'ALIGNER.groupDecay0:';
    let legacyDoc = MN8_LEG_DOC;
    let segDoc = MN8_SRC_DOC;
    let dbg = 0;
    let groupSize = 2;
    let groupDecay = 0; // equivalent to groupSize 1;
    let lang = 'fr';
    let wordSpace = WSTEST;
    let aligner = new Aligner({
      lang,
      groupSize,
      groupDecay,
      wordSpace,
    });
    let alt = aligner.createAlignment({ legacyDoc, segDoc });
    let { lines } = legacyDoc;
    let { segIds } = alt;
    let iStart = 0;
    let iLine = 0;
    let res = [];
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].intersection).properties({ effacement: 1 });
    should(res[iLine].segId).equal('mn8:0.2');
    should(res[iLine].score).above(0.5).below(0.8);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:1.2');
    //should(res[iLine].segId).equal('mn8:1.1');
    should(res[iLine].intersection).properties({ jeta: 1 });
    should(res[iLine].score).above(0.3).below(0.5);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:2.1');
    should(res[iLine].intersection).properties({ cunda: 2 });
    should(res[iLine].score).above(0.1).below(0.2);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:3.3');
    should(res[iLine].intersection).properties({ monastique: 1 });
    should(res[iLine].score).above(0.2).below(0.3);

    dbg &&
      console.log(
        msg,
        res.map((r) => ({ segId: r.segId, score: r.score })),
      );
  });
  testId = 'leg-groupSize1';
  it(`legacySegId() ${testId}`, () => {
    const msg = `ALIGNER.${testId}:`;
    let legacyDoc = MN8_LEG_DOC;
    let segDoc = MN8_SRC_DOC;
    let dbg = 1;
    let groupSize = 2;
    let groupDecay = 0.8;
    let lang = 'fr';
    let wordSpace = WSTEST;
    let aligner = new Aligner({
      lang,
      groupSize,
      groupDecay,
      wordSpace,
    });
    let alt = aligner.createAlignment({ legacyDoc, segDoc });
    let { lines } = legacyDoc;
    let { segIds } = alt;

    let iStart = 0;
    let iLine = 0;
    let res = [];
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].intersection).properties({ effacement: 1 });
    should(res[iLine].segId).equal('mn8:0.2');
    //should(res[iLine].score).above(0.4).below(0.6);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:1.1');
    should(res[iLine].intersection).properties({ jeta: groupDecay });
    should(res[iLine].score).above(0.3).below(0.5);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:1.2');
    should(res[iLine].intersection).properties({
      cunda: 2 * groupDecay,
    });
    should(res[iLine].score).above(0.1).below(0.2);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:3.3');
    should(res[iLine].intersection).properties({ monastique: 1 });
    should(res[iLine].score).above(0.2).below(0.3);

    dbg &&
      console.log(
        msg,
        res.map((r) => ({
          segId: r.segId,
          score: r.score,
          intersection: r.intersection,
        })),
      );
  });
  it("fetchMLDoc()", async()=>{
    const msg = 'ALIGNER@303:';
    let lang = 'fr';
    let authorAligned = 'noeismet';
    let aligner = new Aligner({lang, authorAligned});
    let mld = await aligner.fetchMLDoc('mn8');
    console.log(msg, 'mld', mld);
  });
  it('mlDocVectors groupSize:1', () => {
    let groupSize = 1;
    let wordSpace = WSTEST;
    let alignPali = true;
    let aligner = new Aligner({ wordSpace, groupSize, alignPali });
    let mld = {
      "bilaraPaths": [],
      "author_uid": "noeismet",
      "sutta_uid": "mn8",
      "lang": "fr",
      segMap: {
        s1: {
          "scid": "mn8:0.1",
          "pli": "onePli",
          "fr": "onefr",
          "ref": "oneref",
        },
        s2: {
          "scid": "mn8:0.2",
          "pli": "twopli",
          "fr": "twofr",
          "ref": "tworef",
        },
        s3: {
          "scid": "mn8:0.3",
          "pli": "threepli",
          "fr": "threefr",
          "ref": "threeref",
        },
      },
    };
    let vectors = aligner.mlDocVectors(mld);
    should.deepEqual(vectors.s1, new Vector({ onefr: 1, onepli: 1}));
    should.deepEqual(vectors.s2, new Vector({ twofr: 1, twopli: 1 }));
    should.deepEqual(vectors.s3, new Vector({ threefr: 1, threepli: 1 }));
  });
  testId = 'mld-groupDecay0';
  it(`TESTTESTlegacySegId() ${testId}`, () => {
    const msg = `ALIGNER.${testId}:`;
    let legacyDoc = MN8_LEG_DOC;
    let mlDoc = MN8_MLD;
    let dbg = 1;
    let groupSize = 2;
    let groupDecay = 0; // equivalent to groupSize 1;
    let lang = 'fr';
    let alignPali = 0; // pointless
    let wordSpace = WSTEST;
    let aligner = new Aligner({
      lang,
      groupSize,
      groupDecay,
      wordSpace,
      alignPali,
    });
    let { lines } = legacyDoc;
    let nLines = 15; 
    console.log(msg, 'TBD nLines', lines.length);
    let alt = aligner.createAlignment({ legacyDoc, mlDoc });
    let { segIds } = alt;
    let iStart = 0;
    let iLine = 0;
    let res = [];
    let rPrev;
    for (let iLine=0; iLine<30; iLine++) {
      let line = lines[iLine];
      if (rPrev) {
        let { segId, score, intersection } = rPrev;
        let iFound = segIds.indexOf(segId);
        if (iFound >= 0) {
          iStart = iFound+1;
        } else {
          console.error(msg, 'iFound?', {iLine, segId});
        }
      }
      let scidStart = segIds[iStart];
      let r = alt.legacySegId(lines[iLine], iStart);
      rPrev = r;
      if (r) {
        res.push(r);
        let { score, segId, intersection } = r;
        if (iLine === nLines) {
          console.log(msg, {iLine, iStart, scidStart, segId, line, intersection});
        }
      } else {
        console.log(msg, 'UNMATCHED', {iStart, scidStart, line, iLine, score});
        throw new Error(`${msg} unmatched`);
      }
    }
    if (dbg) {
      console.log(msg, 'results');
      0 && res.forEach((r,i)=>{
        console.log('  ', i, r.segId, r.score.toFixed(3), 
          JSON.stringify(r.intersection).replace(/[{}"]/g,''));
      });
    }
    should(res[29].segId).equal('mn8:13.4');
    should(res[29].score).above(0.1).below(0.2);
    /*
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].intersection).properties({ effacement: 1 });
    should(res[iLine].segId).equal('mn8:0.2');
    should(res[iLine].score).above(0.5).below(0.8);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:1.2');
    //should(res[iLine].segId).equal('mn8:1.1');
    should(res[iLine].intersection).properties({ jeta: 1 });
    should(res[iLine].score).above(0.3).below(0.5);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:2.1');
    should(res[iLine].intersection).properties({ cunda: 2 });
    should(res[iLine].score).above(0.1).below(0.2);

    iStart = segIds.indexOf(res[iLine].segId) + 1;
    iLine++;
    dbg > 1 &&
      console.log(msg, `${iStart}:lines[${iLine}]`, lines[iLine]);
    res[iLine] = alt.legacySegId(lines[iLine], iStart);
    should(res[iLine].segId).equal('mn8:3.3');
    should(res[iLine].intersection).properties({ monastique: 1 });
    should(res[iLine].score).above(0.2).below(0.3);
    */

  });
});
