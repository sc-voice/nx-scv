import { SuttaCentralId } from './sutta-central-id.mjs';

export class SegDoc {
  constructor(opts = {}) {
    let { 
      header,
      suid, lang, author, bilaraPath, segMap = {} 
    } = opts;
    if (typeof segMap === 'string' || segMap instanceof Buffer) {
      segMap = JSON.parse(segMap);
    }

    Object.assign(this, {
      suid,
      lang,
      author,
      bilaraPath,
      segMap,
    });

    Object.defineProperty(this, "__header__", {
      value: header,
    });
  }

  scids() {
    let result = Object.keys(this.segMap);
    result.sort(SuttaCentralId.compareLow);
    return result;
  }

  segments() {
    return this.scids().map((scid) => ({
      scid,
      [this.lang]: this.segMap[scid] || '',
    }));
  }
}
