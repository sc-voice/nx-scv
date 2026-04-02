import { describe, it, expect } from '@sc-voice/vitest';
import avro from 'avro-js';
import { NameForma } from '../src/index.js';
import { ScvMath, Text } from '@sc-voice/tools';
import { DBG } from '../src/defines.js';

const { Schema, Rational, Task, Forma, Action } = NameForma;
const { TASK: T2K } = DBG;
const { Units } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;

const FRY_EGG = [
  { name: 'heat pan medium heat', progress: new Rational(0, 300, 'F') },
  { name: 'add oil', progress: new Rational(0, 1, 'Tbs') },
  { name: 'break egg into pan', progress: new Rational(0, 2, 'Egg') },
  { name: 'cover pan', progress: new Rational(0, 1, 'lid') },
  { name: 'cook', progress: new Rational(0, 5, 'minutes') },
  {
    name: 'turn off heat and serve',
    progress: new Rational(0, 1, 'serving'),
  },
];

let dbg = Math.max(0, T2K.TEST);

describe('task', () => {
  it('ctor', () => {
    const msg = 'tctor';
    dbg && cc.tag1(msg, 'START');

    let t2k = new Task();
    let { id, name } = t2k;
    expect(t2k.validate({ defaultIdName: true })).toBe(true);
    expect(t2k).toMatchObject({ title: 'title?' });
    expect(t2k.progress).toEqual(new Rational(0, 1, 'done'));
    expect(t2k.duration).toEqual(new Rational(null, 1, 's'));
    expect(id.base64.includes(name)).toBe(true); // name is contained within id
    expect(t2k.toString()).toMatch(/[A-Za-z0-9]+\. title\? \(0\/1done\)/);

    dbg && cc.tag1(msg + UOK, ...cc.props(t2k));
  });
  it('avro serialization', () => {
    const msg = 'tt2k.avro';
    dbg > 1 && cc.tag(msg, '==============');

    const title = 'avro-title';
    const progress = new Rational(3, 4, 'tbsp');
    const duration = new Rational(3, 4, 's');

    const { fullName } = Task.avroSchema;
    const registry = {id: "PrAZmGm"};
    let avroType = Task.registerAvro({ avro, registry });
    dbg > 1 && cc.tag(msg, 'schema registered');

    let thing1 = new Task({ title, progress, duration });
    //let buf = avroType.toBuffer(thing1.toAvroValue());
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Task(parsed);
    expect(thing2).toEqual(thing1);
    dbg && cc.tag1(msg + UOK, 'Task serialized with avro');
  });
  it('put', () => {
    const msg = 't2k.put';
    dbg > 1 && cc.tag(msg, '===================');
    let name = 't2k.put.name';
    let title = 't2k.put.title';
    let progress = new Rational(0, 1, 'done');
    let duration = new Rational(5, 60, 'hr');
    let units = new Units();
    let t2k = new Task({ name, title, progress, duration });
    expect(t2k.toString()).toBe(`${name}. ${title} (0/1done 5/60hr)`);

    t2k.put({
      duration: units.convert(duration).to('min'),
    });
    expect(t2k.toString()).toBe(`${name}. title? (0/1done 5min)`);
    dbg && cc.tag1(msg + UOK, 'put with defaults');
  });
  it('patch', () => {
    const msg = 't2k.patch';
    dbg > 1 && cc.tag(msg, '===================');
    let name = 't2k.patch.name';
    let title = 't2k.patch.title';
    let progress = new Rational(0, 1, 'done');
    let duration = new Rational(5, 60, 'hr');
    let units = new Units();
    let t2k = new Task({ name, title, progress, duration });
    expect(t2k.toString()).toBe(`${name}. ${title} (0/1done 5/60hr)`);

    t2k.patch();
    expect(t2k.toString()).toBe(`${name}. ${title} (0/1done 5/60hr)`);
    dbg > 1 && cc.tag(msg, 'empty patch');

    let newName = 'new-name';
    let { id } = t2k;
    t2k.patch({ id: 'ignored', name: newName, title: 'new title' });
    expect(t2k.id).toBe(id); // immutable
    expect(t2k.toString()).toBe(`${newName}. new title (0/1done 5/60hr)`);
    dbg > 1 && cc.tag(msg, 'patched title');

    t2k.patch({ progress: new Rational(1, 1, 'done') });
    expect(t2k.toString()).toBe(
      `${newName}${UOK} new title (1done 5/60hr)`
    );
    dbg > 1 && cc.tag(msg, 'patched progress numerator');

    t2k.patch({ duration: units.convert(duration).to('min') });
    expect(t2k.toString()).toBe(
      `${newName}${UOK} new title (1done 5min)`
    );
    dbg && cc.tag1(msg + UOK, 'patched duration unit conversion');
  });
  it('actions getter returns FormaList', () => {
    const msg = 't2k.actions';
    dbg > 1 && cc.tag(msg, '===================');

    const t2k = new Task({ title: 'test task' });
    const actions = t2k.actions;

    // Verify FormaList is returned
    expect(actions).toBeDefined();
    expect(actions.constructor.name).toBe('FormaList');
    dbg > 1 && cc.tag(msg, 'actions is a FormaList');

    // Verify initially empty
    expect(actions.items).toHaveLength(0);
    dbg > 1 && cc.tag(msg, 'actions initially empty');

    // Verify can add actions and creates Action instance
    const action1 = actions.addItem({ status: 'todo' });
    expect(action1).toBeDefined();
    expect(action1 instanceof Action).toBe(true);
    expect(action1.status).toBe('todo');
    expect(actions.items).toHaveLength(1);
    dbg > 1 && cc.tag(msg, 'added first action as Action instance');

    // Verify can add multiple actions, all as Action instances
    const action2 = actions.addItem({ status: 'done' });
    expect(action2 instanceof Action).toBe(true);
    expect(actions.items).toHaveLength(2);
    expect(actions.items[0].status).toBe('todo');
    expect(actions.items[1].status).toBe('done');
    expect(actions.items[0] instanceof Action).toBe(true);
    expect(actions.items[1] instanceof Action).toBe(true);
    dbg > 1 && cc.tag(msg, 'added second action as Action instance');

    // Verify actions are stored in rawActions as Action instances
    expect(t2k.rawActions).toHaveLength(2);
    expect(t2k.rawActions[0]).toBe(action1);
    expect(t2k.rawActions[1]).toBe(action2);
    expect(t2k.rawActions[0] instanceof Action).toBe(true);
    expect(t2k.rawActions[1] instanceof Action).toBe(true);
    dbg && cc.tag1(msg + UOK, 'actions backed by rawActions as Action instances');
  });
  it('actions getter wraps rawActions', () => {
    const msg = 't2k.actions.wrap';
    dbg > 1 && cc.tag(msg, '===================');

    const t2k = new Task({ title: 'test task' });
    const actions = t2k.actions;

    // Build up actions array via FormaList
    const action1 = actions.addItem({ status: 'todo' });
    const action2 = actions.addItem({ status: 'done' });
    dbg > 1 && cc.tag(msg, 'added initial actions');

    // Verify actions.items and rawActions are same array reference
    expect(actions.items).toBe(t2k.rawActions);
    expect(t2k.rawActions).toHaveLength(2);
    dbg > 1 && cc.tag(msg, 'wrapped same array reference');

    // Add another action via FormaList
    const action3 = actions.addItem({ status: 'in-progress' });
    expect(action3 instanceof Action).toBe(true);
    expect(t2k.rawActions).toHaveLength(3);
    expect(t2k.rawActions[2]).toBe(action3);
    expect(t2k.rawActions[2] instanceof Action).toBe(true);
    dbg > 1 && cc.tag(msg, 'addItem creates and syncs Action instances with rawActions');

    // Delete action via FormaList ID
    actions.deleteItem(action2.id.base64);
    expect(t2k.rawActions).toHaveLength(2);
    expect(t2k.rawActions[0]).toBe(action1);
    expect(t2k.rawActions[1]).toBe(action3);
    expect(t2k.rawActions[0] instanceof Action).toBe(true);
    expect(t2k.rawActions[1] instanceof Action).toBe(true);
    dbg && cc.tag1(msg + UOK, 'deleteItem mutations sync with rawActions as Action instances');
  });
});
