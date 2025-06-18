import should from 'should';
import { NameForma } from '../../index.mjs';
const { Forma, Schema } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.T2T.SCHEMA;

describe('TESTTESTschema', () => {
  it('ctor', () => {
    const msg = 'ts4a.ctor';
    dbg > 1 && cc.tag(msg, '==============');
    const name = 'test-name';
    const namespace = 'test-namespace';

    let s4aEmpty = new Schema();
    const noName = 'UnnamedSchema';
    should(s4aEmpty).properties({
      name: noName,
      fullName: noName,
    });
    should(s4aEmpty.namespace).equal(undefined);
    dbg > 1 && cc.tag(msg, 'default ctor');

    const fEvil = () => {
      throw new Error(msg, 'EVIL');
    };
    let s4aFun = new Schema({ name, namespace, fullName: fEvil });
    should(s4aFun).properties({
      name,
      namespace,
      fullName: `${namespace}.${name}`,
    });
    dbg > 1 && cc.tag(msg, 'evil ctor');

    let s4a = new Schema({ name, namespace });
    should(s4a).properties({
      name,
      namespace,
      fullName: `${namespace}.${name}`,
    });

    dbg && cc.tag1(msg + UOK, 'typical ctor');
  });

  it('avro', () => {
    const msg = 'tf3a.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = 'tavro-id';

    const registry = {};
    const f3a = Forma.SCHEMA;
    dbg > 1 && cc.tag(msg, 'registerSchema');
    let type = Schema.register(Forma.SCHEMA, { avro, registry });
    let typeAgain = Schema.register(Forma.SCHEMA);
    should(typeAgain).equal(type);
    let typeExpected = avro.parse(f3a);
    let name = `${f3a.namespace}.${f3a.name}`;
    should.deepEqual(type, typeExpected);
    should.deepEqual(`"${name}"`, typeExpected.toString());
    should.deepEqual(
      Object.keys(registry).sort(),
      [name, 'string'].sort(),
    );
    should(registry).properties({
      [name]: typeExpected,
    });
    should(Schema.REGISTRY).properties({
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
