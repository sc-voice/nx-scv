import should from 'should';
import { 
  version as uuidVersion,
  validate as uuidValid,
  v7 as uuidv7,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Forma } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

class TestThing extends Forma {
  constructor(cfg = {}) {
    const msg = 't7g.ctor';
    super();
    cc.fyi1(msg, ...cc.props(this));
  }
}

const dbg = DBG.T2T.FORMA;

describe('forma', () => {
  it('ctor', () => {
    let f3a = new Forma();
    should(f3a.id).match(/^F3A[0-9]+$/);

    let t7g = new TestThing();
    should(t7g.id).match(/^T7G[0-9]+$/);
  });
  it('patch', () => {
    const msg = 'tf3a.patch';
    dbg > 1 && cc.tag(msg, '===============');
    let f3a = new Forma();
    let { id } = f3a;
    should(f3a.id).equal(id);
    should(f3a.name).equal(id);

    f3a.patch({ id: 'newId' });
    should(f3a.id).equal(id);
    dbg > 1 && cc.tag(msg, 'id is immutable');

    f3a.patch({ name: 'newName' });
    should(f3a.id).equal(id);
    should(f3a.name).equal('newName');
    dbg && cc.tag1(msg + UOK, 'name is mutable');
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
  it('TESTTESTuuidv7', ()=>{
    const msg = 'tf3a.uuidv7';
    dbg > 1 && cc.tag(msg, '==============');
    let uuid0 = Forma.uuid({msecs:0});
    let uuid1 = Forma.uuid({msecs:1});
    let now = Date.now();
    let idNow = Forma.uuid({msecs:now});

    should(Forma.uuidToTime(idNow)).equal(now);
    dbg > 1 && cc.tag(msg, {idNow}, 'uuidToTime:', new Date(now).toLocaleTimeString());

    dbg > 1 && cc.tag(msg, {uuid0});
    dbg > 1 && cc.tag(msg, {uuid1});
    should(uuid1).above(uuid0);
    should(uuid1).below(idNow);
    dbg > 1 && cc.tag(msg, 'uuids can be sorted by milliseconds');

    should(uuidVersion(uuid0)).equal(7);
    should(uuidVersion(uuid1)).equal(7);
    should(uuidVersion(idNow)).equal(7);
    should(uuidValid(uuid0)).equal(true);
    should(uuidValid(uuid1)).equal(true);
    should(uuidValid(idNow)).equal(true);
    dbg && cc.tag1(msg + UOK, 'valid v7 uuids');
  });
});
