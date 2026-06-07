import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { World } from '../src/world.js';
import { Forma } from '../src/forma.js';
import { Entity } from '../src/entity.js';
import { FocusManager } from '../src/focus-manager.js';

// Mock entity class for testing - extends Entity
class MockEntity extends Entity {
  name: string = '';

  constructor(cfg: any = {}) {
    super({ id: cfg.id });
    this.patch(cfg);
  }

  static entity = 'mock';
  static override get avroSchema() {
    return {
      name: 'MockEntity',
      namespace: 'test',
      type: 'record',
      fields: [
        ...Forma.avroSchema.fields,
        { name: 'name', type: 'string' },
      ],
    };
  }

  static fromJson(data: any): MockEntity {
    return new MockEntity(data);
  }

  protected override populateNamespace(): void {
    // No child items for mock entity
  }
}

describe('FocusManager', () => {
  describe('FocusManager.focus()', () => {
    it('should push id onto focus stack', () => {
      const fm = new FocusManager();
      const entity = new MockEntity({ name: 'test' });

      fm.focus(entity.id);

      expect(fm.peek()?.base64).toBe(entity.id.base64);
    });
  });

  describe('FocusManager.unfocus()', () => {
    it('should remove specified id and return it', () => {
      const fm = new FocusManager();
      const e1 = new MockEntity({ name: 'e1' });
      const e2 = new MockEntity({ name: 'e2' });

      fm.focus(e1.id);
      fm.focus(e2.id);
      expect(fm.size).toBe(2);

      const removed = fm.unfocus(e1.id);
      expect(removed?.base64).toBe(e1.id.base64);
      expect(fm.size).toBe(1);
      expect(fm.peek()?.base64).toBe(e2.id.base64);
    });

    it('should remove current focus when no id provided', () => {
      const fm = new FocusManager();
      const e1 = new MockEntity({ name: 'e1' });
      const e2 = new MockEntity({ name: 'e2' });
      const e3 = new MockEntity({ name: 'e3' });

      fm.focus(e1.id);
      fm.focus(e2.id);
      fm.focus(e3.id);

      const removed = fm.unfocus();
      expect(removed?.base64).toBe(e3.id.base64);
      expect(fm.size).toBe(2);
    });

    it('should return null on empty stack', () => {
      const fm = new FocusManager();
      expect(fm.unfocus()).toBeNull();
    });

    it('should return null for non-existent id', () => {
      const fm = new FocusManager();
      const e1 = new MockEntity({ name: 'e1' });
      const e2 = new MockEntity({ name: 'e2' });

      fm.focus(e1.id);
      expect(fm.unfocus(e2.id)).toBeNull();
      expect(fm.size).toBe(1);
    });
  });

  describe('FocusManager.focusOrder()', () => {
    it('should return correct order for focused entities and MAX_SAFE_INTEGER for unfocused', () => {
      const fm = new FocusManager();
      const e1 = new MockEntity({ name: 'e1' });
      const e2 = new MockEntity({ name: 'e2' });
      const e3 = new MockEntity({ name: 'e3' });
      const e4 = new MockEntity({ name: 'e4' });

      fm.focus(e1.id);
      fm.focus(e2.id);
      fm.focus(e3.id);

      expect(fm.focusOrder(e3.id)).toBe(0);
      expect(fm.focusOrder(e2.id)).toBe(1);
      expect(fm.focusOrder(e1.id)).toBe(2);
      expect(fm.focusOrder(e4.id)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
  describe('FocusManager serialization', () => {
    it('should serialize empty focusManager to JSON', () => {
      const fm = new FocusManager();
      const restored = FocusManager.fromJSON(fm.toJSON());
      expect(restored.size).toBe(0);
    });

    it('should round-trip focusManager through serialization', () => {
      const fm = new FocusManager();
      const e1 = new MockEntity({ name: 'e1' });
      const e2 = new MockEntity({ name: 'e2' });
      const e3 = new MockEntity({ name: 'e3' });

      fm.focus(e1.id);
      fm.focus(e2.id);
      fm.focus(e3.id);

      const json = fm.toJSON();
      const restored = FocusManager.fromJSON(json);

      const originalIds = fm.ids().map(id => id.base64);
      const restoredIds = restored.ids().map(id => id.base64);

      expect(restoredIds).toEqual(originalIds);
    });
  });
})

describe('FocusManager world', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = World.fromPath(worldPath);
    world.registerEntity(MockEntity);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });



  describe('focusedForma', () => {
    it('should return most recently focused entity of type', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });

      world.focusManager.focus(e1.id);

      const focused = world.focusedForma('mock');
      expect(focused).not.toBeNull();
      expect(focused?.id.base64).toBe(e1.id.base64);
      expect((focused?.constructor as any).entity).toBe('mock');
    });

    it('should return null if type not in stack', () => {
      const focused = world.focusedForma('nonexistent');
      expect(focused).toBeNull();
    });

    it('should return first (most recent) when multiple of same type', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusManager.focus(e1.id);
      world.focusManager.focus(e2.id);

      const focused = world.focusedForma('mock');
      expect(focused?.id.base64).toBe(e2.id.base64);
    });
  });

  describe('World serialization', () => {
    it('should persist focus state on save/load cycle', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusManager.focus(e1.id);
      world.focusManager.focus(e2.id);
      world.save();

      const world2 = World.fromPath(worldPath);
      world2.registerEntity(MockEntity);

      const ids = world2.focusManager.ids().map(id => id.base64);
      expect(ids).toEqual([e2.id.base64, e1.id.base64]);
    });


    it('should restore focus ids as UUID64 objects', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusManager.focus(entity.id);
      world.save();

      const world2 = World.fromPath(worldPath);
      const ids = world2.focusManager.ids();

      expect(ids.length).toBe(1);
      expect(typeof ids[0].base64).toBe('string');
      expect(ids[0].base64).toBe(entity.id.base64);
    });
  });

  describe('delete() removes from focusManager', () => {
    it('should remove focused entity from stack when deleted', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusManager.focus(entity.id);
      expect(world.focusManager.size).toBe(1);

      world.delete('mock', entity.id.base64);

      expect(world.focusManager.size).toBe(0);
    });

    it('should remove only matching entity from multi-item stack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusManager.focus(e1.id);
      world.focusManager.focus(e2.id);
      world.focusManager.focus(e3.id);

      expect(world.focusManager.size).toBe(3);

      world.delete('mock', e2.id.base64);

      expect(world.focusManager.size).toBe(2);
      const ids = world.focusManager.ids().map(id => id.base64);
      expect(ids[0]).toBe(e3.id.base64);
      expect(ids[1]).toBe(e1.id.base64);
      expect(ids).not.toContain(e2.id.base64);
    });

    it('should be no-op if entity not in focus stack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusManager.focus(e1.id);
      expect(() => world.delete('mock', e2.id.base64)).not.toThrow();
      expect(world.focusManager.size).toBe(1);
    });
  });

  describe('sort integration', () => {
    it('should support sort pattern: focusOrder tiebreak with id lexicographic', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusManager.focus(e2.id);
      world.focusManager.focus(e1.id);

      const entities = [e3, e2, e1];
      const sorted = entities.sort(
        (a, b) =>
          world.focusManager.focusOrder(a.id) - world.focusManager.focusOrder(b.id) ||
          a.id.base64.localeCompare(b.id.base64),
      );

      // e1 is most focused (index 0)
      expect(sorted[0].id.base64).toBe(e1.id.base64);
      // e2 is next (index 1)
      expect(sorted[1].id.base64).toBe(e2.id.base64);
      // e3 is not focused, so by id order
      expect(sorted[2].id.base64).toBe(e3.id.base64);
    });
  });

});

