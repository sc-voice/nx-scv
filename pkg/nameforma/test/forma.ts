import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';

const { Schema, Forma } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = Math.max(0, DBG.FORMA.TEST);

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
    expect(f3a.id.validate()).toBe(true);
    expect(f3a.id.base64.includes(f3a.name)).toBe(true); // name is contained within id
    expect(f3a.summary).toBe('Forma?'); // default summary

    let t7g = new TestThing();
    expect(t7g.id.base64.includes(t7g.name)).toBe(true); // name is contained within id
    expect(t7g.summary).toBe('TestThing?'); // default summary uses class name
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
    dbg > 1 && cc.tag(msg, 'name is mutable');

    f3a.patch({ summary: 'New summary' });
    expect(f3a.id).toBe(id);
    expect(f3a.name).toBe('newName');
    expect(f3a.summary).toBe('New summary');
    dbg && cc.tag1(msg + UOK, 'summary is mutable');
  });
  it('avro Forma defaultRegistry', () => {
    const msg = 'tf3a.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = new UUID64()
    const schema = Forma.avroSchema;
    const { fullName } = schema;
    let avroType = Forma.registerAvro({avro});
    expect(avroType._name).toEqual(fullName);
    expect(Schema.REGISTRY[fullName]).toBe(avroType);
    expect(Schema.REGISTRY.id).toBe("defaultRegistry");
    expect( Object.keys(Schema.REGISTRY).sort(),).toEqual([
      'id',
      'scvoice.nameforma.UUID64', 
      'scvoice.nameforma.Identifiable', 
      'scvoice.nameforma.Forma', 
      'bytes', 'string',
    ].sort());

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Forma({ id });
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Forma(parsed);
    expect(thing2).toEqual(thing1);
    dbg && cc.tag1(msg + UOK, 'Forma serialized with avro');
  });
  it('classes', () => {
    const msg = 'tc5s';
    class ClassA {
      static register() {
        return this.avroSchema;
      }

      static get avroSchema() {
        return 'schemaA';
      }
    }

    class ClassB extends ClassA {
      static get avroSchema() {
        return 'schemaB';
      }

      static register() {
        return 'CLASSB' + super.register();
      }
    }

    expect(ClassA.register()).toBe(ClassA.avroSchema);
    dbg && cc.ok(msg + UOK, 'ClassA:', ClassA.register());

    expect(ClassB.register()).toBe('CLASSB' + ClassB.avroSchema);
    dbg && cc.ok1(msg + UOK, 'ClassB:', ClassB.register());
  });
});
