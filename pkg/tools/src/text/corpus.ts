import { WordVector } from './word-vector.js';

interface CorpusOpts {
  wordDocCount?: WordVector;
  docMap?: Record<string, any>;
}

export class Corpus {
  wordDocCount: WordVector;
  docMap: Record<string, any>;
  _size: number;

  constructor(opts: CorpusOpts = {}) {
    let { wordDocCount = new WordVector(), docMap = {} } = opts;

    this._size = Object.keys(docMap).length;
    this.wordDocCount = wordDocCount;
    this.docMap = docMap;
  }

  get size(): number {
    return this._size;
  }

  addDocument(id: string, doc: any): void {
    this.deleteDocument(id);
    this.docMap[id] = doc;
    this._size++;
  }

  getDocument(id: string): any {
    return this.docMap[id];
  }

  deleteDocument(id: string): any {
    let { docMap } = this;
    let doc = docMap[id];
    if (doc) {
      delete docMap[id];
      this._size--;
    }

    return doc;
  }
}
