import { WordVector } from './word-vector.mjs';

export class Corpus {
  constructor(opts = {}) {
    let { wordDocCount = new WordVector(), docMap = {} } = opts;

    this._size = Object.keys(docMap).length;

    Object.assign(this, {
      wordDocCount,
      docMap,
    });
  }

  get size() {
    return this._size;
  }

  addDocument(id, doc) {
    this.deleteDocument(id);
    this.docMap[id] = doc;
    this._size++;
  }

  getDocument(id) {
    return this.docMap[id];
  }

  deleteDocument(id) {
    let { docMap } = this;
    let doc = docMap[id];
    if (doc) {
      delete docMap[id];
      this._size--;
    }

    return doc;
  }
}
