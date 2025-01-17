import { DBG } from '../defines.mjs';
import { BilaraPath } from './bilara-path.mjs';

export class SuttaCentralId {
  constructor(scid = null) {
    if (scid == null) {
      throw new Error(`required scid:${scid}`);
    }
    this.scid = scid;
  }

  static basename(fp) {
    return fp.split('/').pop();
  }

  static match(scid, pat) {
    const msg = 'SuttaCentralId.match() ';
    let id = pat.indexOf(':') >= 0 ? scid : scid.split(':')[0];
    let pats = pat.split(/, */);
    if (pats.length > 1) {
      return pats.reduce(
        (a, p) => a || SuttaCentralId.match(scid, p),
        false,
      );
    }
    let scidPat = pat
      .replace(/\/[^:]*/, '') // remove language and  translator
      .replace(/ */g, ''); // "thig 1.1" => "thig1.1"
    let scidLow = SuttaCentralId.rangeLow(id);
    let scidHigh = SuttaCentralId.rangeHigh(id);
    let matchLow = SuttaCentralId.rangeLow(scidPat);
    let matchHigh = SuttaCentralId.rangeHigh(scidPat);
    let cmpL = SuttaCentralId.compareLow(scidHigh, matchLow);
    let cmpH = SuttaCentralId.compareHigh(scidLow, matchHigh);
    let match = 0 <= cmpL && cmpH <= 0;
    //console.log(msg, {scidLow, scidHigh, matchLow, matchHigh, cmpL, cmpH, match});
    return match;
  }

  static rangeHigh(scid) {
    let slashParts = scid.split('/');
    let scidMain = slashParts.shift();
    let suffix = slashParts.join('/');
    let extRanges = scidMain.split('--');
    if (extRanges.length > 2) {
      throw new Error(`Invalid SuttaCentral reference:${scid}`);
    }
    let [c0, c1] = extRanges.map((er) => er.split(':'));
    let result = extRanges.pop();
    if (c1 && c0.length > 1 && c1.length < 2) {
      result = `${c0[0]}:${result}`;
    }
    result =
      c0.length > 1
        ? result.replace(/[0-9]+-/g, '') + '.9999'
        : result.replace(/[0-9]+-/g, '');
    return suffix ? `${result}/${suffix}` : result;
  }

  static rangeLow(scid) {
    let slashParts = scid.split('/');
    let scidMain = slashParts.shift();
    let suffix = slashParts.join('/');
    let result = scidMain.split('--')[0];
    result = result.replace(/-[0-9]+/g, '');
    return suffix ? `${result}/${suffix}` : result;
  }

  static test(text) {
    if (typeof text !== 'string') {
      throw new Error(`Expected string:${text}`);
    }
    let commaParts = text
      .toLowerCase()
      .split(',')
      .map((p) => p.trim());
    return commaParts.reduce((acc, part) => {
      part = part.replace(/\. */gu, '.');
      return acc && /^[-a-z]+ ?[0-9]+[-0-9a-z.:\/]*$/i.test(part);
    }, true);
  }

  static languages(text) {
    if (!SuttaCentralId.test(text)) {
      return [];
    }
    let commaParts = text
      .toLowerCase()
      .split(',')
      .map((p) => p.trim());
    return commaParts.reduce((a, c) => {
      let cparts = c.split('/');
      let lang = cparts[1];
      if (lang && a.indexOf(lang) < 0) {
        a.push(lang);
      }
      return a;
    }, []);
  }

  static scidRegExp(pat) {
    if (!pat) {
      return /.*/;
    }

    pat = pat.replace(/\./g, '\\.');
    pat = pat.replace(/\*/g, '.*');
    pat = pat.replace(/\?/g, '.');
    pat = pat.replace(/[$^]/g, '\\$&');
    return new RegExp(pat);
  }

  static partNumber(part, id) {
    const msg = 'SuttaCentralId.partNumber() ';
    let n = Number(part);
    let n0;
    let n1;
    if (Number.isNaN(n)) {
      let caretParts = part.split('^');
      let [c0, c1] = caretParts;
      if (c1 == null) {
        let c0dig = c0.replace(/[a-z]*/giu, '');
        let c0let = c0.replace(/[0-9]*/gu, '').toLowerCase();
        n0 = Number(c0dig);
        n1 = c0let.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
        if (Number.isNaN(n0) || Number.isNaN(n1)) {
          throw new Error(
            `partNumber() cannot parse ${part} in ${id}`,
          );
        }
      } else {
        n0 = Number(c0);
        n1 = c1.charCodeAt(0) - 'z'.charCodeAt(0) - 1;
      }

      return [n0, n1];
    } else {
      return [n];
    }
  }

  static scidNumbersLow(id_or_path) {
    let scid = BilaraPath.pathParts(id_or_path).suid;
    let colonParts = scid.replace(/^[-a-z]*/, '').split(':');
    let dotParts = colonParts.reduce(
      (a, c) => a.concat(c.split('.')),
      [],
    );
    let nums = dotParts.reduce((a, n) => {
      let lowPart = n.split('-')[0];
      return a.concat(SuttaCentralId.partNumber(lowPart, id_or_path));
    }, []);
    return nums;
  }

  static scidNumbersHigh(id_or_path) {
    let scid = BilaraPath.pathParts(id_or_path).suid;
    let colonParts = scid.replace(/^[-a-z]*/, '').split(':');
    let dotParts = colonParts.reduce(
      (a, c) => a.concat(c.split('.')),
      [],
    );
    let nums = dotParts.reduce((a, n) => {
      let highPart = n.split('-').pop();
      return a.concat(
        SuttaCentralId.partNumber(highPart, id_or_path),
      );
    }, []);
    return nums;
  }

