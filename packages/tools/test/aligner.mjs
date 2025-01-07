import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
import { Aligner, LegacyDoc, SegDoc, WordSpace } from '../index.mjs';
import { DBG } from '../src/defines.mjs';
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
const WS_MOHAN_CONFIG = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mohan-noeismet-ws.json')),
);
const WS_MOHAN = new WordSpace(WS_MOHAN_CONFIG);
const normalizeVector = (v) => v;
const minWord = 3;
const lang = 'fr';
const wordSpace = new WordSpace({ lang, minWord, normalizeVector });

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
    let minWord = 3;
    let groupSize = 1;
    let aligner = new Aligner({
      minWord,
      normalizeVector,
      groupSize,
    });
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
    let minWord = 3;
    let groupSize = 2;
    let groupDecay = 0.7;
    let aligner = new Aligner({
      minWord,
      normalizeVector,
      groupSize,
      groupDecay,
    });
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
    let minWord = 3;
    let groupSize = 3;
    let groupDecay = 0.7;
    let aligner = new Aligner({
      minWord,
      groupSize,
      groupDecay,
      normalizeVector,
    });
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
    let aligner = new Aligner({ wordSpace});
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
  it('fetchMLDoc()', async () => {
    const msg = 'ALIGNER@303:';
    let lang = 'fr';
    let authorAligned = 'noeismet';
    let aligner = new Aligner({ lang, authorAligned });
    let mld = await aligner.fetchMLDoc('mn8');
    console.log(msg, 'mld', mld);
  });
  it(`mlDocVectors() mldv-pali`, () => {
    const msg = `ALIGNER.mldv-pali`;
    let wordMap = {
      LEGACY2: 'twopli',
      legacy3: 'threepli',
    };
    let lang = 'fr';
    let wordSpace = new WordSpace({ lang, wordMap, normalizeVector });
    let alignPali = true;
    let aligner = new Aligner({ wordSpace, alignPali });
    let mld = {
      bilaraPaths: [],
      author_uid: 'noeismet',
      sutta_uid: 'mn8',
      lang: 'fr',
      segMap: {
        s1: {
          scid: 'mn8:0.1',
          pli: 'onePli',
          fr: 'onefr',
          ref: 'oneref',
        },
        s2: {
          scid: 'mn8:0.2',
          pli: 'a twopli b xtwopli c',
          fr: 'twofr',
          ref: 'tworef',
        },
        s3: {
          scid: 'mn8:0.3',
          pli: 'a threeplix b threepliy c',
          fr: 'threefr',
          ref: 'threeref',
        },
      },
    };
    let vectors = aligner.mlDocVectors(mld);
    should.deepEqual(vectors.s1, new Vector({ onefr: 1 }));
    should.deepEqual(vectors.s2, new Vector({ twofr: 1, twopli: 1 }));
    should.deepEqual(
      vectors.s3,
      new Vector({ threefr: 1, threepli: 2 }),
    );
  });
  it(`TESTTESTlegacySegId() mn8`, () => {
    const msg = `ALIGNER.mn8:`;
    let legacyDoc = MN8_LEG_DOC;
    let mlDoc = MN8_MLD;
    let dbg = DBG.MN8_MOHAN;
    let alignPali = true;
    let lang = 'fr';
    let wordSpace = WS_MOHAN;
    let aligner = new Aligner({ lang, alignPali, wordSpace });
    let { lines } = legacyDoc;
    let alt = aligner.createAlignment({ legacyDoc, mlDoc });
    let { segIds } = alt;
    let iStart = 0;
    let iLine = 0;
    let res = [];
    let rPrev;
    let scidExpected =
      // biome-ignore format:
      [ 'mn8:0.2', 'mn8:1.2', 'mn8:2.1', 'mn8:3.1', 'mn8:3.4', 
      'mn8:4.4', 'mn8:5.4', "mn8:6.1", 'mn8:7.1', 'mn8:8.1', 
      'mn8:9.1', 'mn8:10.1', 'mn8:11.1', 'mn8:12.2', 'mn8:12.3', 
      'mn8:12.4', 'mn8:12.5', 'mn8:12.6', 'mn8:12.7', 'mn8:12.8', 
      'mn8:12.9', 'mn8:12.10', 'mn8:12.11', 'mn8:12.12', 'mn8:12.13',
      'mn8:12.14', 'mn8:12.15', 'mn8:12.16', 'mn8:12.17', 'mn8:12.18',
      'mn8:12.19', 'mn8:12.20', 'mn8:12.21', 'mn8:12.22', 'mn8:12.23',
      'mn8:12.24', 'mn8:12.25', 'mn8:12.26', 'mn8:12.27', 'mn8:12.28', 
      'mn8:12.29', 'mn8:12.30', 'mn8:12.31', 'mn8:12.32', 'mn8:12.33', 
      'mn8:12.34', 'mn8:12.35', 'mn8:12.36', 'mn8:12.37', 'mn8:12.38', 
      'mn8:12.39', 'mn8:12.40', 'mn8:12.41', //'mn8:12.42', 'mn8:12.43',

    ];
    let iEnd = scidExpected.length - 1;
    for (let iLine = 0; iLine <= iEnd; iLine++) {
      let line = lines[iLine];
      if (rPrev) {
        let { segId, score, intersection } = rPrev;
        let iFound = segIds.indexOf(segId);
        if (iFound >= 0) {
          iStart = iFound + 1;
        } else {
          dbg && console.error(msg, 'iFound?', { iLine, segId });
        }
      }
      let scidStart = segIds[iStart];
      let scidExp = scidExpected[iLine];
      let r = alt.legacySegId(line, {iStart, dbgSegId:scidExp});
      rPrev = r;
      if (r) {
        res.push(r);
        let { vLegacy, vSeg, score, segId, intersection } = r;
        let atEnd = iLine === iEnd;
        let ok = scidExp == null || segId === scidExp;
        if (!ok || atEnd) {
          let { fr, pli, ref } = mlDoc.segMap[scidStart];
          dbg && 0 &&
            console.log(
              msg,
              ok ? 'ok' : 'ERROR', //biome-ignore format:
              {
                iLine,
                iStart,
                scidStart,
                line,
                fr,
                pli,
                ref,
                segId,
                scidExp,
                intersection,
                score,
                vLegacy: JSON.stringify(vLegacy),
                vSeg: JSON.stringify(vSeg),
              },
            );
          should(segId).equal(scidExp);
        }
      } else {
        console.log(
          msg,
          'UNMATCHED', // biome-ignore format:
          { iStart, scidStart, line, iLine },
        );
        throw new Error(`${msg} unmatched`);
      }
    }
    dbg && console.log(msg, `TBD iEnd:${iEnd}/${lines.length}`);
  });
});
