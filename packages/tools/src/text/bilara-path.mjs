export class BilaraPath {
  constructor(bilaraPath) {
    Object.assign(this, BilaraPath.pathParts(bilaraPath));
  }

  static htmlPath(mid) {
    let lang = 'pli';
    let auth = 'ms';
    return ['html', lang, `${auth}/sutta`, `${mid}_html.json`].join(
      '/',
    );
  }

  static variantPath(mid) {
    let lang = 'pli';
    let auth = 'ms';
    return [
      'variant',
      lang,
      `${auth}/sutta`,
      `${mid}_variant-${lang}-${auth}.json`,
    ].join('/');
  }

  static referencePath(mid) {
    let lang = 'pli';
    let auth = 'ms';
    return [
      'reference',
      lang,
      `${auth}/sutta`,
      `${mid}_reference.json`,
    ].join('/');
  }

  static rootPath(mid, lang = 'pli', auth = 'ms') {
    return [
      'root',
      lang,
      `${auth}/sutta`,
      `${mid}_root-${lang}-${auth}.json`,
    ].join('/');
  }

  static legacyPath(mid, lang, auth) {
    return [`${mid}_legacy-${lang}-${auth}.json`].join('/');
  }

  static translationPath(mid, lang, auth) {
    return [
      'translation',
      lang,
      `${auth}/sutta`,
      `${mid}_translation-${lang}-${auth}.json`,
    ].join('/');
  }

  static commentPath(mid, lang, auth) {
    return [
      'comment',
      lang,
      `${auth}/sutta`,
      `${mid}_comment-${lang}-${auth}.json`,
    ].join('/');
  }

  static pathParts(bilaraPath) {
    let bpParts = bilaraPath.split('/');
    let fname = bpParts.pop();
    let [type, lang, author_uid, category, collection] = bpParts;
    let suid = fname.replace(/_.*$/, '');
    let suttaRef = `${suid}/${lang}/${author_uid}`;
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
