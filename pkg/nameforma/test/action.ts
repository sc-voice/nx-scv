import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';

const { Schema, Action, ActionStatus, FormaCollection } = NameForma;
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

  it('avro Action[]', () => {
    const msg = 'ta6n.avro.array';
    dbg > 1 && cc.tag(msg, '===========');

    // Get schema for Action collection
    const arraySchema = FormaCollection.schemaOf(Action);

    const registry = {};
    let type = Schema.register(arraySchema, { avro, registry });
    dbg > 1 && cc.tag(msg + UOK, 'array schema registered');

    // Create test array of Actions
    const action1 = new Action({ status: 'done' });
    const action2 = new Action({ status: 'todo' });
    const action3 = new Action({ status: 'done' });
    const actions = [action1, action2, action3];

    dbg > 1 && cc.tag(msg, 'serialize Action array');
    const buf = type.toBuffer(actions);
    const parsed = type.fromBuffer(buf);

    // Reconstruct Action instances from parsed data
    const reconstructed = parsed.map(a => new Action(a));

    expect(reconstructed).toHaveLength(3);
    expect(reconstructed[0].status).toBe('done');
    expect(reconstructed[1].status).toBe('todo');
    expect(reconstructed[2].status).toBe('done');
    expect(reconstructed[0].id.base64).toBe(action1.id.base64);
    expect(reconstructed[1].id.base64).toBe(action2.id.base64);
    expect(reconstructed[2].id.base64).toBe(action3.id.base64);

    dbg && cc.tag1(msg + UOK, 'Action[] serialized with avro');
  });
});
