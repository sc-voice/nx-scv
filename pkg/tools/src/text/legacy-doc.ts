import { DBG } from '../defines.js';

let privateCtor = false;

const HTML_FILTER = (() => {
  let prefixes = [
    '<!DOCTYPE',
    '<html',
    '<head',
    '</html',
    '<meta',
    '<title',
    '</head',
    '<body',
    '</body',
    '<article',
    '</article',
  ].join('|');
  let pat = `^(${prefixes}).*> *$`;
  return new RegExp(pat);
})();

interface LegacyDocProps {
  uid?: string;
  lang?: string;
  title?: string;
  author?: string;
  author_uid?: string;
  text?: string | string[];
  footer?: string;
  lines?: string[];
}

interface TranslationData {
  uid: string;
  lang: string;
  title: string;
  author: string;
  author_uid: string;
  text: string | string[];
}

interface FetchLegacyOpts {
  endPoint?: string;
  sutta_uid?: string;
  lang?: string;
  author?: string;
  maxBuffer?: number;
  cache?: (url: string) => { ok: boolean; json: () => Promise<any> };
}

export class LegacyDoc {
  uid?: string;
  lang?: string;
  title?: string;
  author?: string;
  author_uid?: string;
  footer?: string;
  lines?: string[];

  constructor(opts: LegacyDocProps = {}) {
    const msg = 'LegacyDoc.ctor:';
    if (!privateCtor) {
      throw new Error(`${msg} use LegacyDoc.create()`);
    }
    Object.assign(this, opts);
  }

  static filterHtml(line: string): boolean {
    if (HTML_FILTER.test(line)) {
      return false;
    }

    return true;
  }

  static legacyUrl(opts: FetchLegacyOpts = {}): string {
    let {
      endPoint = 'https://suttacentral.net/api/suttas',
      sutta_uid,
      lang,
      author,
    } = opts;

    return [endPoint, sutta_uid, `${author}?lang=${lang}`].join('/');
  }

  static async fetchLegacy(opts: FetchLegacyOpts = {}): Promise<LegacyDoc> {
    const msg = 'L7c.fetchLegacy:';
    const dbg = DBG.L7C_FETCH_LEGACY;
    let { maxBuffer = 10 * 1024 * 1024, cache } = opts;
    let url = LegacyDoc.legacyUrl(opts);
    let res: any;
    if (cache) {
      res = cache(url);
      dbg && console.log(msg, '[1]cached', res.ok);
    } else {
      res = await fetch(url, { maxBuffer } as any);
      dbg && console.log(msg, '[2]scapi', res.ok);
    }
    if (!res.ok) {
      throw new Error(`${msg} ${res.status} ${url}`);
    }
    let json = await res.json();
    let { translation } = json;
    return LegacyDoc.create(translation);
  }

  static create(t13aOrString: any | string): LegacyDoc {
    const msg = 'LegacyDoc.create:';
    let t13a = (typeof t13aOrString === 'string') 
      ? JSON.parse(t13aOrString) as TranslationData
      : t13aOrString as TranslationData

    let { uid, lang, title, author, author_uid, text } = t13a;
    let textLines: string[] = typeof text === 'string' ? text.split('\n') : text;

    let para: string;
    let lines = textLines.filter((line) => !HTML_FILTER.test(line));
    lines = lines
      .join(' ')
      .replace(/<\/p> */g, '')
      .replace(/<h.*sutta-title.>(.*)<\/h1> /, '$1')
      .split('<p>');
    let footer: string[] = [];
    lines.forEach((line, i) => {
      if (/<footer>/.test(line)) {
        let f = line.replace(/.*<footer>(.*)<.footer>.*/, '$1');
        footer.push(f);
        lines[i] = line.replace(/<footer>.*<.footer>/, '');
      }
      lines[i] = lines[i].trim();
    });
    let footerStr = footer.join(' ');

    let opts: LegacyDocProps = {
      uid,
      lang,
      title,
      author,
      author_uid,
      footer: footerStr,
      lines,
    };

    privateCtor = true;
    let ldoc = new LegacyDoc(opts);
    privateCtor = false;

    return ldoc;
  }
}
