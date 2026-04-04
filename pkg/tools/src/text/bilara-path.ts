interface BilaraPathParts {
  suid: string;
  type: string;
  category: string;
  collection: string;
  lang: string;
  author_uid: string;
  suttaRef: string;
  bilaraPath: string;
}

export class BilaraPath {
  suid!: string;
  type!: string;
  category!: string;
  collection!: string;
  lang!: string;
  author_uid!: string;
  suttaRef!: string;
  bilaraPath!: string;

  constructor(bilaraPath: string) {
    Object.assign(this, BilaraPath.pathParts(bilaraPath));
  }

  static htmlPath(mid: string): string {
    const lang = 'pli';
    const auth = 'ms';
    return ['html', lang, `${auth}/sutta`, `${mid}_html.json`].join('/');
  }

  static variantPath(mid: string): string {
    const lang = 'pli';
    const auth = 'ms';
    return [
      'variant',
      lang,
      `${auth}/sutta`,
      `${mid}_variant-${lang}-${auth}.json`,
    ].join('/');
  }

  static referencePath(mid: string): string {
    const lang = 'pli';
    const auth = 'ms';
    return [
      'reference',
      lang,
      `${auth}/sutta`,
      `${mid}_reference.json`,
    ].join('/');
  }

  static rootPath(mid: string, lang: string = 'pli', auth: string = 'ms'): string {
    return [
      'root',
      lang,
      `${auth}/sutta`,
      `${mid}_root-${lang}-${auth}.json`,
    ].join('/');
  }

  static legacyPath(mid: string, lang: string, auth: string): string {
    return [`${mid}_legacy-${lang}-${auth}.json`].join('/');
  }

  static translationPath(mid: string, lang: string, auth: string): string {
    return [
      'translation',
      lang,
      `${auth}/sutta`,
      `${mid}_translation-${lang}-${auth}.json`,
    ].join('/');
  }

  static commentPath(mid: string, lang: string, auth: string): string {
    return [
      'comment',
      lang,
      `${auth}/sutta`,
      `${mid}_comment-${lang}-${auth}.json`,
    ].join('/');
  }

  static pathParts(bilaraPath: string): BilaraPathParts {
    const bpParts = bilaraPath.split('/');
    const fname = bpParts.pop()!;
    const [type, lang, author_uid, category, collection] = bpParts;
    const suid = fname.replace(/_.*$/, '');
    const suttaRef = `${suid}/${lang}/${author_uid}`;
    return {
      suid,
      type,
      category,
      collection,
      lang,
      author_uid,
      suttaRef,
      bilaraPath,
    };
  }
}
