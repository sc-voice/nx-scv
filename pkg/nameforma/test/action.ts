import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';

const { Schema, Action, ActionStatus } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.ACTION?.TEST;

describe('Action', () => {
  it('ctor default', () => {
    const a6n = new Action();
    expect(a6n.id.validate()).toBe(true);
    expect(a6n.status).toBe('todo'); // default status
    expect(a6n.summary).toBe('Action?'); // inherits from Forma
  });

  it('ctor with status', () => {
    const a6n = new Action({ status: 'done' });
    expect(a6n.id.validate()).toBe(true);
    expect(a6n.status).toBe('done');
  });

  it('patch status', () => {
    const msg = 'ta6n.patch';
    const a6n = new Action();
    expect(a6n.status).toBe('todo');

    const { id } = a6n;
    a6n.patch({ status: 'done' });
    expect(a6n.id).toBe(id);
    expect(a6n.status).toBe(ActionStatus.done);

    a6n.patch({status: ActionStatus.todo})
    expect(a6n.id).toBe(id);
    expect(a6n.status).toBe('todo');

    dbg && cc.tag1(msg + UOK, 'status is mutable');
  });

  it('patch invalid status', () => {
    const a6n = new Action();
    expect(() => a6n.patch({ status: 'invalid' })).toThrow();
  });

  it('avro', () => {
    const msg = 'ta6n.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = new UUID64();
    const registry = {};
    const schema = Action.SCHEMA;
    let type = Schema.register(schema, { avro, registry });
    let typeExpected = avro.parse(schema);
    let name = `${schema.namespace}.${schema.name}`;
    expect(type).toEqual(typeExpected);
    expect(`"${name}"`).toEqual(typeExpected.toString());
    dbg > 1 && cc.tag(msg + UOK, 'parsed schema is added to registry:', name);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Action({ id, status: 'done' });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Action(parsed);
    expect(thing2.status).toBe('done');
    expect(thing2.id.base64).toBe(thing1.id.base64);
    dbg && cc.tag1(msg + UOK, 'Action serialized with avro');
  });
});
