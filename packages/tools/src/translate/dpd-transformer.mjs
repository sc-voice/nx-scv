export class DpdTransformer {
  constructor(opts = {}) {
    const msg = 'D14r.ctor:';
    let { dictionary } = opts;
    if (dictionary == null) {
      throw new Error(`${msg} dictionary?`);
    }

    Object.assign(this, {
      dictionary,
    });
  }

  transform(text) {
    return text;
  }
}
