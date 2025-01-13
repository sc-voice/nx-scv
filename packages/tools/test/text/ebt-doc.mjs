import fs from 'node:fs';
const { promises: fsp } = fs;
import path from 'node:path';
import should from 'should';
import tmp from 'tmp';
import { Text } from '../../index.mjs';
const { EbtDoc } = Text;

describe('TESTTESTtext/ebt-doc', function () {
  this.timeout(5 * 1000);

  it('default ctor', () => {
    let sd = EbtDoc.create();
    should(sd).properties({
      author: undefined,
      lang: undefined,
      segMap: {},
      suid: undefined,
      bilaraPath: undefined,
    });
  });
  it('custom ctor', () => {
    let suid = 'dn33';
    let lang = 'en';
    let author = 'sujato';
    let scid = 'dn33:0.1';
    let customKey = 'test-custom'; // ignored
    let segMap = {
      [scid]: 'test dn33',
    };
    let bilaraPath = 'test-path';
    let sd = EbtDoc.create({
      author,
      lang,
      segMap,
      suid,
      bilaraPath,
      customKey,
    });
    should(sd).properties({
      author: 'sujato',
      lang: 'en',
      segMap,
      suid: 'dn33',
      bilaraPath,
    });
    should(sd.customKey).equal(undefined);
  });
  it('custom ctor parse DN33', async () => {
    let bilaraPath = 'data/dn33.json';
    let fnSegMap = path.join(import.meta.dirname, bilaraPath);
    let segMap = await fsp.readFile(fnSegMap);
    let dn33 = EbtDoc.create({ segMap });
    should(dn33.segMap['dn33:1.10.31']).equal(
      'form, formlessness, and cessation. ',
    );
    should.deepEqual(dn33.scids().slice(0, 10), [
      'dn33:0.1',
      'dn33:0.2',
      'dn33:1.1.1',
      'dn33:1.1.2',
      'dn33:1.1.3',
      'dn33:1.2.1',
      'dn33:1.2.2',
      'dn33:1.2.3',
      'dn33:1.2.4',
      'dn33:1.2.5',
    ]);
  });
  it('segments() returns sn1.1 segment array', async () => {
    let lang = 'en';
    let suid = 'sn1.1';
    let bilaraPath = 'data/en_sn1.1.json';
    let fnSegMap = path.join(import.meta.dirname, bilaraPath);
    let segMap = JSON.parse(await fsp.readFile(fnSegMap));
    let sutta = EbtDoc.create({ suid, lang, bilaraPath, segMap });
    let segments = sutta.segments();
    should.deepEqual(segments[0], {
      scid: 'sn1.1:0.1',
      en: 'Linked Discourses 1 ',
    });
    should.deepEqual(segments[1], {
      scid: 'sn1.1:0.2',
      en: '1. A Reed ',
    });
    should.deepEqual(segments[11], {
      scid: 'sn1.1:1.9',
      en: 'That’s how I crossed the flood neither standing nor swimming.” ',
    });
    should.deepEqual(segments[12], {
      scid: 'sn1.1:2.1',
      en: '“After a long time I see ',
    });
  });
  it('segments() an1.1-10', async () => {
    let lang = 'en';
    let suid = 'an1.1-10';
    let bilaraPath = 'data/en_an1.1-10.json';
    let fnSegMap = path.join(import.meta.dirname, bilaraPath);
    let segMap = JSON.parse(await fsp.readFile(fnSegMap));
    let sutta = EbtDoc.create({ suid, lang, bilaraPath, segMap });
    let scids = sutta.scids();
    should.deepEqual(scids.slice(0, 15), [
      'an1.1:0.1',
      'an1.1:0.2',
      'an1.1:0.3',
      'an1.1:1.1',
      'an1.1:1.2',
      'an1.1:1.3',
      'an1.1:1.4',
      'an1.1:1.5',
      'an1.1:1.6',
      'an1.1:2.1',
      'an1.1:2.2',
      'an1.1:2.3',
      'an1.2:0.1',
      'an1.2:1.1',
      'an1.2:1.2',
    ]);
    let segments = sutta.segments();
    should.deepEqual(segments[0], {
      scid: 'an1.1:0.1',
      en: 'Numbered Discourses 1 ',
    });
    should.deepEqual(segments[1], {
      scid: 'an1.1:0.2',
      en: '1. Sights, Etc. ',
    });
    should.deepEqual(segments[11], {
      scid: 'an1.1:2.3',
      en: ' ',
    });
    should.deepEqual(segments[12], {
      scid: 'an1.2:0.1',
      en: '2 ',
    });
  });
  it('toBilaraString 1', () => {
    const msg = 'EBTDOC.toBilaraString.1:';
    let bilaraPath = 'test.json';
    let author = 'test-author';
    let lang = 'test-lang';
    let suid = 'test-suid';
    let segMap = {
      // jumbled order
      'test:2': 'test two',
      'test:3': 'test three',
      'test:1': 'test one',
    };
    let ebtDoc = EbtDoc.create({
      suid,
      author,
      lang,
      bilaraPath,
      segMap,
    });
    let bls = ebtDoc.toBilaraString();
    let json = JSON.parse(bls);
    let { __header__ } = json;
    should(__header__).properties({
      suid,
      lang,
      author,
      bilaraPath,
    });
    should(json).properties(segMap);
  });
  it('toBilaraString() 2:parent', () => {
    const msg = 'EBTDOC.toBilaraString.2:';
    let bilaraPath = 'test.json';
    let author = 'test-author';
    let lang = 'test-lang';
    let suid = 'test-suid';
    let segMap = {
      // jumbled order
      'test:2': 'test two',
      'test:3': 'test three',
      'test:1': 'test one',
    };
    let parent = EbtDoc.create({
      author,
      lang,
      bilaraPath: 'parent.json',
    });

    let blsParent = parent.toBilaraString();
    let jsonParent = JSON.parse(blsParent);
    let { __header__: hdrParent } = jsonParent;
    should.deepEqual(hdrParent, {
      author,
      lang,
      bilaraPath: 'parent.json', // saved
    });

    let author2 = 'test-author2';
    let ebtDoc = EbtDoc.create({
      author: author2, // different
      suid,
      segMap,
      //bilaraPath, // not saved
      parent,
    });

    // toBilaraString does not write out unchanged inherited keys
    let bls = ebtDoc.toBilaraString();
    let json = JSON.parse(bls);
    let { __header__ } = json;
    // write out header keys:
    //   * inherited keys if different than parent (lang, author)
    //   * non-inherited keys (suid, bilaraPath)
    // e.g., lang, author
    should.deepEqual(__header__, {
      suid, // non-inherited
      author: author2, // inherited
    });

    // fromBilaraString() implements parent inheritance
    should(json).properties(segMap);
    let ebtDoc2 = EbtDoc.fromBilaraString(bls, parent);
    should.deepEqual(ebtDoc2, ebtDoc);
  });
});
