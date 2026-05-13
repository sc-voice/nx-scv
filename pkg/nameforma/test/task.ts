import { describe, it, expect } from '@sc-voice/vitest';
import avro from 'avro-js';
import { NameForma } from '../src/index.js';
import { ScvMath, Text } from '@sc-voice/tools';
import { Unicode as TextUnicode } from '@sc-voice/tools/text';
import { DBG } from '../src/defines.js';
import { FormaList } from '../src/forma-list.js';

const { Schema, Rational, Task, Forma, Action, Reference } = NameForma;
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

    expect(Unicode).toBe(TextUnicode);
    let t2k = new Task();
    let { id, name } = t2k;
    expect(t2k.validate({ defaultIdName: true })).toBe(true);
    expect(t2k.name).toBeDefined();
    expect(id.base64.includes(name)).toBe(true); // name is contained within id
    expect(t2k.toString()).toBe(name);

    dbg && cc.tag1(msg + UOK, ...cc.props(t2k));
  });
  it('avro serialization', () => {
    const msg = 'tt2k.avro';
    dbg > 1 && cc.tag(msg, '==============');

    const name = 'avro-task';

    const { fullName } = Task.avroSchema;
    const registry = { id: 'PrAZmGm' };
    let avroType = Task.registerAvro({ avro, registry });
    dbg > 1 && cc.tag(msg, 'schema registered');

    let thing1 = new Task({ name });
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    let thing2 = new Task(parsed);
    expect(thing2).toEqual(thing1);
    dbg && cc.tag1(msg + UOK, 'Task serialized with avro');
  });
  it('avro serialization with actions', () => {
    const msg = 'tt2k.avro.actions';
    dbg > 1 && cc.tag(msg, '==============');

    const name = 'task-with-actions';

    const { fullName } = Task.avroSchema;
    const registry = { id: 'PrAZmGm' };
    let avroType = Task.registerAvro({ avro, registry });
    dbg > 1 && cc.tag(msg, 'schema registered');

    // Create task with actions
    let thing1 = new Task({ name });
    const mockBus1 = { emit: () => {}, on: () => {} };
    thing1
      .actions(mockBus1)
      .addItem({ name: 'action 1', summary: 'first action' });
    thing1
      .actions(mockBus1)
      .addItem({ name: 'action 2', summary: 'second action' });
    expect(thing1.rawActions).toHaveLength(2);
    dbg > 1 && cc.tag(msg, 'created task with 2 actions');

    // Serialize
    let buf = avroType.toBuffer(
      Task.avroSchema.toAvro(thing1, { avro, registry }),
    );
    let parsed = avroType.fromBuffer(buf);
    dbg > 1 && cc.tag(msg, 'serialized and deserialized');

    // Verify deserialized task has actions
    let thing2 = new Task(parsed);
    expect(thing2.name).toBe(name);
    expect(thing2.rawActions).toHaveLength(2);
    expect(thing2.rawActions[0]).toBeInstanceOf(Action);
    expect(thing2.rawActions[0].name).toBe('action 1');
    expect(thing2.rawActions[0].summary).toBe('first action');
    expect(thing2.rawActions[1]).toBeInstanceOf(Action);
    expect(thing2.rawActions[1].name).toBe('action 2');
    expect(thing2.rawActions[1].summary).toBe('second action');
    dbg && cc.tag1(msg + UOK, 'Task with actions serialized correctly');
  });
  it('json serialization with actions', () => {
    const msg = 'tt2k.json.actions';
    dbg > 1 && cc.tag(msg, '==============');

    const name = 'task-json-actions';

    // Create task with actions
    let thing1 = new Task({ name });
    const mockBus2 = { emit: () => {}, on: () => {} };
    thing1
      .actions(mockBus2)
      .addItem({ name: 'action 1', summary: 'first action' });
    thing1
      .actions(mockBus2)
      .addItem({ name: 'action 2', summary: 'second action' });
    expect(thing1.rawActions).toHaveLength(2);
    dbg > 1 && cc.tag(msg, 'created task with 2 actions');

    // Serialize to JSON
    const json = JSON.stringify(thing1, null, 2);
    const parsed = JSON.parse(json);
    dbg > 1 && cc.tag(msg, 'serialized and deserialized via JSON');

    // Verify deserialized task has actions
    let thing2 = new Task(parsed);
    expect(thing2.name).toBe(name);
    expect(thing2.rawActions).toHaveLength(2);
    expect(thing2.rawActions[0].name).toBe('action 1');
    expect(thing2.rawActions[0].summary).toBe('first action');
    expect(thing2.rawActions[1].name).toBe('action 2');
    expect(thing2.rawActions[1].summary).toBe('second action');
    dbg &&
      cc.tag1(msg + UOK, 'Task with actions serialized to JSON correctly');
  });
  it('actions getter returns FormaList', () => {
    const msg = 't2k.actions';
    dbg > 1 && cc.tag(msg, '===================');

    const t2k = new Task({ name: 'test task' });
    const mockBus = { emit: () => {}, on: () => {} };
    const actions = t2k.actions(mockBus);

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
    dbg &&
      cc.tag1(
        msg + UOK,
        'actions backed by rawActions as Action instances',
      );
  });
  it('actions getter wraps rawActions', () => {
    const msg = 't2k.actions.wrap';
    dbg > 1 && cc.tag(msg, '===================');

    const t2k = new Task({ name: 'test task' });
    const mockBus = { emit: () => {}, on: () => {} };
    const actions = t2k.actions(mockBus);

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
    dbg > 1 &&
      cc.tag(
        msg,
        'addItem creates and syncs Action instances with rawActions',
      );

    // Delete action via FormaList ID
    actions.deleteItem(action2.id.base64);
    expect(t2k.rawActions).toHaveLength(2);
    expect(t2k.rawActions[0]).toBe(action1);
    expect(t2k.rawActions[1]).toBe(action3);
    expect(t2k.rawActions[0] instanceof Action).toBe(true);
    expect(t2k.rawActions[1] instanceof Action).toBe(true);
    dbg &&
      cc.tag1(
        msg + UOK,
        'deleteItem mutations sync with rawActions as Action instances',
      );
  });

  it('FormaList emits correct event fields when action added', () => {
    const msg = 't2k.event.fields';
    dbg > 1 && cc.tag(msg, '===================');

    // Create a mock IEventBus to capture events
    const events: any[] = [];
    const mockBus = {
      emit: (event: string, payload: any) => {
        dbg > 1 && cc.tag(msg, `emit: ${event}`, payload);
        events.push(payload);
      },
      on: () => {},
    };

    // Create a task and wire the mock bus to its actions FormaList
    const task = new Task({ name: 'test task' });
    const actionsList = new FormaList(task.rawActions, Action, {
      parent: task,
      emitter: mockBus,
    });
    dbg > 1 && cc.tag(msg, 'created FormaList with mock bus');

    // Add an action and verify event fields
    const action = actionsList.addItem({
      name: 'action 1',
      status: 'todo',
    });
    dbg > 1 &&
      cc.tag(msg, 'added action, events captured:', events.length);

    expect(events.length).toBeGreaterThan(0);
    const addEvent = events[0];
    expect(addEvent.type).toBe('add');
    expect(addEvent.entity).toBe(task);
    expect(addEvent.item).toBe(action);
    expect(addEvent.item.name).toBe('action 1');
    expect(addEvent.item.status).toBe('todo');
    dbg &&
      cc.tag1(
        msg + UOK,
        'FormaList event includes parent entity to be persisted',
      );
  });

  it('progress() returns 0 for empty task', () => {
    const task = new Task({ name: 'empty task' });
    expect(task.progress()).toBe(0);
  });

  it('progress() returns 1/6 when single action is req', () => {
    const task = new Task({ name: 'task' });
    const mockBus = { emit: () => {}, on: () => {} };
    task.actions(mockBus).addItem({ status: 'req' });
    expect(task.progress()).toBe(1 / 6);
  });

  it('progress() returns weighted mean of action statuses', () => {
    const task = new Task({ name: 'task' });
    const mockBus = { emit: () => {}, on: () => {} };
    task.actions(mockBus).addItem({ status: 'req' }); // 1
    task.actions(mockBus).addItem({ status: 'work' }); // 3
    task.actions(mockBus).addItem({ status: 'done' }); // 6
    // Sum = 10, total = 3, max = 18, progress = 10/18
    expect(task.progress()).toBeCloseTo(10 / 18);
  });

  it('progress() returns 1 when all actions are done', () => {
    const task = new Task({ name: 'task' });
    const mockBus = { emit: () => {}, on: () => {} };
    task.actions(mockBus).addItem({ status: 'done' });
    task.actions(mockBus).addItem({ status: 'done' });
    expect(task.progress()).toBe(1);
  });

  it('references getter returns FormaList', () => {
    const msg = 't2k.references';
    dbg > 1 && cc.tag(msg, '===================');

    const t2k = new Task({ name: 'test task' });
    const mockBus = { emit: () => {}, on: () => {} };
    const references = t2k.references(mockBus);

    // Verify FormaList is returned
    expect(references).toBeDefined();
    expect(references.constructor.name).toBe('FormaList');
    dbg > 1 && cc.tag(msg, 'references is a FormaList');

    // Verify initially empty
    expect(references.items).toHaveLength(0);
    dbg > 1 && cc.tag(msg, 'references initially empty');

    // Verify can add references and creates Reference instance
    const ref1 = references.addItem({
      name: 'Link to docs',
      relevance: 0.9,
      source: 'https://example.com/docs',
    });
    expect(ref1).toBeDefined();
    expect(ref1 instanceof Reference).toBe(true);
    expect(ref1.name).toBe('Link to docs');
    expect(ref1.relevance).toBe(0.9);
    expect(references.items).toHaveLength(1);
    dbg > 1 && cc.tag(msg, 'added first reference as Reference instance');

    // Verify can add multiple references, all as Reference instances
    const ref2 = references.addItem({
      name: 'Related issue',
      relevance: 0.6,
    });
    expect(ref2 instanceof Reference).toBe(true);
    expect(references.items).toHaveLength(2);
    expect(references.items[0].name).toBe('Link to docs');
    expect(references.items[1].name).toBe('Related issue');
    expect(references.items[0] instanceof Reference).toBe(true);
    expect(references.items[1] instanceof Reference).toBe(true);
    dbg > 1 && cc.tag(msg, 'added second reference as Reference instance');

    // Verify references are stored in rawReferences as Reference instances
    expect(t2k.rawReferences).toHaveLength(2);
    expect(t2k.rawReferences[0]).toBe(ref1);
    expect(t2k.rawReferences[1]).toBe(ref2);
    expect(t2k.rawReferences[0] instanceof Reference).toBe(true);
    expect(t2k.rawReferences[1] instanceof Reference).toBe(true);
    dbg &&
      cc.tag1(
        msg + UOK,
        'references backed by rawReferences as Reference instances',
      );
  });

  it('avro serialization with references', () => {
    const msg = 'tt2k.avro.references';
    dbg > 1 && cc.tag(msg, '==============');

    const name = 'task-with-references';

    const { fullName } = Task.avroSchema;
    const registry = { id: 'PrAZmGm' };
    let avroType = Task.registerAvro({ avro, registry });
    dbg > 1 && cc.tag(msg, 'schema registered');

    // Create task with references
    let thing1 = new Task({ name });
    const mockBus1 = { emit: () => {}, on: () => {} };
    thing1.references(mockBus1).addItem({
      name: 'ref 1',
      relevance: 0.9,
      source: 'https://example.com',
    });
    thing1.references(mockBus1).addItem({ name: 'ref 2', relevance: 0.5 });
    expect(thing1.rawReferences).toHaveLength(2);
    dbg > 1 && cc.tag(msg, 'created task with 2 references');

    // Serialize
    let buf = avroType.toBuffer(thing1);
    let parsed = avroType.fromBuffer(buf);
    dbg > 1 && cc.tag(msg, 'serialized and deserialized');

    // Verify deserialized task has references
    let thing2 = new Task(parsed);
    expect(thing2.name).toBe(name);
    expect(thing2.rawReferences).toHaveLength(2);
    expect(thing2.rawReferences[0]).toBeInstanceOf(Reference);
    expect(thing2.rawReferences[0].name).toBe('ref 1');
    expect(thing2.rawReferences[0].relevance).toBe(0.9);
    expect(thing2.rawReferences[0].source).toBe('https://example.com');
    expect(thing2.rawReferences[1]).toBeInstanceOf(Reference);
    expect(thing2.rawReferences[1].name).toBe('ref 2');
    expect(thing2.rawReferences[1].relevance).toBe(0.5);
    dbg && cc.tag1(msg + UOK, 'Task with references serialized correctly');
  });

  it('json serialization with references', () => {
    const msg = 'tt2k.json.references';
    dbg > 1 && cc.tag(msg, '==============');

    const name = 'task-json-references';

    // Create task with references
    let thing1 = new Task({ name });
    const mockBus2 = { emit: () => {}, on: () => {} };
    thing1.references(mockBus2).addItem({
      name: 'ref 1',
      relevance: 0.9,
      source: 'https://example.com',
    });
    thing1.references(mockBus2).addItem({ name: 'ref 2', relevance: 0.5 });
    expect(thing1.rawReferences).toHaveLength(2);
    dbg > 1 && cc.tag(msg, 'created task with 2 references');

    // Serialize to JSON
    const json = JSON.stringify(thing1, null, 2);
    const parsed = JSON.parse(json);
    dbg > 1 && cc.tag(msg, 'serialized and deserialized via JSON');

    // Verify deserialized task has references
    let thing2 = new Task(parsed);
    expect(thing2.name).toBe(name);
    expect(thing2.rawReferences).toHaveLength(2);
    expect(thing2.rawReferences[0].name).toBe('ref 1');
    expect(thing2.rawReferences[0].relevance).toBe(0.9);
    expect(thing2.rawReferences[1].name).toBe('ref 2');
    expect(thing2.rawReferences[1].relevance).toBe(0.5);
    dbg &&
      cc.tag1(
        msg + UOK,
        'Task with references serialized to JSON correctly',
      );
  });

  it('references getter wraps rawReferences', () => {
    const msg = 't2k.references.wrap';
    dbg > 1 && cc.tag(msg, '===================');

    const t2k = new Task({ name: 'test task' });
    const mockBus = { emit: () => {}, on: () => {} };
    const references = t2k.references(mockBus);

    // Build up references array via FormaList
    const ref1 = references.addItem({ name: 'ref 1', relevance: 0.9 });
    const ref2 = references.addItem({ name: 'ref 2', relevance: 0.5 });
    dbg > 1 && cc.tag(msg, 'added initial references');

    // Verify references.items and rawReferences are same array reference
    expect(references.items).toBe(t2k.rawReferences);
    expect(t2k.rawReferences).toHaveLength(2);
    dbg > 1 && cc.tag(msg, 'wrapped same array reference');

    // Add another reference via FormaList
    const ref3 = references.addItem({ name: 'ref 3', relevance: 0.3 });
    expect(ref3 instanceof Reference).toBe(true);
    expect(t2k.rawReferences).toHaveLength(3);
    expect(t2k.rawReferences[2]).toBe(ref3);
    expect(t2k.rawReferences[2] instanceof Reference).toBe(true);
    dbg > 1 &&
      cc.tag(
        msg,
        'addItem creates and syncs Reference instances with rawReferences',
      );

    // Delete reference via FormaList ID
    references.deleteItem(ref2.id.base64);
    expect(t2k.rawReferences).toHaveLength(2);
    expect(t2k.rawReferences[0]).toBe(ref1);
    expect(t2k.rawReferences[1]).toBe(ref3);
    expect(t2k.rawReferences[0] instanceof Reference).toBe(true);
    expect(t2k.rawReferences[1] instanceof Reference).toBe(true);
    dbg &&
      cc.tag1(
        msg + UOK,
        'deleteItem mutations sync with rawReferences as Reference instances',
      );
  });

  it('Task.namespace() supports fuzzy ID lookup for actions and references', () => {
    const msg = 't2k.namespace.fuzzyid';
    const t2k = new Task({ name: 'test task' });

    // Add actions
    const actionsList = t2k.actions({
      emit: () => {},
      on: () => {},
    } as any);
    const action1 = actionsList.addItem({ name: 'action1' });
    const action2 = actionsList.addItem({ name: 'action2' });

    // Add references
    const refsList = t2k.references({
      emit: () => {},
      on: () => {},
    } as any);
    const ref1 = refsList.addItem({ name: 'ref1' });
    const ref2 = refsList.addItem({ name: 'ref2' });

    // Get fuzzy IDs and verify retrieval
    const ns = t2k.namespace();
    const fuzzyId1 = ns.fuzzyIdOf(action1);
    const fuzzyId2 = ns.fuzzyIdOf(action2);
    const fuzzyIdRef1 = ns.fuzzyIdOf(ref1);
    const fuzzyIdRef2 = ns.fuzzyIdOf(ref2);

    expect(fuzzyId1).toBeDefined();
    expect(fuzzyId2).toBeDefined();
    expect(fuzzyIdRef1).toBeDefined();
    expect(fuzzyIdRef2).toBeDefined();

    // Retrieve by full fuzzy ID
    expect(ns.getForma(fuzzyId1)).toBe(action1);
    expect(ns.getForma(fuzzyId2)).toBe(action2);
    expect(ns.getForma(fuzzyIdRef1)).toBe(ref1);
    expect(ns.getForma(fuzzyIdRef2)).toBe(ref2);

    dbg &&
      cc.tag1(
        msg + UOK,
        'namespace fuzzy ID lookup works for actions and references',
      );
  });

  it('Task.namespace() throws on ambiguous fuzzy ID match', () => {
    const msg = 't2k.namespace.ambiguous';
    const t2k = new Task({ name: 'test task' });
    const bus = { emit: () => {}, on: () => {} } as any;

    const actionsList = t2k.actions(bus);
    const action1 = actionsList.addItem({ name: 'action1' });
    const action2 = actionsList.addItem({ name: 'action2' });

    const ns = t2k.namespace();

    // A very short fuzzyId might match multiple items with levenshtein tolerance
    // This should throw an error, not return undefined or ambiguous result
    expect(() => ns.getForma('0')).toThrow(/ambiguous/);
    dbg && cc.tag1(msg + UOK, 'ambiguous fuzzyId throws error');
  });

  it('Task.namespace() fuzzy IDs update when items deleted', () => {
    const msg = 't2k.namespace.fuzzyid.delete';
    const t2k = new Task({ name: 'test task' });
    const bus = { emit: () => {}, on: () => {} } as any;

    const actionsList = t2k.actions(bus);
    const action1 = actionsList.addItem({ name: 'action1' });
    const action2 = actionsList.addItem({ name: 'action2' });

    const refsList = t2k.references(bus);
    const ref1 = refsList.addItem({ name: 'ref1' });

    const ns = t2k.namespace();
    const fuzzyId1 = ns.fuzzyIdOf(action1);
    const fuzzyIdRef1 = ns.fuzzyIdOf(ref1);

    // Verify items exist by fuzzy ID
    expect(ns.getForma(fuzzyId1)).toBe(action1);
    expect(ns.getForma(fuzzyIdRef1)).toBe(ref1);

    // Delete items
    actionsList.deleteItem(action1.id.base64);
    refsList.deleteItem(ref1.id.base64);

    // Verify removed from namespace by fuzzy ID
    expect(ns.getForma(fuzzyId1)).toBeUndefined();
    expect(ns.getForma(fuzzyIdRef1)).toBeUndefined();

    // Verify remaining action2 still accessible
    const fuzzyId2 = ns.fuzzyIdOf(action2);
    expect(ns.getForma(fuzzyId2)).toBe(action2);

    dbg &&
      cc.tag1(msg + UOK, 'namespace fuzzy IDs update correctly on delete');
  });
});
