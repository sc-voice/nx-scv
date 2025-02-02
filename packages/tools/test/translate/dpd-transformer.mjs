import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
let { dirname } = import.meta;
import { Translate } from '../../index.mjs';
const { DpdTransformer } = Translate;

class MockDictionary {
  constructor(entries) {
    this.entries = entries;
  }
  find(word) {
    let data = this.entries.filter((e) => e.word === word);
    if (data.length === 0) {
      return undefined;
    }
    return { word, data };
  }
}

let ENTRIES_PATH = path.join(dirname, '../data/evam-en.json');
let ENTRIES_EVAM = JSON.parse(fs.readFileSync(ENTRIES_PATH));
const D_EVAM = new MockDictionary(ENTRIES_EVAM);
const S_EVAM = 'Evaṁ me sutaṁ';

describe('dpd-transformer', () => {
  it('default ctor', () => {
    let eCaught;
    try {
      new DpdTransformer();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/dictionary\?/);
  });
  it('MockDictionary()', () => {
    let dictionary = D_EVAM;
    let { word, data } = dictionary.find('sutaṁ');
    should(data.at(0)).properties({ meaning_1: 'daughter' });
    should(data.at(1)).properties({ meaning_1: 'heard' });
    should(data.at(2)).properties({ meaning_1: 'learned' });
    should(data.length).equal(6);
  });
  it('transform()', () => {
    const msg = 'td12r.transform';
    let dictionary = D_EVAM;
    let dt = new DpdTransformer({ dictionary });
    should(dt.dictionary).equal(dictionary);
    let srcEvam = 'Evaṁ me sutaṁ';
    let dstEvam = dt.transform(S_EVAM);
    console.log(msg, 'TBD');
  });
});
