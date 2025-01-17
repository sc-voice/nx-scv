import { DBG } from '../defines.mjs';
import { Fraction } from '../math/fraction.mjs';
import { EbtDoc } from './ebt-doc.mjs';
import { LegacyDoc } from './legacy-doc.mjs';
import { SuttaCentralId } from './sutta-central-id.mjs';
import { Unicode } from './unicode.mjs';
import { WordSpace } from './word-space.mjs';

// Although the use of Pali words in translations is common,
// using Pali for segment alignment is a lot of work for little gain.
// Aligning to Pali doesn't work well because Pali words
// are inflected. This matters because translators tend to
// use uninflected words. For example, the inflection "bhikkhuno"
// is not recognized as a match for the uninflected "bhikkhu".
const ALIGN_PALI = false;

const STATE_OK = 'ok';
const STATE_WARN = 'warn';
const STATE_ERROR = 'error';
const STATE_DONE = 'done';
const {
  GREEN_CHECKBOX,
  LEFT_ARROW,
  RIGHT_ARROW,
  CHECKMARK,
  ELLIPSIS,
  WARNING,
  RED_X,
} = Unicode;
const {
  BLACK,
  WHITE,
  RED,
  GREEN,
  BLUE,
  CYAN,
  MAGENTA,
  YELLOW,
  NO_COLOR,
} = Unicode.LINUX_COLOR;

let alignmentCtor = false;

export class Aligner {
  constructor(opts = {}) {
    const msg = 'Aligner.ctor:';
    let {
      alignPali = ALIGN_PALI,
      authorAligned, // author of segment aligned document
      authorLegacy, // author of legacy document
      groupDecay = 0.5, // group exponential decay
      groupSize = 1, // comparison group size
      lang, // 2-letter ISO language (en, fr, es, pt)
      maxScanSize, // maximum segments to scan for alignment
      minScanSize = 5, // minimum number of segments to scan
      minScore = 0.1, // minimum alignment score
      minWord,
      normalizeVector,
      scidMap = {},
      scvEndpoint = 'https://www.api.sc-voice.net/scv',
      wordSpace,
    } = opts;
    if (wordSpace == null) {
      wordSpace = new WordSpace({ lang, minWord, normalizeVector });
    }
    if (lang == null) {
      lang = wordSpace.lang;
    }

    Object.assign(this, {
      alignPali,
      authorAligned,
      authorLegacy,
      groupSize,
      groupDecay,
      lang,
      minScore,
      minScanSize,
      maxScanSize,
      scidMap,
      scvEndpoint,
      wordSpace,
    });
  }

  static get Alignment() {
    return Alignment;
  }

  static get Status() {
    return Status;
  }

  async fetchMLDoc(scid) {
    const msg = 'Aligner.fetchMLDoc:';
    let { lang, scvEndpoint, authorAligned } = this;
    let url = [
      scvEndpoint,
      'search',
      `${scid}%20-da%20${authorAligned}%20-ml1`,
      lang,
    ].join('/');
    try {
      let res = await fetch(url);
      let json = await res.json();
      let mld = json.mlDocs[0];
      return mld;
    } catch (e) {
      console.error(msg, e);
      throw e;
    }
  }

  createAlignment(opts = {}) {
    const msg = 'Alignment.createAlignment:';
    const dbg = DBG.CREATE_ALIGNMENT;
    let {
      legacyDoc,
      mlDoc,
      minScore = this.minScore,
      minScanSize = this.minScanSize,
      maxScanSize = this.maxScanSize,
      scidsExp,
    } = opts;
    let { lang } = this;
    if (!(legacyDoc instanceof LegacyDoc)) {
      throw new Error(`${msg} legacyDoc?`);
    }
    if (mlDoc == null) {
      throw new Error(`${msg} mlDoc?`);
    }

    let nLines = legacyDoc.lines.length;
    let lineCursor = new Fraction(0, nLines, 'lines');
    let scids = Object.keys(mlDoc.segMap);
    let nSegs = scids.length;
    scids.sort(SuttaCentralId.compareLow);
    let segCursor = new Fraction(0, nSegs, 'segs');
    if (nSegs < nLines) {
      throw new Error(`${msg} nSegs:${nSegs} < nLines:${nLines}?`);
    }
    if (maxScanSize == null) {
      maxScanSize = Math.ceil(Math.max(1, (nSegs - nLines) * 0.8));
    }
    if (minScanSize < 1) {
      throw new Error(`${msg} minScanSize? ${minScanSize} `);
    }

    const optsAlignment = {
      aligner: this,
      ebtDoc: EbtDoc.create(),
      legacyDoc,
      lineCursor,
      mlDoc,
      minScore,
      minScanSize,
      maxScanSize,
      scids,
      scidsExp,
      segCursor,
      vMLDoc: this.mlDocVectors(mlDoc),
    };
    alignmentCtor = true;
    let alignment = new Alignment(optsAlignment);
    alignmentCtor = false;

    return alignment;
  }