  static compareHigh(a, b) {
    const msg = 'SuttaCentralId.compareHigh()';
    const dbg = DBG.COMPARE;
    let abase = SuttaCentralId.basename(a);
    let bbase = SuttaCentralId.basename(b);
    let aprefix = abase.substring(0, abase.search(/[0-9]/)) || a;
    let bprefix = bbase.substring(0, bbase.search(/[0-9]/)) || b;
    let cmp = aprefix.localeCompare(bprefix);
    dbg &&
      console.log(msg, '[1]cmp prefix', {
        cmp,
        abase,
        bbase,
        aprefix,
        bprefix,
      });
    if (cmp === 0) {
      let adig = SuttaCentralId.scidNumbersHigh(a);
      let bdig = SuttaCentralId.scidNumbersHigh(b);
      let n = Math.max(adig.length, bdig.length);
      for (let i = 0; i < n; i++) {
        let ai = adig[i];
        let bi = bdig[i];
        if (ai === bi) {
          continue;
        }
        if (ai === undefined) {
          return -bi || -1;
        }
        if (bi === undefined) {
          return ai || 1;
        }
        return ai - bi;
      }
    }
    return cmp;
  }

  static compareLow(a, b) {
    const msg = 'SuttaCentralId.compareLow()';
    const dbg = DBG.COMPARE;
    let abase = SuttaCentralId.basename(a);
    let bbase = SuttaCentralId.basename(b);
    let adigit = abase.search(/[0-9]/);
    let bdigit = bbase.search(/[0-9]/);
    let aprefix = adigit < 0 ? abase : abase.substring(0, adigit);
    let bprefix = bdigit < 0 ? bbase : bbase.substring(0, bdigit);
    let cmp = aprefix.localeCompare(bprefix);
    dbg &&
      console.log(msg, '[1]cmp prefix', {
        cmp,
        abase,
        bbase,
        aprefix,
        bprefix,
      });
    if (cmp === 0) {
      let adig = SuttaCentralId.scidNumbersLow(abase);
      let bdig = SuttaCentralId.scidNumbersLow(bbase);
      let n = Math.max(adig.length, bdig.length);
      for (let i = 0; i < n; i++) {
        let ai = adig[i];
        let bi = bdig[i];
        if (ai === bi) {
          continue;
        }
        if (ai === undefined) {
          return -bi || -1;
        }
        if (bi === undefined) {
          return ai || 1;
        }
        return ai - bi;
      }
    }
    return cmp;
  }

  get groups() {
    let tokens = this.scid?.split(':');
    return tokens?.[1] ? tokens[1].split('.') : null;
  }

  get nikaya() {
    return this.sutta.replace(/[-0-9.]*$/, '');
  }

  get nikayaFolder() {
    // DEPRECATED
    let majorid = this.sutta.split('.')[0];
    let prefix = majorid.replace(/[0-9-.:]*$/, '');
    let folder =
      {
        bv: `kn/bv`,
        cnd: `kn/cnd`,
        cp: `kn/cp`,
        iti: `kn/iti`,
        ja: `kn/ja`,
        kp: `kn/kp`,
        mil: `kn/mil`,
        mnd: `kn/mnd`,
        ne: `kn/ne`,
        pe: `kn/pe`,
        ps: `kn/ps`,
        pv: `kn/pv`,
        snp: `kn/snp`,
        'tha-ap': `kn/tha-ap`,
        thag: `kn/thag`,
        'thi-ap': `kn/thi-ap`,
        thig: `kn/thig`,
        ud: `kn/ud`,
        vv: `kn/vv`,
        'pli-tv-bi-vb-sk': `pli-tv-bi-vb/pli-tv-bi-vb-sk`,
      }[prefix] ||
      (majorid === this.sutta ? prefix : `${prefix}/${majorid}`);
    return folder;
  }

  get sutta() {
    return this.scid?.split(':')[0];
  }

  get parent() {
    let groups = this.groups;
    if (groups == null) {
      return null;
    }
    !groups.pop() && groups.pop();
    if (groups.length === 0) {
      return new SuttaCentralId(`${this.sutta}:`);
    }
    return new SuttaCentralId(`${this.sutta}:${groups.join('.')}.`);
  }

  standardForm() {
    let std = {
      sn: 'SN',
      mn: 'MN',
      dn: 'DN',
      an: 'AN',
      thig: 'Thig',
      thag: 'Thag',
    };
    let result = this.scid;
    let keys = Object.keys(std);
    for (let i = 0; i < keys.length; i++) {
      let k = keys[i];
      result = result.replace(k, std[k]);
    }
    return result;
  }

  sectionParts() {
    return this.scid.split(':')[0].split('.');
  }

  segmentParts() {
    let segid = this.scid.split(':')[1];
    return segid.split('.');
  }

  add(...args) {
    let prefix = this.nikaya;
    let id = this.scid.substring(prefix.length);
    let id2;
    let colonParts = id.split(':');
    if (colonParts.length > 1) {
      // segment id
      let dotParts = colonParts[1].split('.');
      for (let i = 0; i < dotParts.length; i++) {
        let a = Number(args[i]);
        dotParts[i] = i < args.length ? Number(dotParts[i]) + a : 0;
      }
      id2 = `${colonParts[0]}:${dotParts.join('.')}`;
    } else {
      // document id
      let dotParts = colonParts[0].split('.');
      let n = Math.min(args.length, dotParts.length);
      for (let i = 0; i < n; i++) {
        let a = Number(args[i]);
        dotParts[i] = Number(dotParts[i]) + a;
      }
      id2 = `${dotParts.join('.')}`;
    }
    return new SuttaCentralId(`${prefix}${id2}`);
  }

  toString() {
    return this.scid;
  }
} // class SuttaCentralId
