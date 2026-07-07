import { describe, it, expect } from '@sc-voice/vitest';
import { UUID64, Schema, Action } from '@sc-voice/nameforma';
import {
  ActionStatus,
  ActionTransitions,
  STATUS_ORDER,
  DBG,
  FormaList,
} from '@sc-voice/nameforma/unstable';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = Math.max(0, DBG.ACTION?.TEST);

describe('Action', () => {
  it('ctor default', () => {
    const a4n = new Action();
    expect(a4n.id.validate()).toBe(true);
    expect(a4n.status).toBe('req'); // default status
    expect(a4n.summary).toBe(''); // inherits from Forma
    expect(a4n.typeName).toBe('Action'); // inherits from Forma
  });

  it('ctor with status', () => {
    const a4n = new Action({ status: 'done' });
    expect(a4n.id.validate()).toBe(true);
    expect(a4n.status).toBe('done');
  });

  it('patch status', () => {
    const msg = 'ta4n.patch';
    const a4n = new Action();
    expect(a4n.status).toBe('req');

    const { id } = a4n;
    // Walk valid transitions: req→spec→work→test→manage→done
    const p1 = a4n.patch({
      status: ActionStatus.spec,
      statusNote: 'note1',
    });
    expect(a4n.id).toBe(id);
    expect(a4n.status).toBe(ActionStatus.spec);
    expect(a4n.statusNote).toBe('note1');
    expect(p1).toEqual({ status: ActionStatus.req, statusNote: '' });

    const p2 = a4n.patch({
      status: ActionStatus.work,
      statusNote: 'note2',
    });
    expect(p2).toEqual({ status: ActionStatus.spec, statusNote: 'note1' });

    const p3 = a4n.patch({
      status: ActionStatus.test,
      statusNote: 'note3',
    });
    expect(p3).toEqual({ status: ActionStatus.work, statusNote: 'note2' });

    const p4 = a4n.patch({
      status: ActionStatus.manage,
      statusNote: 'note4',
    });
    expect(p4).toEqual({ status: ActionStatus.test, statusNote: 'note3' });

    const p5 = a4n.patch({
      status: ActionStatus.done,
      statusNote: 'note5',
    });
    expect(a4n.status).toBe(ActionStatus.done);
    expect(a4n.statusNote).toBe('note5');
    expect(p5).toEqual({
      status: ActionStatus.manage,
      statusNote: 'note4',
    });

    dbg && cc.tag1(msg + UOK, 'status is mutable');
  });

  it('patch invalid status', () => {
    const a4n = new Action();
    expect(() => a4n.patch({ status: 'invalid' })).toThrow();
  });

  it('ActionTransitions covers all statuses', () => {
    const statuses = Object.values(ActionStatus);
    for (const status of statuses) {
      expect(ActionTransitions[status]).toBeDefined();
    }
  });

  it('ActionTransitions enforces invalid transition', () => {
    const a4n = new Action({ status: ActionStatus.test }); // status: test
    // test → req is not a valid transition
    expect(() =>
      a4n.patch({ status: ActionStatus.req, statusNote: 'note2' }),
    ).toThrow(/invalid transition/);
  });

  it('statusNote stored on action', () => {
    const a4n = new Action();
    expect(a4n.statusNote).toBe('');
    a4n.patch({ status: ActionStatus.spec, statusNote: 'agreed on spec' });
    expect(a4n.statusNote).toBe('agreed on spec');
  });

  it('replace updates fields', () => {
    const name = 'Initial Action';
    const summary = 'Initial summary';
    const a4n = new Action({ name, summary, status: ActionStatus.req });
    const originalId = a4n.id;
    const originalUpdateId = a4n.updateId;

    const newName = 'Replaced Action';
    const newSummary = 'Replaced summary';
    const result = a4n.replace({
      name: newName,
      summary: newSummary,
      status: ActionStatus.spec,
      statusNote: 'spec agreed',
    });
    expect(a4n.name).toBe(newName);
    expect(a4n.summary).toBe(newSummary);
    expect(a4n.status).toBe(ActionStatus.spec);
    expect(a4n.statusNote).toBe('spec agreed');
    expect(a4n.id.base64).toBe(originalId.base64); // id is immutable
    expect(a4n.updateId.base64).not.toBe(originalUpdateId.base64); // updateId changed
  });

  it('avro Action', () => {
    const msg = 'ta4n.avro';
    dbg > 1 && cc.tag(msg, '===========');

    const id = new UUID64();
    const registry = { id: 'Pr9QpW800' };
    const schema = Action.avroSchema;
    let { fullName } = schema;
    expect(!!registry[fullName]).toBe(false);
    let avroType = Action.registerAvro({ avro, registry });
    dbg && cc.tag(msg, 'avro.parse');
    expect(avroType._name).toEqual(fullName);
    expect(!!registry[fullName]).toBe(true);
    dbg > 1 &&
      cc.tag(msg + UOK, 'parsed schema is added to registry:', fullName);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Action({ id, status: 'done' });
    let buf = avroType.toBuffer(schema.toAvro(thing1, { avro, registry }));
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Action(parsed);
    expect(thing2.status).toBe('done');
    expect(thing2.id.base64).toBe(thing1.id.base64);
    dbg && cc.tag1(msg + UOK, 'Action serialized with avro');
  });

  it('avro Action[]', () => {
    const msg = 'ta4n.avro.array';
    dbg > 1 && cc.tag(msg, '===========');

    // Get schema for Action array (direct array schema like Task.avroSchema line 150)
    const arraySchema = new Schema({
      name: 'ActionArray',
      type: 'array',
      items: Action.avroSchema.fullName,
    });

    const registry = { id: 'Pr9y3LH' };
    Action.registerAvro({ avro, registry });
    let arrayType = Schema.registerSchema(arraySchema, { avro, registry });
    dbg > 1 && cc.tag(msg + UOK, 'array schema registered');

    // Create test array of Actions
    const action1 = new Action({ status: 'done' });
    const action2 = new Action({ status: 'req' });
    const action3 = new Action({ status: 'done' });
    const actions = [action1, action2, action3];

    dbg > 1 && cc.tag(msg, 'serialize Action array');
    const buf = arrayType.toBuffer(
      actions.map((a) => Action.avroSchema.toAvro(a, { avro, registry })),
    );
    const parsed = arrayType.fromBuffer(buf);

    // Reconstruct Action instances from parsed data
    const reconstructed = parsed.map((a) => new Action(a));

    expect(reconstructed).toHaveLength(3);
    expect(reconstructed[0].status).toBe('done');
    expect(reconstructed[1].status).toBe('req');
    expect(reconstructed[2].status).toBe('done');
    expect(reconstructed[0].id.base64).toBe(action1.id.base64);
    expect(reconstructed[1].id.base64).toBe(action2.id.base64);
    expect(reconstructed[2].id.base64).toBe(action3.id.base64);

    dbg && cc.tag1(msg + UOK, 'Action[] serialized with avro');
  });

  it('shortDate today returns time format (contains :)', () => {
    const result = Action.shortDate(new Date());
    expect(result).toMatch(/:/);
  });

  it('shortDate past year excludes year from output', () => {
    const pastDate = new Date(2020, 0, 15); // Jan 15, 2020
    const result = Action.shortDate(pastDate);
    expect(result).not.toContain('2020');
  });

  it('shortDate leap day excludes year from output', () => {
    const leapDay = new Date(2024, 1, 29); // Feb 29, 2024
    const result = Action.shortDate(leapDay);
    expect(result).not.toContain('2024');
  });

  it('STATUS_ORDER has 6 entries', () => {
    expect(Object.keys(STATUS_ORDER)).toHaveLength(6);
  });

  it('STATUS_ORDER values are 1..6', () => {
    expect(STATUS_ORDER[ActionStatus.req]).toBe(1);
    expect(STATUS_ORDER[ActionStatus.spec]).toBe(2);
    expect(STATUS_ORDER[ActionStatus.work]).toBe(3);
    expect(STATUS_ORDER[ActionStatus.test]).toBe(4);
    expect(STATUS_ORDER[ActionStatus.manage]).toBe(5);
    expect(STATUS_ORDER[ActionStatus.done]).toBe(6);
  });

  it('STATUS_ORDER maintains expected ordering', () => {
    expect(STATUS_ORDER[ActionStatus.done]).toBeGreaterThan(
      STATUS_ORDER[ActionStatus.manage],
    );
    expect(STATUS_ORDER[ActionStatus.manage]).toBeGreaterThan(
      STATUS_ORDER[ActionStatus.test],
    );
    expect(STATUS_ORDER[ActionStatus.test]).toBeGreaterThan(
      STATUS_ORDER[ActionStatus.work],
    );
    expect(STATUS_ORDER[ActionStatus.work]).toBeGreaterThan(
      STATUS_ORDER[ActionStatus.spec],
    );
    expect(STATUS_ORDER[ActionStatus.spec]).toBeGreaterThan(
      STATUS_ORDER[ActionStatus.req],
    );
  });
});
