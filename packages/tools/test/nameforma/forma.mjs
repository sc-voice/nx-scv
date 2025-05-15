import should from 'should';
import { NameForma } from '../../index.mjs';
const { Forma } = NameForma;
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

class Thing extends Forma {
  constructor(cfg = {}) {
    const msg = 't3g.ctor';
    super();
    cc.fyi1(msg, ...cc.props(this));
  }
}

describe('forma', () => {
  it('ctor', () => {
    let f3a = new Forma();
    should(f3a.id).match(/^F3A[0-9]+$/);

    let t3g = new Thing();
    should(t3g.id).match(/^T3G[0-9]+$/);
  });
});
