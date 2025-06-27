import should from 'should';
import { NameForma } from '../../index.mjs';
const { Schema, Forma } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const dbg = DBG.FORMA.TEST;

class TestThing extends Forma {
  constructor(cfg = {}) {
    const msg = 't7g.ctor';
    super(cfg);
    cc.fyi1(msg, ...cc.props(this));
  }
}

describe('Forma', () => {
  it('ctor', () => {
    let f3a = new Forma();
    should(f3a.id).match(/^F3A[-0-9a-z]+$/);

    let t7g = new TestThing();
    should(t7g.id).match(/^T7G[-0-9a-z]+$/);
  });
  it('TESTTESTpatch', () => {
    const msg = 'tf3a.patch';
    dbg > 1 && cc.tag(msg, '===============');
    let f3a = new Forma();
    should(f3a.validate({ defaultNameId: true })).equal(true);

    const { id } = f3a;
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
    const schema = Forma.SCHEMA;
    let type = Schema.register(schema, { avro, registry });
    let typeExpected = avro.parse(schema);
    let name = `${schema.namespace}.${schema.name}`;
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
  it('classes', () => {
    const msg = 'tc5s';
    class ClassA {
      static register() {
        return this.SCHEMA;
      }

      static get SCHEMA() {
        return 'schemaA';
      }
    }

    class ClassB extends ClassA {
      static get SCHEMA() {
        return 'schemaB';
      }

      static register() {
        return 'CLASSB' + super.register();
      }
    }

    should(ClassA.register()).equal(ClassA.SCHEMA);
    dbg && cc.ok(msg + UOK, 'ClassA:', ClassA.register());

    should(ClassB.register()).equal('CLASSB' + ClassB.SCHEMA);
    dbg && cc.ok1(msg + UOK, 'ClassB:', ClassB.register());
  });
});
