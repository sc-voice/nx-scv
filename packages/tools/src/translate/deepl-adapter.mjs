import * as deepl from 'deepl-node';
import { DBG } from '../defines.mjs';
import { MockDeepL } from './mock-deepl.mjs';

const EMPTY_TEXT = '911911911';
const TRANSLATE_OPTS = {
  tag_handling: 'xml',
  formality: 'more',
};
const DST_AUTHOR = 'no-author';

let mockApi = DBG.MOCK_DEEPL;

export class DeepLAdapter {
  #authKey;

  constructor(opts = {}) {
    let {
      authKey,
      glossary,
      glossaryName,
      initialized,
      sourceLang, // deepl lang
      targetLang, // deepl lang
      translateOpts,
      translator,
      dstLang,
      dstLang2, // bilara-data lang
      srcLang2, // bilara-data lang
      srcLang,
    } = DeepLAdapter.srcDstLangs(opts);

    let emsg = 'use DeepLAdapter.create()';
    let check = 1;
    if (null == authKey) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == dstLang2) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == glossaryName) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == initialized) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == sourceLang) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == targetLang) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == srcLang2) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == translateOpts) throw new Error(`${emsg} ${check}`);
    check++;
    if (null == translator) throw new Error(`${emsg} ${check}`);
    check++;

    this.#authKey = authKey;

    Object.assign(this, {
      dstLang,
      dstLang2,
      glossary,
      glossaryName,
      initialized,
      srcLang,
      srcLang2,
      sourceLang,
      targetLang,
      translateOpts: JSON.parse(JSON.stringify(translateOpts)),
      translator,
    });
  }

  static srcDstLangs(opts = {}) {
    let { srcLang = 'en', dstLang = 'pt-pt' } = opts;
    srcLang = srcLang.toLowerCase();
    let srcLang2 = srcLang.split('-')[0];
    dstLang = dstLang.toLowerCase();
    let dstLang2 = dstLang.split('-')[0];

    return Object.assign({}, opts, {
      srcLang,
      srcLang2,
      dstLang,
      dstLang2,
    });
  }

  static deeplLang(lang) {
    switch (lang) {
      case 'pt':
        return 'pt-PT';
      default:
        return lang;
    }
  }

  static glossaryName(opts = {}) {
    const msg = 'D10r.glossaryName()';
    const dbg = DBG.GLOSSARY;
    let { dstAuthor = DST_AUTHOR } = opts;
    let {
      dstLang,
      dstLang2, // bilara-data lang
      srcLang2, // bilara-data lang
      srcLang,
    } = DeepLAdapter.srcDstLangs(opts);
    let name =
      `D10r_${srcLang2}_${dstLang2}_${dstAuthor}`.toLowerCase();
    dbg && console.log(msg, name);
    return name;
  }

  static async create(opts = {}) {
    const msg = 'D10r.create()';
    const dbg = DBG.GLOSSARY;
    let {
      authKey,
      srcLang,
      srcLang2,
      dstLang,
      dstLang2,
      dstAuthor = DST_AUTHOR,
      sourceLang,
      targetLang,
      translateOpts = TRANSLATE_OPTS,
      updateGlossary = false,
      translator,
    } = DeepLAdapter.srcDstLangs(opts);
    dbg && console.log(msg, '[1]opts', opts);
    if (authKey == null) {
      throw new Error(`${msg} authKey?`);
    }
    sourceLang = sourceLang || DeepLAdapter.deeplLang(srcLang);
    targetLang = targetLang || DeepLAdapter.deeplLang(dstLang);
    if (translator == null) {
      dbg && console.log(msg, '[2]new deepl.Translator()');
      let deeplOpts = {};
      translator = mockApi
        ? new MockDeepL.Translator(authKey)
        : new deepl.Translator(authKey);
    }

    let glossaryName = DeepLAdapter.glossaryName({
      srcLang,
      dstLang,
      dstAuthor,
    });
    let glossaries = await translator.listGlossaries();
    let glossary = glossaries.reduce((a, g) => {
      return g.name === glossaryName ? g : a;
    }, null);
    if (updateGlossary) {
      console.warn(msg, '[3]updateGlossary', glossaryName);
      dbg && console.log(msg, '[4]uploadGlossary');
      glossary = await DeepLAdapter.uploadGlossary({
        srcLang,
        dstLang,
        dstAuthor,
        translator,
        glossaries,
      });
    }
    if (glossary) {
      let { glossaryId, name } = glossary;
      dbg &&
        console.warn(
          msg,
          '[5]using glossary',
          name,
          glossaryId && glossaryId.substring(0, 8),
        );
    } else {
      let dbg = DBG.GLOSSARY;
      dbg && console.log(msg, '[6]no glossary');
    }
    translateOpts = translateOpts
      ? JSON.parse(JSON.stringify(translateOpts))
      : TRANSLATE_OPTS;
    if (glossary) {
      translateOpts.glossary = glossary;
    }
    let initialized = true;

    let ctorOpts = {
      authKey,
      dstLang,
      dstLang2,
      glossary,
      glossaryName,
      initialized,
      srcLang,
      srcLang2,
      sourceLang,
      targetLang,
      translateOpts,
      translator,
    };
    dbg &&
      console.log(msg, '[7]ctor', {
        sourceLang,
        targetLang,
        glossaryName,
      });
    return new DeepLAdapter(ctorOpts);
  }

  static setMockApi(value) {
    mockApi = value;
  }

  static asGlossaryEntries(strObj) {
    const msg = 'd12r.asToGlossaryEntries:';
    let dbg = DBG.KVG_TO_GLOSSARY_ENTRIES;

    if (strObj instanceof deepl.GlossaryEntries) {
      return strObj;
    }
    let nEntries = 0;
    let entries;

    if (typeof strObj === 'string') {
      // assume kvg string
      entries = strObj.split('\n').reduce((a, kv) => {
        let [key, value] = kv.split(/\|/);
        if (key && !value) {
          throw new Error(`${msg} [1]no value for key:${key}`);
        } else if (!key && value) {
          throw new Error(`${msg} [2]no key for value:${value}`);
        } else if (!key && !value) {
          // ignore
        } else {
          key = key.trim();
          value = value.trim();
          a[key] = value;
          dbg > 1 && console.log(msg, '[3]', { key, value });
          nEntries++;
        }
        return a;
      }, []);
    } else if (typeof strObj === 'object') {
      entries = strObj;
    } else {
      throw new Error(`${msg} string or object?`);
    }

    return new deepl.GlossaryEntries({ entries });
  }

  static async uploadGlossary(opts = {}) {
    const msg = 'D10r.uploadGlossary()';
    const dbg = DBG.GLOSSARY;
    const dbgv = DBG.VERBOSE && dbg;
    let {
      srcLang,
      srcLang2,
      dstLang,
      dstLang2,
      dstAuthor,
      translator,
      glossaries,
      glossaryEntries,
    } = DeepLAdapter.srcDstLangs(opts);
    if (glossaryEntries == null) {
      throw new Error(`${msg} glossaryEntries?`);
    }
    let nEntries = Object.keys(glossaryEntries).length;
    let glossaryName = DeepLAdapter.glossaryName({
      srcLang,
      dstLang,
      dstAuthor,
    });
    let glossary;

    if (glossaries == null) {
      glossaries = await translator.listGlossaries();
    }
    for (let i = 0; i < glossaries.length; i++) {
      let g = glossaries[i];
      if (g.name === glossaryName) {
        dbg && console.log(msg, '[1]deleting', g.glossaryId);
        await translator.deleteGlossary(g.glossaryId);
      }
    }

    let sourceLang = DeepLAdapter.deeplLang(srcLang);
    let targetLang = DeepLAdapter.deeplLang(dstLang);
    glossary = await translator.createGlossary(
      glossaryName,
      sourceLang,
      targetLang,
      glossaryEntries,
    );
    let { glossaryId } = glossary;
    dbg &&
      console.log(msg, '[6]createGlossary', {
        fName,
        glossaryName,
        sourceLang,
        targetLang,
        glossaryId,
        nEntries,
      });

    return glossary;
  }

  async deleteGlossary(id) {
    const msg = 'd12r.deleteGlossary:';
    let { translator } = this;
    dbg && console.log(msg, '[1]deleting', id);
    await translator.deleteGlossary(id);
    dbg > 1 && console.log(msg, '[2]deleted', id);
  }

  async listGlossaries() {
    let { translator } = this;

    let glossaries = await translator.listGlossaries();
    return glossaries;
  }

  async translate(texts) {
    const msg = 'D10r.translate()';
    const dbg = DBG.DEEPL_XLT;
    const dbgv = dbg && DBG.VERBOSE;
    let { translator, srcLang, dstLang, translateOpts } = this;

    let sourceLang = DeepLAdapter.deeplLang(srcLang);
    let targetLang = DeepLAdapter.deeplLang(dstLang);
    texts = texts.map((t) => t || EMPTY_TEXT);
    dbgv && console.log(msg, '[1]translateOpts', translateOpts);
    let results = await translator.translateText(
      texts,
      sourceLang,
      targetLang,
      translateOpts,
    );
    if (dbg) {
      results.forEach((result, i) => {
        console.log(
          msg,
          `\n[${i}<] `,
          `${texts[i]}$`,
          `\n[${i}>] `,
          `${results[i]?.text}$`,
        );
      });
    }
    results = results.map((r) =>
      r.text === EMPTY_TEXT ? '' : r.text,
    );

    return results;
  }
} // DeepLAdapter
