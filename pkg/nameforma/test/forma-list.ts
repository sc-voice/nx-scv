import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import { NameForma } from '../src/index.js';
import { Text } from '@sc-voice/tools';
import { DBG } from '../src/defines.js';

const { Forma, FormaList } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.FORMA_LIST.TEST

/**
 * Test item class implementing IFormaItem
 */
class TestItem {
  id: UUID64;
  name: string;

  constructor(cfg: any = {}) {
    this.id = cfg.id || new UUID64();
    this.name = cfg.name || this.id.timeId();
  }
}

describe('FormaList', () => {
  it('FormaList.constructor with parentId', () => {
    const msg = 'tfl.ctor.with-parent';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    expect(list.items).toBe(items);
    expect(list.parentId).toEqual(parentId);
    expect(list.size).toBe(0);
    dbg && cc.tag1(msg + UOK, 'constructor with parentId creates empty list');
  });

  it('FormaList.constructor without parentId', () => {
    const msg = 'tfl.ctor.no-parent';
    const items: TestItem[] = [];
    const list = new FormaList<TestItem>(items, TestItem);

    expect(list.items).toBe(items);
    expect(list.parentId).toBeUndefined();
    expect(list.size).toBe(0);
    dbg && cc.tag1(msg + UOK, 'constructor without parentId creates empty list');
  });

  it('FormaList.addItem with parentId', () => {
    const msg = 'tfl.addItem.with-parent';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    // Add items
    const item1 = list.addItem({ name: 'item1' });
    expect(item1.name).toBe('item1');
    expect(item1.id.isRelated(parentId)).toBe(true);
    expect(list.size).toBe(1);
    expect(items[0]).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'addItem creates and adds item with related ID');

    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });
    expect(list.size).toBe(3);
    expect(items.length).toBe(3);
    dbg && cc.tag1(msg + UOK, 'multiple addItem works');

    // Items added in order
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item2);
    expect(items[2]).toBe(item3);
    dbg && cc.tag1(msg + UOK, 'items maintain insertion order');
  });

  it('FormaList.addItem without parentId', () => {
    const msg = 'tfl.addItem.no-parent';
    const items: TestItem[] = [];
    const list = new FormaList<TestItem>(items, TestItem);

    // Add items without parentId (no related ID check)
    const item1 = list.addItem({ name: 'item1' });
    expect(item1.name).toBe('item1');
    expect(list.size).toBe(1);
    expect(items[0]).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'addItem without parentId works');

    const item2 = list.addItem({ name: 'item2' });
    expect(list.size).toBe(2);
    dbg && cc.ok1(msg + UOK, 'multiple addItem without parentId works');
  });

  it('FormaList.addItem with unrelated ID throws', () => {
    const msg = 'tfl.addItem.unrelated';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    // Create unrelated ID
    const unrelatedId = new UUID64();
    expect(() => list.addItem({ id: unrelatedId, name: 'bad' })).toThrow();
    expect(list.size).toBe(0);
    dbg && cc.tag1(msg + UOK, 'addItem throws for unrelated ID');
  });

  it('FormaList.getItem', () => {
    const msg = 'tfl.getItem';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // Get existing items
    expect(list.getItem(item1.id.base64)).toBe(item1);
    expect(list.getItem(item2.id.base64)).toBe(item2);
    expect(list.getItem(item3.id.base64)).toBe(item3);
    dbg && cc.tag1(msg + UOK, 'getItem retrieves items by ID');

    // Get non-existent item
    const fakeId = 'fake-id';
    expect(() => list.getItem(fakeId)).toThrow();
    dbg && cc.tag1(msg + UOK, 'getItem throws for missing ID');
  });

  it('FormaList.deleteItem', () => {
    const msg = 'tfl.deleteItem';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // Delete middle item
    const deleted = list.deleteItem(item2.id.base64);
    expect(deleted).toBe(item2);
    expect(list.size).toBe(2);
    expect(items.length).toBe(2);
    expect(() => list.getItem(item2.id.base64)).toThrow();
    dbg && cc.tag1(msg + UOK, 'deleteItem removes item and returns it');

    // Remaining items in order
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item3);
    dbg && cc.tag1(msg + UOK, 'remaining items maintain order');

    // Delete non-existent item
    const fakeId = new UUID64().base64;
    expect(() => list.deleteItem(fakeId)).toThrow();
    expect(list.size).toBe(2);
    dbg && cc.tag1(msg + UOK, 'deleteItem throws for missing ID');
  });

  it('FormaList.patchItem', () => {
    const msg = 'tfl.patchItem';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'original' });
    const item2 = list.addItem({ name: 'item2' });

    // Patch existing item
    const patched = list.patchItem(item1.id.base64, { name: 'updated' });
    expect(patched).toBe(item1);
    expect(item1.name).toBe('updated');
    expect(list.getItem(item1.id.base64)?.name).toBe('updated');
    dbg && cc.tag1(msg + UOK, 'patchItem updates item properties');

    // Patch non-existent item throws
    const fakeId = new UUID64().base64;
    expect(() => list.patchItem(fakeId, { name: 'fail' })).toThrow();
    dbg && cc.tag1(msg + UOK, 'patchItem throws for missing ID');
  });

  it('FormaList.moveItem with before anchor', () => {
    const msg = 'tfl.moveItem.before';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // Move item3 before item1 (to start)
    list.moveItem(item3.id.base64, { before: item1.id.base64 });
    expect(items[0]).toBe(item3);
    expect(items[1]).toBe(item1);
    expect(items[2]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'moveItem with before works');

    // Move item1 before item2
    list.moveItem(item1.id.base64, { before: item2.id.base64 });
    expect(items[0]).toBe(item3);
    expect(items[1]).toBe(item1);
    expect(items[2]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'moveItem before anchor reference works');

    // Move item1 before null (to start)
    list.moveItem(item1.id.base64, { before: null });
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'moveItem with before: null inserts at start');
  });

  it('FormaList.moveItem with after anchor', () => {
    const msg = 'tfl.moveItem.after';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // Move item1 after item3 (to end)
    list.moveItem(item1.id.base64, { after: item3.id.base64 });
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'moveItem with after works');

    // Move item1 after item2
    list.moveItem(item1.id.base64, { after: item2.id.base64 });
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item1);
    expect(items[2]).toBe(item3);
    dbg && cc.tag1(msg + UOK, 'moveItem after anchor reference works');

    // Move item1 after null (to end)
    list.moveItem(item1.id.base64, { after: null });
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'moveItem with after: null appends at end');
  });

  it('FormaList.moveItem default behavior', () => {
    const msg = 'tfl.moveItem.default';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // Move item1 to end (no options)
    list.moveItem(item1.id.base64, {});
    expect(items[0]).toBe(item2);
    expect(items[1]).toBe(item3);
    expect(items[2]).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'moveItem with no options appends at end');
  });

  it('FormaList.moveItem error cases', () => {
    const msg = 'tfl.moveItem.errors';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const fakeId = new UUID64().base64;

    // Move non-existent item
    expect(() => list.moveItem(fakeId, {})).toThrow();
    dbg && cc.tag1(msg + UOK, 'moveItem throws for missing item ID');

    // Invalid before anchor
    expect(() => list.moveItem(item1.id.base64, { before: fakeId })).toThrow();
    dbg && cc.tag1(msg + UOK, 'moveItem throws for invalid before anchor');

    // Invalid after anchor
    expect(() => list.moveItem(item1.id.base64, { after: fakeId })).toThrow();
    dbg && cc.tag1(msg + UOK, 'moveItem throws for invalid after anchor');
  });

  it('FormaList.size getter', () => {
    const msg = 'tfl.size';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    expect(list.size).toBe(0);
    list.addItem({ name: 'item1' });
    expect(list.size).toBe(1);
    list.addItem({ name: 'item2' });
    expect(list.size).toBe(2);
    list.deleteItem(items[0].id.base64);
    expect(list.size).toBe(1);
    dbg && cc.tag1(msg + UOK, 'size getter returns correct count');
  });

  it('FormaList.Symbol.iterator for iterable support', () => {
    const msg = 'tfl.iterator';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // Test for...of loop
    const collected: TestItem[] = [];
    for (const item of list) {
      collected.push(item);
    }
    expect(collected).toEqual([item1, item2, item3]);
    dbg && cc.tag1(msg + UOK, 'for...of loop works with iterator');

    // Test spread syntax
    const spread = [...list];
    expect(spread).toEqual([item1, item2, item3]);
    dbg && cc.tag1(msg + UOK, 'spread syntax works with iterator');
  });

  it('FormaList mutates wrapped array directly', () => {
    const msg = 'tfl.mutate-direct';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });

    // Verify items array is mutated directly
    expect(items.length).toBe(2);
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'addItem mutates wrapped array directly');

    // Delete mutates array
    list.deleteItem(item1.id.base64);
    expect(items.length).toBe(1);
    expect(items[0]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'deleteItem mutates wrapped array directly');

    // moveItem mutates array
    const item3 = list.addItem({ name: 'item3' });
    list.moveItem(item3.id.base64, { before: item2.id.base64 });
    expect(items[0]).toBe(item3);
    expect(items[1]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'moveItem mutates wrapped array directly');
  });

  it('FormaList fuzzy ID matching', () => {
    const msg = 'tfl.fuzzy-id';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });

    // Get by full ID
    expect(list.getItem(item1.id.base64)).toBe(item1);
    dbg && cc.tag(msg + UOK, 'getItem full ID:', item1.id.base64 );

    // Get by partial ID (first N chars)
    dbg && cc.tag(msg, "item1:", item1.id.base64);
    dbg && cc.tag(msg, "item2:", item2.id.base64);
    let fuzzyId = item2.id.timeId(6);
    expect(list.getItem(fuzzyId)).toBe(item2);

    // Delete by partial ID
    dbg && cc.tag(msg + UOK, 'getItem fuzzyId:', fuzzyId);
    list.deleteItem(fuzzyId);
    expect(list.size).toBe(1);
    expect([...list]).toEqual([item1]);
    dbg && cc.tag(msg + UOK, 'deleteItem fuzzyId:', fuzzyId);
  });

  it('FormaList related ID validation', () => {
    const msg = 'tfl.related-ids';
    const items: TestItem[] = [];
    const parentId = new UUID64();
    const list = new FormaList<TestItem>(items, TestItem, parentId);

    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });
    const item3 = list.addItem({ name: 'item3' });

    // All items should have IDs related to parentId
    expect(item1.id.isRelated(parentId)).toBe(true);
    expect(item2.id.isRelated(parentId)).toBe(true);
    expect(item3.id.isRelated(parentId)).toBe(true);
    dbg && cc.tag1(msg + UOK, 'all added items have IDs related to parentId');

    // Items share random bytes with parentId
    const parentRandomBytes = parentId.base64.substring(10);
    const item1RandomBytes = item1.id.base64.substring(10);
    expect(item1RandomBytes).toEqual(parentRandomBytes);
    dbg && cc.tag1(msg + UOK, 'items share random bytes with parentId');
  });
});
