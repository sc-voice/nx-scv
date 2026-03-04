import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '../../index.mjs';
const { Corpus } = Text;

export function testCorpus(corp) {
  expect(corp.size).toBe(0);

  let doc1 = { id: 'd1', text: 'the red fox' };
  corp.addDocument('d1', doc1);
  expect(corp.size).toBe(1);
  let doc2 = { id: 'd2', text: 'a blue butterfly' };
  corp.addDocument('d2', doc2);
  expect(corp.size).toBe(2);

  expect(corp.getDocument('d1')).toEqual(doc1);
  expect(corp.getDocument('d2')).toEqual(doc2);
  expect(corp.getDocument('nonsense')).toBe(undefined);

  expect(corp.deleteDocument('nonsense')).toBe(undefined);
  expect(corp.size).toBe(2);

  expect(corp.deleteDocument('d2')).toEqual(doc2);
  expect(corp.getDocument('d2')).toBe(undefined);
  expect(corp.size).toBe(1);
  expect(corp.getDocument('d1')).toEqual(doc1);

  expect(corp.deleteDocument('d1')).toEqual(doc1);
  expect(corp.getDocument('d1')).toBe(undefined);
  expect(corp.size).toBe(0);
  expect(corp.getDocument('d1')).toBe(undefined);
}

describe('text/corpus', () => {
  it('testCorpus', () => {
    let corp = new Corpus();
    testCorpus(corp);
  });
});
