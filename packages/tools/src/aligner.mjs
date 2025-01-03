import LegacyDoc from './legacy-doc.mjs';
import SegDoc from './seg-doc.mjs';
import SuttaCentralId from './sutta-central-id.mjs';
import WordSpace from './word-space.mjs';

// Although the use of Pali words in translations is common,
// using Pali for segment alignment is a lot of work for little gain.
// Aligning to Pali doesn't work well because Pali words
// are inflected. This matters because translators tend to
// use uninflected words. For example, the inflection "bhikkhuno"
// is not recognized as a match for the uninflected "bhikkhu".
const ALIGN_PALI = false;

let alignmentCtor = false;

export default class Aligner {
  constructor(opts = {}) {
    const msg = 'Aligner.ctor:';
    let {
      alignPali = ALIGN_PALI,
      authorAligned, // author of segment aligned document
      authorLegacy, // author of legacy document
      groupSize = 1, // comparison group size
      groupDecay = 0.5, // group exponential decay
      lang, // 2-letter ISO language (en, fr, es, pt)
      minScore = 0.1, // minimum alignment score
      scanSize = 10, // maximum segments to scan for alignment
      wordSpace,
      scvEndpoint = "https://www.api.sc-voice.net/scv",
    } = opts;
    if (wordSpace == null) {
      wordSpace = new WordSpace({ lang });
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
      scanSize,
      scvEndpoint,
      wordSpace,
    });
  }

  static get Alignment() {
    return Alignment;
  }

  async fetchMLDoc(scid) {
    const msg = "Aligner.fetchMLDoc:";
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
    } catch(e) {
      console.error(msg, e);
      throw e;
    }
  }

  createAlignment(opts = {}) {
    const msg = 'Alignment.createAlignment:';
    const dbg = 0;
    let { legacyDoc, segDoc, mlDoc } = opts;
    let { lang, alignPali } = this;
    if (!(legacyDoc instanceof LegacyDoc)) {
      throw new Error(`${msg} legacyDoc?`);
    }
    let segIds;
    if (mlDoc) {
      if (segDoc) {
        throw new Error(`${msg} mlDoc=>segDoc?`);
      }
      segIds = Object.keys(mlDoc.segMap);
      segDoc = segIds.reduce((a,id)=>{
        let seg = mlDoc.segMap[id];
        if (seg) {
          let langText = seg[lang] || '';
          if (alignPali) {
            let { pli='' } = seg;
            a[id] = `${langText} ${pli}`;
          } else {
            a[id] = langText;
          }
        }
        return a;
      }, new SegDoc());
      dbg>1 && console.log(msg, '[0.1]segDoc', segDoc);
    }
    if (!(segDoc instanceof SegDoc)) {
      throw new Error(`${msg} segDoc?`);
    }
    let { segMap } = segDoc;
    segIds = segIds || Object.keys(segMap);
    segIds.sort(SuttaCentralId.compareLow);
    let vSegDoc = mlDoc
      ? this.mlDocVectors(mlDoc)
      : this.segDocVectors(segDoc);
    const optsNorm = {
      aligner: this,
      legacyDoc,
      segDoc,
      segIds,
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
    let segIds = Object.keys(segMap);
    let iLastSeg = segIds.length - 1;

    let vectorMap = {};
    let segGroup = [];
    for (let i = segIds.length; i-- > 0; ) {
      let segId = segIds[i];
      let segText = segMap[segId];
      segGroup.unshift(segText);
      if (segGroup.length > groupSize) {
        segGroup.pop();
      }
      let scale = 1;
      let vGroup = segGroup.reduce((a, seg, i) => {
        let vScale = wordSpace.string2Vector(seg, scale);
        scale *= groupDecay;
        return a.add(vScale);
      }, new WordSpace.Vector());
      vectorMap[segId] = vGroup;
    }
    return vectorMap;
  }

  mlDocVectors(mld) {
    const msg = 'Aligner.mlDocVectors';
    let { alignPali, groupDecay, groupSize, wordSpace } = this;
    let { segMap, lang } = mld;
    let segIds = Object.keys(segMap);
    let iLastSeg = segIds.length - 1;

    let vectorMap = {};
    let segGroup = [];
    for (let i = segIds.length; i-- > 0; ) {
      let segId = segIds[i];
      let seg = segMap[segId];
      let segText = seg[lang] || '';
      if (alignPali) {
        let { pli='' } = seg;
        segText = `${segText} ${pli}`;
      }
      segGroup.unshift(segText);
      if (segGroup.length > groupSize) {
        segGroup.pop();
      }
      let scale = 1;
      let vGroup = segGroup.reduce((a, seg, i) => {
        let vScale = wordSpace.string2Vector(segText, scale);
        scale *= groupDecay;
        return a.add(vScale);
      }, new WordSpace.Vector());
      vectorMap[segId] = vGroup;
    }
    return vectorMap;
  }

  align2MLDoc(legacyDoc, mld) {
    const msg = 'Aligner.align2MLDoc';
    let { wordSpace } = this;
    let { segMap } = mld;
    let segIds = Object.keys(segMap);
    segIds.sort(SuttaCentralId.compareLow);
    let vMld = this.mlDocVectors(mld);
  }

  align2SegDoc(legacyDoc, segDoc) {
    const msg = 'Aligner.align2SegDoc';
    let { wordSpace } = this;
    let segIds = Object.keys(segDoc);
    segIds.sort(SuttaCentralId.compareLow);
    let vSegDoc = this.segDocVectors(segDoc);
    let dstMap = {};
    let { lines } = legacyDoc;
    for (let i = 0; i < lines.length; i++) {
      let segId = segIds[i];
    }

    /*
		let scan = segIds.reduce(
			(a, k) => {
				let segText = segDoc.segMap[k];
				let vmn8 = wordSpace.string2Vector(segText);
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
    */
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
    Object.defineProperty(this, 'scanSize', {
      get: () => this.aligner.scanSize,
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
  }

  legacySegId(legacyText, iStart = 0) {
    const msg = 'Alignment.legacySegId:';
    const dbg = 0;
    let { segIds, vSegDoc, wordSpace, scanSize, minScore } = this;
    let vLegacy = wordSpace.string2Vector(legacyText);
    let scoreMax = 0;
    let scoreId;
    for (let i = 0; i < scanSize; i++) {
      let segId = segIds[iStart + i];
      if (segId == null) {
        break;
      }
      let vSeg = vSegDoc[segId];
      if (vSeg == null) {
        throw new Error(`${msg}segId[${segId}]? ${vSegDoc.length}`); 
      }
      let score = vLegacy.similar(vSeg);
      if (minScore <= score && scoreMax < score) {
        scoreMax = score;
        scoreId = segId;
      }
    }

    if (scoreId == null) {
      return undefined;
    }
    let vSeg = vSegDoc[scoreId];
    let intersection = vLegacy.intersect(vSeg);
    return {
      score: scoreMax,
      segId: scoreId,
      intersection,
    };
  }
}
