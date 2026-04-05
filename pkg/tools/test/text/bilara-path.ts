import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '../../src/index.ts';
const { BilaraPath } = Text;

describe('text/bilara-path', function () {
  const { translationPath, rootPath } = BilaraPath;

  it('pathParts(f) returns parts of bilara filename', () => {
    const f = translationPath('sn/sn22/sn22.2', 'en', 'sujato');
    expect(BilaraPath.pathParts(f)).toEqual({
      suid: 'sn22.2',
      suttaRef: 'sn22.2/en/sujato',
      type: 'translation',
      lang: 'en',
      author_uid: 'sujato',
      category: 'sutta',
      collection: 'sn',
      bilaraPath: f,
    });
    const f2 = translationPath('sn/sn22/sn22.10', 'en', 'sujato');
    expect(BilaraPath.pathParts(f2)).toEqual({
      suid: 'sn22.10',
      suttaRef: 'sn22.10/en/sujato',
      type: 'translation',
      lang: 'en',
      author_uid: 'sujato',
      category: 'sutta',
      collection: 'sn',
      bilaraPath: f2,
    });
  });
  it('pathParts(f) returns parts of bilara filename THIG', () => {
    const f = rootPath('kn/thig/thig1.2', 'pli', 'ms');
    expect(BilaraPath.pathParts(f)).toEqual({
      author_uid: 'ms',
      bilaraPath: 'root/pli/ms/sutta/kn/thig/thig1.2_root-pli-ms.json',
      collection: 'kn',
      category: 'sutta',
      suid: 'thig1.2',
      lang: 'pli',
      suttaRef: 'thig1.2/pli/ms',
      type: 'root',
    });
  });
  it('pathParts(f) returns parts of bilara filename MIL', () => {
    const f = rootPath('kn/mil/mil3.1.2', 'pli', 'ms');
    expect(BilaraPath.pathParts(f)).toEqual({
      author_uid: 'ms',
      bilaraPath: 'root/pli/ms/sutta/kn/mil/mil3.1.2_root-pli-ms.json',
      collection: 'kn',
      category: 'sutta',
      suid: 'mil3.1.2',
      lang: 'pli',
      suttaRef: 'mil3.1.2/pli/ms',
      type: 'root',
    });
  });
});
