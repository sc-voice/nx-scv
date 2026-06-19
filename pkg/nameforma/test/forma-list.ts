import { describe, it, expect } from '@sc-voice/vitest';
import { UUID64, Forma, World, Entity } from '@sc-voice/nameforma';
import { FormaList, FuzzyNamespace, DBG } from '@sc-voice/nameforma/unstable';
import { Text } from '@sc-voice/tools';
import { createTempWorld } from './cli/helpers.js';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.FORMA_LIST.TEST;

/**
 * Test item class with own property and patch delegation
 */
class TestItem extends Entity {
  static readonly entity = 'test-item';

  color: string;

  constructor(cfg: any = {}) {
    super(cfg);
    this.color = cfg.color || 'blue';
  }

  override patch(cfg: any = {}): void {
    const { color } = cfg;
    if (color !== undefined) {
      this.color = color;
    }
    super.patch(cfg);
  }

  protected override populateNamespace(): void {
    // No child items for test entity
  }
}

describe('FormaList', () => {
  it('FormaList.constructor with parent', () => {
    const msg = 'tfl.ctor.with-parent';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    expect(list.items).toBe(items);
    expect(list.parent?.id).toEqual(world.id);
    expect(list.size).toBe(0);
    tempWorld.cleanup();
    dbg &&
      cc.tag1(msg + UOK, 'constructor with parent creates empty list');
  });

  it('FormaList.constructor without parent', () => {
    const msg = 'tfl.ctor.no-parent';
    const items: TestItem[] = [];
    const list = new FormaList<TestItem>(items, TestItem, {});

    expect(list.items).toBe(items);
    expect(list.parent?.id).toBeUndefined();
    expect(list.size).toBe(0);
    dbg &&
      cc.tag1(
        msg + UOK,
        'constructor without parent creates empty list',
      );
  });

  it('FormaList.addItem with parent', () => {
    const msg = 'tfl.addItem.with-parent';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    // Add items
    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    expect(item1.name).toBe('item1');
    // TestItem IS an entity, so IDs should NOT be related to parent (relationship only for non-entities with entity parents)
    expect(item1.id.isRelated(world.id)).toBe(false);
    expect(list.size).toBe(1);
    expect(items[0]).toBe(item1);
    dbg &&
      cc.tag1(
        msg + UOK,
        'addItem creates item without parent relationship (item is entity)',
      );

    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));
    expect(list.size).toBe(3);
    expect(items.length).toBe(3);
    dbg && cc.tag1(msg + UOK, 'multiple addItem works');

    // Items added in order
    expect(items[0]).toBe(item1);
    expect(items[1]).toBe(item2);
    expect(items[2]).toBe(item3);
    dbg && cc.tag1(msg + UOK, 'items maintain insertion order');
  });

  it('FormaList.addItem without parent', () => {
    const msg = 'tfl.addItem.no-parent';
    const items: TestItem[] = [];
    const list = new FormaList<TestItem>(items, TestItem, {});

    // Add items without parent (no related ID check)
    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    expect(item1.name).toBe('item1');
    expect(list.size).toBe(1);
    expect(items[0]).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'addItem without parent works');

    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    expect(list.size).toBe(2);
    dbg && cc.ok1(msg + UOK, 'multiple addItem without parent works');
  });

  it('FormaList.getItem', () => {
    const msg = 'tfl.getItem';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));

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
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));

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
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'original' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));

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
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));

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
    dbg &&
      cc.tag1(msg + UOK, 'moveItem with before: null inserts at start');
  });

  it('FormaList.moveItem with after anchor', () => {
    const msg = 'tfl.moveItem.after';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));

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
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));

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
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const fakeId = new UUID64().base64;

    // Move non-existent item
    expect(() => list.moveItem(fakeId, {})).toThrow();
    dbg && cc.tag1(msg + UOK, 'moveItem throws for missing item ID');

    // Invalid before anchor
    expect(() =>
      list.moveItem(item1.id.base64, { before: fakeId }),
    ).toThrow();
    dbg && cc.tag1(msg + UOK, 'moveItem throws for invalid before anchor');

    // Invalid after anchor
    expect(() =>
      list.moveItem(item1.id.base64, { after: fakeId }),
    ).toThrow();
    dbg && cc.tag1(msg + UOK, 'moveItem throws for invalid after anchor');
  });

  it('FormaList.size getter', () => {
    const msg = 'tfl.size';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    expect(list.size).toBe(0);
    list.addItem(new TestItem({ name: 'item1' }));
    expect(list.size).toBe(1);
    list.addItem(new TestItem({ name: 'item2' }));
    expect(list.size).toBe(2);
    list.deleteItem(items[0].id.base64);
    expect(list.size).toBe(1);
    dbg && cc.tag1(msg + UOK, 'size getter returns correct count');
  });

  it('FormaList.Symbol.iterator for iterable support', () => {
    const msg = 'tfl.iterator';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));

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
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));

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
    const item3 = list.addItem(new TestItem({ name: 'item3' }));
    list.moveItem(item3.id.base64, { before: item2.id.base64 });
    expect(items[0]).toBe(item3);
    expect(items[1]).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'moveItem mutates wrapped array directly');
  });

  it('FormaList fuzzy ID matching', () => {
    const msg = 'tfl.fuzzy-id';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);
    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));

    // Get by full ID
    expect(list.getItem(item1.id.base64)).toBe(item1);
    dbg && cc.tag(msg + UOK, 'getItem full ID:', item1.id.base64);

    // Get by partial ID (first N chars)
    dbg && cc.tag(msg, 'item1:', item1.id.base64);
    dbg && cc.tag(msg, 'item2:', item2.id.base64);
    let fuzzyId = item2.id.timeId(6);
    expect(list.getItem(fuzzyId)).toBe(item2);

    // Delete by partial ID
    dbg && cc.tag(msg + UOK, 'getItem fuzzyId:', fuzzyId);
    list.deleteItem(fuzzyId);
    expect(list.size).toBe(1);
    expect([...list]).toEqual([item1]);
    dbg && cc.tag(msg + UOK, 'deleteItem fuzzyId:', fuzzyId);
  });

  it('itemListId returns trimmed ID witout common prefix and suffix', () => {
    // Create two IDs that share a common prefix "0Prek" and common suffix "00"
    // We use manual construction of UUID64 to ensure exact patterns.
    // Pattern: [common_prefix][unique_middle][common_suffix]
    const id1 = UUID64.fromString('0PrekDWc007LykSgQ5TutW');
    const id2 = UUID64.fromString('0PrejD4s001_58Qc4M8DdW');

    const items: Forma[] = [];
    const namespace = new FuzzyNamespace();
    const list = new FormaList(items, Forma, { namespace });

    // Add first item - single item case, MIN_LIST_ITEM_ID_LENGTH=5
    // timeId('0PrekDWc00'), result should be 5 chars: 'ekDWc'
    const forma1 = new Forma({
      id: id1,
      name: 'name1',
      summary: 'summary1',
    });
    list.addItem(new TestItem({ id: id1, name: 'name1', summary: 'summary1' }));
    expect(list.itemListId(forma1)).toBe('ekDWc');

    // Add second item - now multiple items, common prefix/suffix
    // timeIds: '0PrekDWc00' and '0PrejD4s00'
    // Common prefix: '0Pre' (4 chars), common suffix: '00' (2 chars)
    // Result: 'kDWc0' and 'jD4s0' (5 chars to meet MIN_LIST_ITEM_ID_LENGTH)
    const forma2 = new Forma({
      id: id2,
      name: 'name2',
      summary: 'summary2',
    });
    list.addItem(new TestItem({ id: id2, name: 'name2', summary: 'summary2' }));
    expect(list.itemListId(forma1)).toBe('kDWc0');
    expect(list.itemListId(forma2)).toBe('jD4s0');

    // Verify getItem works with trimmed IDs
    expect(list.getItem('kDWc0')).toBe(items[0]);
    expect(list.getItem('jD4s0')).toBe(items[1]);
    expect(list.getItem('kdwc0')).toBe(items[0]);
    expect(list.getItem('jd4s0')).toBe(items[1]);
  });

  it('FormaList.patchItem patches subclass and inherited fields', () => {
    const msg = 'tfl.patchItem.fields';
    const items: TestItem[] = [];
    const list = new FormaList<TestItem>(items, TestItem, {});

    const item = list.addItem(new TestItem({ name: 'original', color: 'blue' }));
    const originalId = item.id.base64;

    // Patch subclass field (color)
    list.patchItem(item.id.base64, { color: 'red' });
    expect(item.color).toBe('red');
    expect(item.id.base64).toBe(originalId);
    dbg && cc.tag1(msg + UOK, 'patchItem updates subclass field');

    // Patch inherited field (name)
    list.patchItem(item.id.base64, { name: 'updated' });
    expect(item.name).toBe('updated');
    expect(item.color).toBe('red');
    expect(item.id.base64).toBe(originalId);
    dbg && cc.tag1(msg + UOK, 'patchItem updates inherited field');

    // Patch both together
    list.patchItem(item.id.base64, { color: 'green', name: 'final' });
    expect(item.color).toBe('green');
    expect(item.name).toBe('final');
    expect(item.id.base64).toBe(originalId);
    dbg &&
      cc.tag1(
        msg + UOK,
        'patchItem updates both subclass and inherited fields',
      );
  });

  it('FormaList emits change events', () => {
    const msg = 'tfl.emitter';
    const items: TestItem[] = [];
    const tempWorld = createTempWorld();
    const world = World.fromPath(tempWorld.worldPath);

    // Create mock EventBus
    const events: any[] = [];
    const mockBus = {
      emit: (event: string, payload: any) => {
        events.push(payload);
        return true;
      },
      on: () => {},
    };

    const list = new FormaList<TestItem>(items, TestItem, {
      parent: world,
      emitter: mockBus,
    });

    // Add item
    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('add');
    expect(events[0].item).toBe(item1);
    expect(events[0].entity).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'addItem emits change event');

    // Patch item
    list.patchItem(item1.id.base64, { name: 'updated' });
    expect(events.length).toBe(2);
    expect(events[1].type).toBe('patch');
    expect(events[1].item).toBe(item1);
    expect(events[1].entity).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'patchItem emits change event');

    // Delete item
    list.deleteItem(item1.id.base64);
    expect(events.length).toBe(3);
    expect(events[2].type).toBe('delete');
    expect(events[2].item).toBe(item1);
    expect(events[2].entity).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'deleteItem emits change event');

    // Move item (add another first)
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    events.length = 0; // Reset
    list.moveItem(item2.id.base64, { before: null });
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('move');
    expect(events[0].item).toBe(item2);
    expect(events[0].entity).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'moveItem emits change event');
    tempWorld.cleanup();
  });

  it('FormaList.addItem updates namespace', () => {
    const msg = 'tfl.addItem.namespace';
    const items: TestItem[] = [];
    const namespace = new FuzzyNamespace();
    const list = new FormaList<TestItem>(items, TestItem, {
      keyField: 'id',
      namespace,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    expect(namespace.getForma(item1.id.base64)).toBe(item1);
    dbg && cc.tag1(msg + UOK, 'addItem adds to namespace');

    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    const item3 = list.addItem(new TestItem({ name: 'item3' }));
    expect(namespace.getForma(item2.id.base64)).toBe(item2);
    expect(namespace.getForma(item3.id.base64)).toBe(item3);
    dbg && cc.tag1(msg + UOK, 'multiple addItem updates namespace');
  });

  it('FormaList.deleteItem removes from namespace', () => {
    const msg = 'tfl.deleteItem.namespace';
    const items: TestItem[] = [];
    const namespace = new FuzzyNamespace();
    const list = new FormaList<TestItem>(items, TestItem, {
      keyField: 'id',
      namespace,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const item2 = list.addItem(new TestItem({ name: 'item2' }));
    expect(namespace.getForma(item1.id.base64)).toBe(item1);
    expect(namespace.getForma(item2.id.base64)).toBe(item2);

    list.deleteItem(item1.id.base64);
    expect(namespace.getForma(item1.id.base64)).toBeUndefined();
    expect(namespace.getForma(item2.id.base64)).toBe(item2);
    dbg && cc.tag1(msg + UOK, 'deleteItem removes from namespace');

    list.deleteItem(item2.id.base64);
    expect(namespace.getForma(item2.id.base64)).toBeUndefined();
    dbg && cc.tag1(msg + UOK, 'deleteItem with empty namespace works');
  });

  it('FormaList.patchItem does not affect namespace', () => {
    const msg = 'tfl.patchItem.namespace';
    const items: TestItem[] = [];
    const namespace = new FuzzyNamespace();
    const list = new FormaList<TestItem>(items, TestItem, {
      keyField: 'id',
      namespace,
    });

    const item1 = list.addItem(new TestItem({ name: 'item1' }));
    const formaInNamespace = namespace.getForma(item1.id.base64);

    list.patchItem(item1.id.base64, { name: 'updated' });
    expect(namespace.getForma(item1.id.base64)).toBe(formaInNamespace);
    expect(item1.name).toBe('updated');
    dbg && cc.tag1(msg + UOK, 'patchItem does not affect namespace');
  });
});
