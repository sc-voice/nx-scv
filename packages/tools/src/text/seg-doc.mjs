import { SuttaCentralId } from './sutta-central-id.mjs';

export class SegDoc {
  constructor(header) {
    if (header == null) {
      header = {};
    }
    let { 
      suid, lang, author, bilaraPath, segMap = {} 
    } = header;
    if (typeof segMap === 'string' || segMap instanceof Buffer) {
      segMap = JSON.parse(segMap);
    }
    
    Object.defineProperty(this, "_header", {
      value: {
        suid, lang, author, bilaraPath
      },
    });
    Object.defineProperty(this, "segMap", {
      value: segMap,
    });
    Object.defineProperty(this, "_scids", {
      writable: true,
      value: undefined,
    });
  }

  get suid() { return this._header.suid; }
  get lang() { return this._header.lang; }
  get author() { return this._header.author; }
  get bilaraPath() { return this._header.bilaraPath; }

  scids() {
    let { _scids } = this;
    if (_scids == null) {
      _scids = Object.keys(this.segMap);
      _scids.sort(SuttaCentralId.compareLow);
      this._scids = _scids;
    }

    return _scids;
  }

  segments() {
    return this.scids().map((scid) => ({
      scid,
      [this.lang]: this.segMap[scid] || '',
    }));
  }
}
