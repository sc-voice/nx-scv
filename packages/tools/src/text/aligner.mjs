import { DBG } from './defines.mjs';
import { LegacyDoc } from './legacy-doc.mjs';
import { SegDoc } from './seg-doc.mjs';
import { SuttaCentralId } from './sutta-central-id.mjs';
import { WordSpace } from './word-space.mjs';

// Although the use of Pali words in translations is common,
// using Pali for segment alignment is a lot of work for little gain.
// Aligning to Pali doesn't work well because Pali words
// are inflected. This matters because translators tend to
// use uninflected words. For example, the inflection "bhikkhuno"
// is not recognized as a match for the uninflected "bhikkhu".
const ALIGN_PALI = false;

let alignmentCtor = false;

export class Aligner {
  constructor(opts = {}) {
    const msg = 'Aligner.ctor:';
    let {
      alignPali = ALIGN_PALI,
      authorAligned, // author of segment aligned document
      authorLegacy, // author of legacy document
      dbg,
      groupDecay = 0.5, // group exponential decay
      groupSize = 1, // comparison group size
      lang, // 2-letter ISO language (en, fr, es, pt)
      minScore = 0.1, // minimum alignment score
      minWord,
      normalizeVector,
      scanSize, // maximum segments to scan for alignment
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
      dbg,
      alignPali,
      authorAligned,
      authorLegacy,
      groupSize,
      groupDecay,
      lang,
      minScore,
      scanSize,
      scidMap,
      scvEndpoint,
      wordSpace,
    });
  }

  static get Alignment() {
    return Alignment;
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
    const dbg = 0;
    let { legacyDoc, segDoc, mlDoc } = opts;
    let { lang, scanSize } = this;
    if (!(legacyDoc instanceof LegacyDoc)) {
      throw new Error(`${msg} legacyDoc?`);
    }
    let scids;
    if (mlDoc) {
      if (segDoc) {
        throw new Error(`${msg} mlDoc=>segDoc?`);
      }
      scids = Object.keys(mlDoc.segMap);
      segDoc = scids.reduce((a, id) => {
        let seg = mlDoc.segMap[id];
        if (seg) {
          let langText = seg[lang] || '';
          a[id] = langText;
        }
        return a;
      }, new SegDoc());
      dbg > 1 && console.log(msg, '[0.1]segDoc', segDoc);
    }
    if (!(segDoc instanceof SegDoc)) {
      throw new Error(`${msg} segDoc? ${segDoc} ${!!mlDoc}`);
    }
    let { segMap } = segDoc;
    scids = scids || Object.keys(segMap);
    scids.sort(SuttaCentralId.compareLow);
    let nSegs = scids.length;
    let nLines = legacyDoc.lines.length;
    if (nSegs < nLines) {
      throw new Error(`${msg} nSegs < nLines?`);
    }
    let nAligned = 0;
    if (scanSize == null) {
      scanSize = Math.ceil(Math.max(1, (nSegs - nLines) * 0.8));
    }

    let vSegDoc = mlDoc
      ? this.mlDocVectors(mlDoc)
      : this.segDocVectors(segDoc);
    const optsNorm = {
      aligner: this,
      legacyDoc,
      mlDoc,
      nAligned,
      scanSize,
      scids,
      segDoc,
      vSegDoc,
    };

    alignmentCtor = true;
    let alignment = new Alignment(optsNorm);
    alignmentCtor = false;

    return alignment;
  }

  segDocVectors(segDoc) {
    const msg = 'Aligner.segDocVectors';
    let { groupDecay, groupSize, wordSpace } = this;
    let { segMap } = segDoc;
    let scids = Object.keys(segMap);
    let iLastSeg = scids.length - 1;

    let vectorMap = {};
    let segGroup = [];
    for (let i = scids.length; i-- > 0; ) {
      let scid = scids[i];
      let segText = segMap[scid];
      segGroup.unshift(segText);
      if (segGroup.length > groupSize) {
        segGroup.pop();
      }
      let scale = 1;
      let vGroup = segGroup.reduce((a, text, i) => {
        let vScale = wordSpace.string2Vector(text, scale);
        scale *= groupDecay;
        return a.add(vScale);
      }, new WordSpace.Vector());
      vectorMap[scid] = vGroup;
    }
    return vectorMap;
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

  align2MLDoc(legacyDoc, mlDoc, opts = {}) {
    const msg = 'Aligner.align2MLDoc';
    let dbg = DBG.ALIGN_2_MLDOC;
    let { scanSize, lang, alignPali, wordSpace } = this;
    let { scidExpected } = opts;
    let { segMap } = mlDoc;
    let scids = Object.keys(segMap);
    scids.sort(SuttaCentralId.compareLow);
    let vMld = this.mlDocVectors(mlDoc);
    let { lines } = legacyDoc;
    let alt = this.createAlignment({ legacyDoc, mlDoc });
    let iCurSeg = 0;
    let iCurLine = 0;
    let details = [];
    let rPrev;
    let iEnd = lines.length - 1;
    for (let iCurLine = 0; iCurLine <= iEnd; iCurLine++) {
      let line = lines[iCurLine];
      dbg && console.log(msg, iCurLine, line);
      if (rPrev) {
        let { scid, score, intersection } = rPrev;
        let iFound = scids.indexOf(scid);
        if (iFound >= 0) {
          iCurSeg = iFound + 1;
        } else {
          dbg && console.error(msg, 'iFound?', { iCurLine, scid });
        }
      }
      let curScid = scids[iCurSeg];
      let scidExp = scidExpected?.[iCurLine];
      let r = alt.legacyScid(line, {
        dbg,
        iCurLine,
        iCurSeg,
        scidExp,
      });
      rPrev = r;
      if (r) {
        details.push(r);
      } else {
        dbg &&
          console.log(
            msg,
            'UNMATCHED', // biome-ignore format:
            { iCurSeg, curScid, line, iCurLine },
          );
        throw new Error(`${msg} unmatched`);
      }
    }
    if (dbg) {
      let rLast = details.at(-1);
      let iLast = scids.indexOf(rLast.scid);
      let linesMatched = details.length;
      let segsMatched = rLast ? iLast + 1 : undefined;
      console.log(
        msg,
        `TBD legacy-lines:${linesMatched}/${lines.length}`,
        `aligned-segs:${segsMatched}/${scids.length}`,
      );
    }
    return {
      details,
    };
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
    Object.defineProperty(this, 'groupSize', {
      get: () => this.aligner.groupSize,
    });
    Object.defineProperty(this, 'groupDecay', {
      get: () => this.aligner.groupDecay,
    });
    Object.defineProperty(this, 'minScore', {
      get: () => this.aligner.minScore,
    });
    Object.defineProperty(this, 'wordSpace', {
      get: () => this.aligner.wordSpace,
    });
    Object.defineProperty(this, 'progress', {
      get: () => `${this.nAligned}/${this.nLines}`,
    });
  }

  legacyScid(legacyText, opts = {}) {
    const msg = 'Alignment.legacyScid:';
    if (typeof opts === 'number') {
      opts = { iCurSeg: opts };
    }
    let {
      dbg = this.dbg || DBG.LEGACY_SEG_ID,
      iCurLine,
      iCurSeg,
      scidExp,
    } = opts;
    let // biome-ignore format:
      { scids, mlDoc, legacyDoc, vSegDoc, wordSpace, scanSize, 
        minScore, scidMap,
      } = this;
    let vLegacy = wordSpace.string2Vector(legacyText);
    let scoreMax = 0;
    let segMap = mlDoc?.segMap;
    let scoreId;
    for (let i = 0; i < scanSize; i++) {
      let scid = scids[iCurSeg + i];
      if (scid == null) {
        break;
      }
      let vSeg = vSegDoc[scid];
      if (vSeg == null) {
        throw new Error(`${msg}scid[${scid}]? ${vSegDoc.length}`);
      }
      let score = vLegacy.similar(vSeg);
      if (dbg > 1 && scid === scidExp) {
        let seg = mlDoc?.segMap[scid] || {};
        let intersection = vLegacy.intersect(vSeg).toString();
        let { pli } = seg;
        console.log(msg, 'scidExp', {
          seg,
          legacyText,
          vLegacy: vLegacy.toString(),
          vSeg: vSeg.toString(),
          score,
          intersection,
        });
      }
      if (scoreMax < score) {
        scoreMax = score;
        scoreId = scid;
        if (dbg > 1 && scidExp) {
          let cmp = SuttaCentralId.compareLow(scoreId, scidExp);
          let intersection = vLegacy.intersect(vSeg).toString();
          if (cmp <= 0) {
            console.log(msg, `scoreMax-${scidExp}`, {
              scoreId,
              scoreMax,
              intersection,
            });
          } else {
            let segExp = segMap && segMap[scidExp];
            let unMatchedLines = legacyDoc.lines.length - iCurLine;
            let unMatchedSegs = scids.length - iCurSeg;
            console.log(msg, `scoreMax-${scidExp}-MISMATCH?`, {
              scoreId,
              segExp,
              legacyText,
              scoreMax,
              intersection,
              iCurSeg,
              iCurLine,
              unMatchedSegs,
              unMatchedLines,
            });
          }
        }
      }
    }

    if (scoreId && minScore <= scoreMax) {
      this.nAligned++;
      if (dbg) {
        let vSeg = vSegDoc[scoreId];
        let intersection = vLegacy.intersect(vSeg).toString();
        console.log(msg, `scoreMax-${scidExp}-ok`, {
          scoreId,
          scoreMax,
          intersection,
          progress: this.progress,
        });
      }
    } else {
      let iEnd = Math.min(scids.length, iCurSeg + scanSize) - 1;
      let lastId = scids[iEnd];
      let scanned = iEnd - iCurSeg + 1;
      let unMatchedLines = legacyDoc.lines.length - iCurLine;
      let unMatchedSegs = scids.length - iCurSeg;
      dbg &&
        console.log(msg, `UNMATCHED`, {
          legacyText,
          lastId,
          scanned,
          iCurSeg,
          scoreId,
          scoreMax,
          unMatchedSegs,
          unMatchedLines,
        });
      return undefined;
    }
    let vSeg = vSegDoc[scoreId];
    let intersection = vLegacy.intersect(vSeg);
    return {
      score: scoreMax,
      scid: scoreId,
      intersection,
      vLegacy,
      vSeg,
    };
  }
}