  mlDocVectors(mld) {
    const msg = 'Aligner.mlDocVectors';
    const dbg = DBG.ML_DOC_VECTORS;
    let { alignPali, groupDecay, groupSize, wordSpace } = this;
    let { wordMap } = wordSpace;
    let { segMap, lang } = mld;
    let segs = Object.entries(segMap);
    let iLastSeg = segs.length - 1;
    let reList;

    if (alignPali) {
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
      if (alignPali) {
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
    return vectorMap;
  }
}

class Alignment {
  constructor(opts = {}) {
    const msg = 'Alignment.ctor:';
    if (!alignmentCtor) {
      throw new Error(`${msg} createAlignment()?`);
    }

    Object.assign(this, opts);
    Object.defineProperty(this, 'lang', {
      get: () => this.aligner.lang,
    });
    Object.defineProperty(this, 'wordSpace', {
      get: () => this.aligner.wordSpace,
    });
    Object.defineProperty(this, 'status', {
      get: () => {
        let { legacyDoc, history } = this;
        if (history.length === 0) {
          let { uid, lang, author_uid } = legacyDoc;
          let text = `${uid}/${lang}/${author_uid} unaligned`;
          return new Status(this, { text });
        }
        return history.at(-1);
      },
    });

    this.history = [];
    let { legacyDoc } = this;
  }

  pushStatus(opts) {
    let status = new Status(this, opts);
    this.history.push(status);
    return status;
  }

  alignLine(legacyText, opts = {}) {
    const msg = 'Alignment.alignLine:';
    const dbg = DBG.ALIGN_LINE;
    if (typeof opts !== 'object') {
      throw new Error(`${msg} opts?`);
    }
    let { scidExp } = opts;
    // biome-ignore format:
    let { 
      legacyDoc, lineCursor,
      mlDoc, vMLDoc, segCursor, scids, 
      wordSpace, maxScanSize, minScanSize,
      minScore, scidMap, 
    } = this;
    if (segCursor == null) {
      throw new Error(`${msg} segCursor?`);
    }
    if (lineCursor == null) {
      throw new Error(`${msg} lineCursor?`);
    }
    let vLegacy = wordSpace.string2Vector(legacyText);
    let scoreMax = 0;
    let segMap = mlDoc.segMap;
    let scoreId;
    for (
      let i = 0;
      i < maxScanSize && (i < minScanSize || scoreMax < minScore);
      i++
    ) {
      let scid = scids[segCursor.numerator + i];
      if (scid == null) {
        break;
      }
      let vSeg = vMLDoc[scid];
      if (vSeg == null) {
        throw new Error(`${msg}scid[${scid}]? ${vMLDoc.length}`);
      }
      let score = vLegacy.similar(vSeg);
      if (minScanSize <= i) {
        // Scan exceeded minScanSize. We might be lost.
        // Or maybe we got lucky and translator omitted many segments.
        // For example, MN8 42 segments are skipped for Môhan
        // biome-ignore format:
        if (score) {
          let percent = (score*100).toFixed(0);
          let status = minScore <= score 
            ? '\u001b[32m'
            : '\u001b[31m';
          dbg && console.log(msg, 
            ` ${WARNING}${status} SCAN+${i} ${scid}🡘 ${percent}%`,
            '\u001b[0m', // console color end
            );
        }
      }
      // biome-ignore format:
      if (dbg > 1 && scid === scidExp) {
        let seg = mlDoc?.segMap[scid] || {};
        let intersection = vLegacy.intersect(vSeg).toString();
        let { pli } = seg;
        console.log(msg, 'scidExp', {
          legacyText, vLegacy: vLegacy.toString(),
          seg, vSeg: vSeg.toString(),
          score, intersection,
        });
      }
      if (scoreMax < score) {
        scoreMax = score;
        scoreId = scid;
        if (dbg > 1 && scidExp) {
          let cmp = SuttaCentralId.compareLow(scoreId, scidExp);
          let intersection = vLegacy.intersect(vSeg).toString();
          // biome-ignore format:
          if (cmp <= 0) {
            console.log(msg, `scoreMax-${scidExp}`, 
              { scoreId, scoreMax, intersection, });
          } else {
            let segExp = segMap && segMap[scidExp];
            console.log( msg, `scoreMax-${scidExp}-MISMATCH?`,
              segCursor.toString(),
              lineCursor.toString(),
              { scoreId, segExp, legacyText, scoreMax, intersection},
            );
          }
        }
      }
    }

    if (scoreId == null || scoreMax < minScore) {
      let iEnd =
        Math.min(scids.length, segCursor.numerator + maxScanSize) - 1;
      let lastId = scids[iEnd];
      let scanned = iEnd - segCursor.numerator + 1;
      // biome-ignore format:
      dbg && console.log( msg, `UNMATCHED`,
          { legacyText, lastId, scanned, scoreId, scoreMax },
          segCursor.toString(),
          lineCursor.toString(),
        );
      return undefined;
    }

    lineCursor.increment();
    let iFound = scids.indexOf(scoreId);
    if (iFound >= 0) {
      segCursor.numerator = iFound + 1;
    } else {
      dbg &&
        console.error(msg, `${ERROR} iFound?`, {
          lineCursor,
          scoreId,
        });
    }
    let vSeg = vMLDoc[scoreId];
    let intersection = vLegacy.intersect(vSeg);
    let status = this.pushStatus({
      score: scoreMax,
      scid: scoreId,
      intersection,
      vLegacy,
      vSeg,
    });
    dbg && console.log(msg, status.summary);
    if (lineCursor.value === 1) {
      let { uid, lang, author_uid } = this.legacyDoc;
      this.pushStatus({
        state: STATE_DONE,
        text: `${uid}/${lang}/${author_uid} aligned`,
      });
      dbg && console.log(msg, this.status.summary);
    }

    return {
      score: scoreMax,
      scid: scoreId,
      intersection,
      vLegacy,
      vSeg,
    };
  } // alignLine

  alignAll() {
    const msg = 'Alignment.alignAll:';
    let dbg = DBG.ALIGN_ALL;
    //bimoe-ignore format:
    let {
      aligner,
      legacyDoc,
      lineCursor,
      mlDoc,
      vMLDoc,
      segCursor,
      scidsExp,
      minScanSize,
      maxScanSize,
    } = this;
    let { lang, alignPali, wordSpace } = aligner;
    let { segMap } = mlDoc;
    let scids = Object.keys(segMap);
    scids.sort(SuttaCentralId.compareLow);
    let { lines } = legacyDoc;
    let rPrev;
    let iEnd = lines.length - 1;

    while (lineCursor.difference < 0) {
      let line = lines[lineCursor.numerator];
      dbg > 1 && console.log(msg, lineCursor.toString(), line);
      let curScid = scids[segCursor.numerator];
      let scidExp = scidsExp?.[lineCursor.numerator];
      let r = this.alignLine(line, { scidExp });
      rPrev = r;
      // biome-ignore format:
      if (r == null) {
        dbg && console.log( msg, 'UNMATCHED', 
          lineCursor.toString(),
          segCursor.toString(),
          { curScid, line, minScanSize, maxScanSize },
        );
        throw new Error(`${msg} unmatched`);
      }
    }

    // biome-ignore format:
    return {
      status: this.status.summary,
    };
  } // alignAll
} // class Alignment

class Status {
  constructor(alignment, opts = {}) {
    let { lineCursor, segCursor } = alignment;
    let {
      text,
      scid,
      state = STATE_OK,
      score,
      intersection,
      vLegacy,
      vSeg,
    } = opts;

    Object.assign(this, {
      alignment,
      intersection,
      lineCursor: lineCursor && new Fraction(lineCursor),
      text,
      scid,
      score,
      segCursor: segCursor && new Fraction(segCursor),
      state,
      vLegacy,
      vSeg,
    });

    Object.defineProperty(this, 'scorePercent', {
      get: () =>
        this.score == null
          ? '--%'
          : `${(100 * this.score)?.toFixed(0)}%`,
    });
    Object.defineProperty(this, 'lineCur', {
      get: () => this?.lineCursor?.toString(),
    });
    Object.defineProperty(this, 'segCur', {
      get: () => this?.segCursor?.toString(),
    });
  }

  get summary() {
    let { state, text, scid, scorePercent, lineCur, segCur, score } =
      this;

    let symbol;
    switch (state) {
      case STATE_ERROR:
        symbol = RED_X;
        break;
      case STATE_WARN:
        symbol = '${RED}\u26A0${NO_COLOR}';
        break;
      case STATE_DONE:
        symbol = GREEN_CHECKBOX;
        break;
      case STATE_OK:
      default:
        symbol = `${GREEN}${CHECKMARK}${NO_COLOR}`;
        break;
    }

    if (score == undefined) {
      return [
        symbol, 
        text,
        lineCur,
        segCur,
      ].join(' ');
    }

    let status = [
      symbol,
      text,
      lineCur,
      `${LEFT_ARROW}${scorePercent}${RIGHT_ARROW}`,
      scid,
      segCur,
    ].join(' ');

    return status;
  }
} // Status
