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

const dbg = Math.max(0,DBG.ACTION?.TEST);

describe('Action', () => {
  it('ctor default', () => {
    const a4n = new Action();
    expect(a4n.id.validate()).toBe(true);
    expect(a4n.status).toBe('todo'); // default status
    expect(a4n.summary).toBe('Action?'); // inherits from Forma
  });

  it('ctor with status', () => {
    const a4n = new Action({ status: 'done' });
    expect(a4n.id.validate()).toBe(true);
    expect(a4n.status).toBe('done');
  });

  it('patch status', () => {
    const msg = 'ta4n.patch';
    const a4n = new Action();
    expect(a4n.status).toBe('todo');

    const { id } = a4n;
    a4n.patch({ status: 'done' });
    expect(a4n.id).toBe(id);
    expect(a4n.status).toBe(ActionStatus.done);

    a4n.patch({status: ActionStatus.todo})
    expect(a4n.id).toBe(id);
    expect(a4n.status).toBe('todo');

    dbg && cc.tag1(msg + UOK, 'status is mutable');
  });

  it('patch invalid status', () => {
    const a4n = new Action();
    expect(() => a4n.patch({ status: 'invalid' })).toThrow();
  });

  it('avro Action', () => {
    const msg = 'ta4n.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = new UUID64();
    const registry = {id:'Pr9QpW800'}
    const schema = Action.avroSchema;
    let { fullName } = schema;
    expect(!!registry[fullName]).toBe(false);
    let avroType = Action.registerAvro({avro, registry});
    dbg && cc.tag(msg, "avro.parse");
    expect(avroType._name).toEqual(fullName);
    expect(!!registry[fullName]).toBe(true);
    dbg > 1 && cc.tag(msg + UOK, 'parsed schema is added to registry:', fullName);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Action({ id, status: 'done' });
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Action(parsed);
    expect(thing2.status).toBe('done');
    expect(thing2.id.base64).toBe(thing1.id.base64);
    dbg && cc.tag1(msg + UOK, 'Action serialized with avro');
  });

  it('avro Action[]', () => {
    const msg = 'ta4n.avro.array';
    dbg > 1 && cc.tag(msg, '===========');

    // Get schema for Action collection
    const arraySchema = FormaCollection.schemaOf(Action);

    const registry = {id:'Pr9y3LH'}
    Action.registerAvro({avro, registry});
    let arrayType = Schema.registerSchema(arraySchema, {avro, registry});
    dbg > 1 && cc.tag(msg + UOK, 'array schema registered');

    // Create test array of Actions
    const action1 = new Action({ status: 'done' });
    const action2 = new Action({ status: 'todo' });
    const action3 = new Action({ status: 'done' });
    const actions = [action1, action2, action3];

    dbg > 1 && cc.tag(msg, 'serialize Action array');
    const buf = arrayType.toBuffer(actions);
    const parsed = arrayType.fromBuffer(buf);

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
