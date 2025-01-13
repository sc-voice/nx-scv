import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
import { ScvMath, Text } from '../../index.mjs';
const { Fraction } = ScvMath;
const { Aligner, LegacyDoc, WordSpace } = Text;
import { DBG } from '../../src/defines.mjs';
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
const MN8_MOHAN_JSON = JSON.parse(
  fs.readFileSync(
    path.join(TEST_DATA, 'mn8_legacy-fr-wijayaratna.json'),
  ),
);
const MN8_LEG_DOC = LegacyDoc.create(MN8_MOHAN_JSON);
const MN8_MOHAN = MN8_MOHAN_JSON.text;
const WS_MOHAN_CONFIG = JSON.parse(
  fs.readFileSync(path.join(TEST_DATA, 'mohan-noeismet-ws.json')),
);
const WS_MOHAN = new WordSpace(WS_MOHAN_CONFIG);
const normalizeVector = (v) => v;
const minWord = 3;
const lang = 'fr';
const wordSpace = new WordSpace({ lang, minWord, normalizeVector });

describe('text/aligner', () => {
  it('default ctor', () => {
    let aligner = new Aligner();
    should(aligner.wordSpace).instanceOf(WordSpace);
    should(aligner.groupSize).equal(1);
    should(aligner.groupDecay).equal(0.5);
    should(aligner.minScore).equal(0.1);
    should(aligner.scanSize).equal(undefined);
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
  it('TESTTESTcreateAlignment mn8', async () => {
    let legacyDoc = MN8_LEG_DOC;
    let lang = 'fr';
    let scanSize = Math.ceil((170 - 67) * 0.8);
    scanSize = 4;
    let aligner = new Aligner({ lang, wordSpace });
    let mlDoc = await aligner.fetchMLDoc('mn8');
    let alt = aligner.createAlignment({ legacyDoc, scanSize, mlDoc });
    should(alt.legacyDoc).equal(legacyDoc);
    should(alt.lang).equal(lang);
    should(alt.mlDoc).equal(mlDoc);
    let nLines = alt.legacyDoc.lines.length;
    should(nLines).equal(67);
    let nSegs = alt.scids.length;
    should(nSegs).equal(170);
    should(alt.scanSize).equal(scanSize);
    should(alt.scids).properties({
      0: 'mn8:0.1',
      1: 'mn8:0.2',
      2: 'mn8:1.1',
      3: 'mn8:1.2',
      168: 'mn8:17.9',
      169: 'mn8:17.10',
    });
  });
  it('fetchMLDoc()', async () => {
    const msg = 'ALIGNER@303:';
    const dbg = DBG.FETCH_ML_DOC;
    let lang = 'fr';
    let authorAligned = 'noeismet';
    let aligner = new Aligner({ lang, authorAligned });
    let mld = await aligner.fetchMLDoc('mn8');
    dbg && console.log(msg, 'mld', mld);
  });
  it(`mlDocVectors() mldv-pali-1`, () => {
    const msg = `ALIGNER.mldv-pali-1`;
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
  it(`TESTTESTmlDocVectors() mldv-pali-2`, () => {
    const msg = `ALIGNER.mldv-pali-2`;
    let wordMap = {
      LEGACY2: 'twopli',
      legacy3: 'threepli',
    };
    let lang = 'fr';
    let wordSpace = new WordSpace({ lang, wordMap, normalizeVector });
    let alignPali = true;
    let groupSize = 2;
    let groupDecay = 0.7;
    let aligner = new Aligner({
      wordSpace,
      groupSize,
      groupDecay,
      alignPali,
    });
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
    should.deepEqual(vectors.s1, new Vector({ onefr: 1.7 }));
    should.deepEqual(
      vectors.s2,
      new Vector({ twofr: 1.7, twopli: 1.7 }),
    );
    should.deepEqual(
      vectors.s3,
      new Vector({ threefr: 1, threepli: 2 }),
    );
  });
  it(`TESTTESTalignLine() mn8`, () => {
    const msg = `ALIGNER.mn8:`;
    let legacyDoc = MN8_LEG_DOC;
    let mlDoc = MN8_MLD;
    let dbg = DBG.MN8_MOHAN;
    let alignPali = true;
    let lang = 'fr';
    let scanSize = 43;
    let wordSpace = WS_MOHAN;
    let aligner = new Aligner({
      scanSize,
      lang,
      alignPali,
      wordSpace,
    });
    let { lines } = legacyDoc;
    let alt = aligner.createAlignment({ legacyDoc, mlDoc });
    let { scids } = alt;
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
      'mn8:12.39', 'mn8:12.40', 'mn8:12.41', 'mn8:12.42', 'mn8:12.43',
      'mn8:12.44', 'mn8:12.45', 'mn8:13.4', 'mn8:14.1', 'mn8:14.3',
      'mn8:14.5', 'mn8:15.1', 'mn8:15.2', 'mn8:16.3', 'mn8:16.5',
      'mn8:17.2',
      'mn8:17.5',
      'mn8:17.6',
    ];
    let iEnd = lines.length - 1;
    let lineCursor = new Fraction(0, lines.length);
    let segCursor = new Fraction(0, scids.length);
    while (lineCursor.difference < 0) {
      let line = lines[lineCursor.numerator];
      dbg && console.log(msg, lineCursor.toString(), line);
      if (rPrev) {
        let { scid, score, intersection } = rPrev;
        let iFound = scids.indexOf(scid);
        if (iFound >= 0) {
          segCursor.numerator = iFound + 1;
        } else {
          dbg &&
            console.error(msg, 'iFound?', lineCursor.toString(), {
              scid,
            });
        }
      }
      let curScid = scids[segCursor.numerator];
      let scidExp = scidExpected[lineCursor.numerator];
      let r = alt.alignLine(line, {
        dbg,
        lineCursor,
        segCursor,
        scidExp,
      });
      rPrev = r;
      if (r) {
        lineCursor.increment();
        res.push(r);
      } else {
        dbg &&
          console.log(
            msg,
            'UNMATCHED', // biome-ignore format:
            lineCursor.toString(),
            segCursor.toString(),
            { curScid, line },
          );
        throw new Error(`${msg} unmatched`);
      }
    }
    if (dbg) {
      let rLast = res.at(-1);
      let iLast = scids.indexOf(rLast.scid);
      let linesMatched = res.length;
      let segsMatched = rLast ? iLast + 1 : undefined;
      console.log(
        msg,
        `TBD legacy-lines:${linesMatched}/${lines.length}`,
        `aligned-segs:${segsMatched}/${scids.length}`,
      );
    }
  });
  it(`TESTTESTalign() align-mn8`, () => {
    const msg = `ALIGNER.align-mn8:`;
    let dbg = DBG.MN8_MOHAN;
    let legacyDoc = MN8_LEG_DOC;
    let mlDoc = MN8_MLD;
    let alignPali = true;
    let lang = 'fr';
    let scanSize = 43;
    let wordSpace = WS_MOHAN;
    let aligner = new Aligner({
      scanSize,
      lang,
      alignPali,
      wordSpace,
    });
    let res = aligner.align(legacyDoc, mlDoc);
    let { lineCursor, details } = res;
    should(lineCursor.denominator).equal(67);
    should(details.length).equal(67);
    should(details[0].scid).equal('mn8:0.2');
    should(details[33].scid).equal('mn8:12.22');
    should(details[66].scid).equal('mn8:17.5');
    dbg &&
      console.log(
        msg,
        res.details.map(
          (r, i) => `[${i + 1}] ${r.scid} (${r.score.toFixed(2)})`,
        ),
      );
  });
});
