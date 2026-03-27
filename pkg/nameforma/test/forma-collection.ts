import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import { NameForma } from '../src/index.js';
import { Text } from '@sc-voice/tools';
import { DBG } from '../src/defines.js';

const { Forma, FormaCollection } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.FORMA.TEST;

/**
 * Test item class implementing IFormaItem
 */
class TestItem {
  id: UUID64;
  parentId: UUID64;
  name: string;

  constructor(id: UUID64, parentId: UUID64, name: string) {
    this.id = id;
    this.parentId = parentId;
    this.name = name;
  }

  static createForParent(parentId: UUID64, cfg: any): TestItem {
    const id = UUID64.createRelation(parentId);
    const name = cfg.name || id.timeId();
    return new TestItem(id, parentId, name);
  }
}

describe('FormaCollection', () => {
  it('FormaCollection.constructor', () => {
    const msg = 'tfc.ctor';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    expect(col.parentId).toEqual(parentId);
    expect(col.size).toBe(0);
    expect(col.items()).toEqual([]);
    dbg && cc.ok1(msg + UOK, 'constructor creates empty collection');
  });

  it('FormaCollection.addItem', () => {
    const msg = 'tfc.addItem';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    // Add items
    const item1 = col.addItem({ name: 'item1' });
    expect(item1.name).toBe('item1');
    expect(item1.parentId).toEqual(parentId);
    expect(col.size).toBe(1);
    dbg && cc.ok1(msg + UOK, 'addItem creates and adds item');

    const item2 = col.addItem({ name: 'item2' });
    const item3 = col.addItem({ name: 'item3' });
    expect(col.size).toBe(3);
    dbg && cc.ok1(msg + UOK, 'multiple addItem works');

    // Items added in order
    const items = col.items();
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item2);
    expect(items[2]).toBe(item3);
    dbg && cc.ok1(msg + UOK, 'items maintain insertion order');
  });

  it('FormaCollection.getItem', () => {
    const msg = 'tfc.getItem';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });
    const item3 = col.addItem({ name: 'item3' });

    // Get existing items
    expect(col.getItem(item1.id.base64)).toBe(item1);
    expect(col.getItem(item2.id.base64)).toBe(item2);
    expect(col.getItem(item3.id.base64)).toBe(item3);
    dbg && cc.ok1(msg + UOK, 'getItem retrieves items by ID');

    // Get non-existent item
    const fakeId = 'fake-id';
    expect(() => col.getItem(fakeId)).toThrow();
    dbg && cc.ok1(msg + UOK, 'getItem throws for missing ID');
  });

  it('FormaCollection.deleteItem', () => {
    const msg = 'tfc.deleteItem';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });
    const item3 = col.addItem({ name: 'item3' });

    // Delete middle item
    const deleted = col.deleteItem(item2.id.base64);
    expect(deleted).toBe(item2);
    expect(col.size).toBe(2);
    expect(() => col.getItem(item2.id.base64)).toThrow();
    dbg && cc.ok1(msg + UOK, 'deleteItem removes item and returns it');

    // Remaining items in order
    const items = col.items();
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item3);
    dbg && cc.ok1(msg + UOK, 'remaining items maintain order');

    // Delete non-existent item
    const fakeId = new UUID64().base64;
    expect(() => col.deleteItem(fakeId)).toThrow();
    expect(col.size).toBe(2);
    dbg && cc.ok1(msg + UOK, 'deleteItem throws for missing ID');
  });

  it('FormaCollection.patchItem', () => {
    const msg = 'tfc.patchItem';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'original' });
    const item2 = col.addItem({ name: 'item2' });

    // Patch existing item
    const patched = col.patchItem(item1.id.base64, { name: 'updated' });
    expect(patched).toBe(item1);
    expect(item1.name).toBe('updated');
    expect(col.getItem(item1.id.base64)?.name).toBe('updated');
    dbg && cc.ok1(msg + UOK, 'patchItem updates item properties');

    // Patch non-existent item throws
    const fakeId = new UUID64().base64;
    expect(() => col.patchItem(fakeId, { name: 'fail' })).toThrow();
    dbg && cc.ok1(msg + UOK, 'patchItem throws for missing ID');
  });

  it('FormaCollection.moveItem with before anchor', () => {
    const msg = 'tfc.moveItem.before';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });
    const item3 = col.addItem({ name: 'item3' });

    // Move item3 before item1 (to start)
    col.moveItem(item3.id.base64, { before: item1.id.base64 });
    let items = col.items();
    expect(items[0]).toBe(item3);
    expect(items[1]).toBe(item1);
    expect(items[2]).toBe(item2);
    dbg && cc.ok1(msg + UOK, 'moveItem with before works');

    // Move item1 before item2
    col.moveItem(item1.id.base64, { before: item2.id.base64 });
    items = col.items();
    expect(items[0]).toBe(item3);
    expect(items[1]).toBe(item1);
    expect(items[2]).toBe(item2);
    dbg && cc.ok1(msg + UOK, 'moveItem before anchor reference works');

    // Move item1 before null (to start)
    col.moveItem(item1.id.base64, { before: null });
    items = col.items();
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item2);
    dbg && cc.ok1(msg + UOK, 'moveItem with before: null inserts at start');
  });

  it('FormaCollection.moveItem with after anchor', () => {
    const msg = 'tfc.moveItem.after';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });
    const item3 = col.addItem({ name: 'item3' });

    // Move item1 after item3 (to end)
    col.moveItem(item1.id.base64, { after: item3.id.base64 });
    let items = col.items();
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item1);
    dbg && cc.ok1(msg + UOK, 'moveItem with after works');

    // Move item1 after item2
    col.moveItem(item1.id.base64, { after: item2.id.base64 });
    items = col.items();
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item1);
    expect(items[2]).toBe(item3);
    dbg && cc.ok1(msg + UOK, 'moveItem after anchor reference works');

    // Move item1 after null (to end)
    col.moveItem(item1.id.base64, { after: null });
    items = col.items();
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item1);
    dbg && cc.ok1(msg + UOK, 'moveItem with after: null appends at end');
  });

  it('FormaCollection.moveItem default behavior', () => {
    const msg = 'tfc.moveItem.default';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });
    const item3 = col.addItem({ name: 'item3' });

    // Move item1 to end (no options)
    col.moveItem(item1.id.base64, {});
    let items = col.items();
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item1);
    dbg && cc.ok1(msg + UOK, 'moveItem with no options appends at end');
  });

  it('FormaCollection.moveItem error cases', () => {
    const msg = 'tfc.moveItem.errors';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const fakeId = new UUID64().base64;

    // Move non-existent item
    expect(() => col.moveItem(fakeId, {})).toThrow();
    dbg && cc.ok1(msg + UOK, 'moveItem throws for missing item ID');

    // Invalid before anchor
    expect(() => col.moveItem(item1.id.base64, { before: fakeId })).toThrow();
    dbg && cc.ok1(msg + UOK, 'moveItem throws for invalid before anchor');

    // Invalid after anchor
    expect(() => col.moveItem(item1.id.base64, { after: fakeId })).toThrow();
    dbg && cc.ok1(msg + UOK, 'moveItem throws for invalid after anchor');
  });

  it('FormaCollection.items returns shallow copy', () => {
    const msg = 'tfc.items.copy';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });

    const items1 = col.items();
    const items2 = col.items();

    // Different arrays
    expect(items1).not.toBe(items2);
    // But same items
    expect(items1[0]).toBe(item1);
    expect(items2[0]).toBe(item1);
    dbg && cc.ok1(msg + UOK, 'items() returns new shallow copy each time');

    // Modifying returned array doesn't affect collection
    items1.pop();
    expect(col.size).toBe(2);
    dbg && cc.ok1(msg + UOK, 'modifying returned array does not affect collection');
  });

  it('FormaCollection.size getter', () => {
    const msg = 'tfc.size';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    expect(col.size).toBe(0);
    col.addItem({ name: 'item1' });
    expect(col.size).toBe(1);
    col.addItem({ name: 'item2' });
    expect(col.size).toBe(2);
    col.deleteItem(col.items()[0].id.base64);
    expect(col.size).toBe(1);
    dbg && cc.ok1(msg + UOK, 'size getter returns correct count');
  });

  it('FormaCollection encapsulation prevents array mutations', () => {
    const msg = 'tfc.encapsulation';
    const parentId = new UUID64();
    const col = new FormaCollection<TestItem>(parentId, TestItem);

    const item1 = col.addItem({ name: 'item1' });
    const item2 = col.addItem({ name: 'item2' });

    // Get items array and try to mutate (shouldn't affect collection)
    const items = col.items();
    items.push(item1); // Push same item again

    // Collection should still have 2 items, not 3
    expect(col.size).toBe(2);
    expect(col.items().length).toBe(2);
    dbg && cc.ok1(msg + UOK, 'returned items() array cannot mutate collection');
  });
});
