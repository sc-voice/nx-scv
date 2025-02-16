import should from 'should';
import { Text } from '../../index.mjs';
const { Corpus } = Text;

export function testCorpus(corp) {
  should(corp.size).equal(0);

  let doc1 = { id: 'd1', text: 'the red fox' };
  corp.addDocument('d1', doc1);
  should(corp.size).equal(1);
  let doc2 = { id: 'd2', text: 'a blue butterfly' };
  corp.addDocument('d2', doc2);
  should(corp.size).equal(2);

  should.deepEqual(corp.getDocument('d1'), doc1);
  should.deepEqual(corp.getDocument('d2'), doc2);
  should(corp.getDocument('nonsense')).equal(undefined);

  should(corp.deleteDocument('nonsense')).equal(undefined);
  should(corp.size).equal(2);

  should.deepEqual(corp.deleteDocument('d2'), doc2);
  should(corp.getDocument('d2')).equal(undefined);
  should(corp.size).equal(1);
  should.deepEqual(corp.getDocument('d1'), doc1);

  should.deepEqual(corp.deleteDocument('d1'), doc1);
  should(corp.getDocument('d1')).equal(undefined);
  should(corp.size).equal(0);
  should(corp.getDocument('d1')).equal(undefined);
}

describe('TESTTESTtext/corpus', () => {
  it('testCorpus', () => {
    let corp = new Corpus();
    testCorpus(corp);
  });
});
