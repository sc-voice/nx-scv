import { SuttaCentralId } from './sutta-central-id.mjs';

let privateCtor = false;

const INHERITED_KEYS = [
  'lang',
  'author',
  'author_uid',
  'wordSpace',
  'footer',
];

const HDR_KEY = '__header__';

export class EbtDoc {
  constructor(opts) {
    const msg = 'E4c.ctor:';
    if (!privateCtor) {
      throw new Error(`${msg} create()!`);
    }
    Object.defineProperty(this, '_scids', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(this, 'parent', {
      writable: true,
    });

    Object.assign(this, opts);
  }

  static create(opts = {}) {
    const msg = 'E4c.create:';
    let { segMap = {}, parent = {}, suid, bilaraPath } = opts;
    if (segMap == null) {
      throw new Error(`${msg} segMap?`);
    }
    if (typeof segMap === 'string' || segMap instanceof Buffer) {
      segMap = JSON.parse(segMap);
    }
    let args = INHERITED_KEYS.reduce(
      (a, k) => {
        a[k] = opts[k] || parent[k];
        return a;
      },
      { bilaraPath, parent, segMap, suid },
    );

    privateCtor = true;
    let ebtDoc = new EbtDoc(args);
    privateCtor = false;

    return ebtDoc;
  }

  static fromBilaraString(str, parent) {
    const msg = 'E4c.fromBilaraString:';
    let json = JSON.parse(str);
    let { [HDR_KEY]: header } = json;
    let { suid, bilaraPath } = header;
    let scids = Object.keys(json).filter((k) => k !== HDR_KEY);
    let segMap = scids.reduce((a, scid) => {
      a[scid] = json[scid];
      return a;
    }, {});
    let args = Object.keys(header).reduce(
      (a, k) => {
        a[k] = header[k];
        return a;
      },
      { suid, bilaraPath, scids, segMap, parent },
    );
    return EbtDoc.create(args);
  }

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

  toBilaraString() {
    const msg = 'E4c.toBilaraString:';
    let { segMap, parent } = this;
    let scids = this.scids();
    let keys = Object.keys(this);
    let headerKeys = keys.filter((k) => {
      switch (k) {
        case 'segMap':
          return false;
        case 'parent':
          return false;
        default:
          return true;
      }
    });

    let header = headerKeys.reduce((a, k) => {
      let v = this[k];
      if (parent[k] !== v) {
        a[k] = v;
      }
      return a;
    }, {});

    let json = scids.reduce(
      (a, scid) => {
        a[scid] = segMap[scid];
        return a;
      },
      { [HDR_KEY]: header },
    );

    return JSON.stringify(json, null, 2);
  }
}
