import should from 'should';
import { BilaraPath } from '../index.mjs';

describe('bilara-path', function () {
  let { translationPath, rootPath } = BilaraPath;
  this.timeout(1 * 1000);

  it('pathParts(f) returns parts of bilara filename', () => {
    let f = translationPath('sn/sn22/sn22.2', 'en', 'sujato');
    should.deepEqual(BilaraPath.pathParts(f), {
      suid: 'sn22.2',
      suttaRef: 'sn22.2/en/sujato',
      type: 'translation',
      lang: 'en',
      author_uid: 'sujato',
      category: 'sutta',
      collection: 'sn',
      bilaraPath: f,
    });
    f = translationPath('sn/sn22/sn22.10', 'en', 'sujato');
    should.deepEqual(BilaraPath.pathParts(f), {
      suid: 'sn22.10',
      suttaRef: 'sn22.10/en/sujato',
      type: 'translation',
      lang: 'en',
      author_uid: 'sujato',
      category: 'sutta',
      collection: 'sn',
      bilaraPath: f,
    });
  });
  it('pathParts(f) returns parts of bilara filename THIG', () => {
    let f = rootPath('kn/thig/thig1.2', 'pli', 'ms');
    should.deepEqual(BilaraPath.pathParts(f), {
      author_uid: 'ms',
      bilaraPath:
        'root/pli/ms/sutta/kn/thig/thig1.2_root-pli-ms.json',
      collection: 'kn',
      category: 'sutta',
      suid: 'thig1.2',
      lang: 'pli',
      suttaRef: 'thig1.2/pli/ms',
      type: 'root',
    });
  });
  it('pathParts(f) returns parts of bilara filename MIL', () => {
    let f = rootPath('kn/mil/mil3.1.2', 'pli', 'ms');
    should.deepEqual(BilaraPath.pathParts(f), {
      author_uid: 'ms',
      bilaraPath:
        'root/pli/ms/sutta/kn/mil/mil3.1.2_root-pli-ms.json',
      collection: 'kn',
      category: 'sutta',
      suid: 'mil3.1.2',
      lang: 'pli',
      suttaRef: 'mil3.1.2/pli/ms',
      type: 'root',
    });
  });
});
