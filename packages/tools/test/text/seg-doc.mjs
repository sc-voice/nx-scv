import fs from 'node:fs';
const { promises: fsp } = fs;
import path from 'node:path';
import should from 'should';
import tmp from 'tmp';
import { Text } from '../../index.mjs';
const { SegDoc } = Text;

describe('TESTTESTtext/seg-doc', function () {
  this.timeout(5 * 1000);

  it('default ctor', () => {
    let sd = new SegDoc();
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
    let segMap = {
      'dn33:0.1': 'test dn33',
    };
    let bilaraPath = 'test-path';
    let sd = new SegDoc({
      author,
      lang,
      segMap,
      suid,
      bilaraPath,
    });
    should(sd).properties({
      author: 'sujato',
      lang: 'en',
      segMap,
      suid: 'dn33',
      bilaraPath,
    });
  });
  it('custom ctor parse DN33', async () => {
    let bilaraPath = 'data/dn33.json';
    let fnSegMap = path.join(import.meta.dirname, bilaraPath);
    let segMap = await fsp.readFile(fnSegMap);
    let dn33 = new SegDoc({ segMap });
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
    let sutta = new SegDoc({ suid, lang, bilaraPath, segMap });
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
    let sutta = new SegDoc({ suid, lang, bilaraPath, segMap });
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
});
