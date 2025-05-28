import should from 'should';
import { NameForma } from '../../index.mjs';
const { Forma } = NameForma;
import avro from 'avro-js';
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

const dbg = DBG.T2T.FORMA;

describe('forma', () => {
  it('ctor', () => {
    let f3a = new Forma();
    should(f3a.id).match(/^F3A[0-9]+$/);

    let t3g = new Thing();
    should(t3g.id).match(/^T3G[0-9]+$/);
  });
  it('avro', () => {
    const msg = 'tf3a.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = 'tavro-id';

    const registry = {};
    const s4a = Forma.SCHEMA;
    dbg > 1 && cc.tag(msg, 'registerSchema');
    let type = Forma.registerSchema(s4a, { avro, registry });
    let typeAgain = Forma.register();
    should(typeAgain).equal(type);
    let typeExpected = avro.parse(s4a);
    let name = `${s4a.namespace}.${s4a.name}`;
    should.deepEqual(type, typeExpected);
    should.deepEqual(`"${name}"`, typeExpected.toString());
    should.deepEqual(
      Object.keys(registry).sort(),
      [name, 'string'].sort(),
    );
    should(registry).properties({
      [name]: typeExpected,
    });
    should(Forma.REGISTRY).properties({
      [name]: typeExpected,
    });
    dbg > 1 &&
      cc.tag(msg + UOK, 'parsed schema is added to registry:', name);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Forma({ id });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Forma(parsed);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, 'Forma serialized with avro');
  });
});
