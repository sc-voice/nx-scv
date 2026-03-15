import { describe, it, expect } from '@sc-voice/vitest';
import { UUID64 } from '@sc-voice/tools';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../index.mjs';
import { DBG } from '../src/defines.mjs';

const { Schema, Forma } = NameForma;
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
    expect(UUID64.validate(f3a.id)).toBe(true);
    expect(f3a.name).toMatch(/^F3A[-A-Za-z0-9_]+$/);

    let t7g = new TestThing();
    expect(t7g.name).toMatch(/^T7G[-A-Za-z0-9_]+$/);
  });
  it('patch', () => {
    const msg = 'tf3a.patch';
    dbg > 1 && cc.tag(msg, '===============');
    let f3a = new Forma();
    expect(f3a.validate({ defaultNameId: true })).toBe(true);

    const { id } = f3a;
    f3a.patch({ id: 'newId' });
    expect(f3a.id).toBe(id);
    dbg > 1 && cc.tag(msg, 'id is immutable');

    f3a.patch({ name: 'newName' });
    expect(f3a.id).toBe(id);
    expect(f3a.name).toBe('newName');
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
    expect(type).toEqual(typeExpected);
    expect(`"${name}"`).toEqual(typeExpected.toString());
    expect(
      Object.keys(registry).sort(),
    ).toEqual([name, 'string'].sort());
    expect(registry).toMatchObject({
      [name]: typeExpected,
    });
    expect(Schema.REGISTRY).toMatchObject({
      [name]: typeExpected,
    });
    dbg > 1 &&
      cc.tag(msg + UOK, 'parsed schema is added to registry:', name);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Forma({ id });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Forma(parsed);
    expect(thing2).toEqual(thing1);
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

    expect(ClassA.register()).toBe(ClassA.SCHEMA);
    dbg && cc.ok(msg + UOK, 'ClassA:', ClassA.register());

    expect(ClassB.register()).toBe('CLASSB' + ClassB.SCHEMA);
    dbg && cc.ok1(msg + UOK, 'ClassB:', ClassB.register());
  });
});
