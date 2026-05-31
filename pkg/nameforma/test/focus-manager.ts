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

  describe('focusOrder', () => {
    it('should return MAX_SAFE_INTEGER for unfocused entity', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      expect(world.focusOrder(entity)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should return 0 for most recently focused entity', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);
      expect(world.focusOrder(entity)).toBe(0);
    });

    it('should return correct index for stacked entities', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusForma(e1);
      world.focusForma(e2);
      world.focusForma(e3);

      expect(world.focusOrder(e3)).toBe(0);
      expect(world.focusOrder(e2)).toBe(1);
      expect(world.focusOrder(e1)).toBe(2);
    });
  });

  describe('focusForma', () => {
    it('should push entity to top of stack', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);

      expect(world.focusStack.size).toBe(1);
      const focusItems = Array.from(world.focusStack);
      expect(focusItems[0].formaId.base64).toBe(entity.id.base64);
      expect(focusItems[0].formaType).toBe('mock');
    });

    it('should move existing entity to top', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusForma(e1);
      world.focusForma(e2);
      world.focusForma(e1); // Move e1 to top

      expect(world.focusStack.size).toBe(2);
      const focusItems = Array.from(world.focusStack);
      expect(focusItems[0].formaId.base64).toBe(e1.id.base64);
      expect(focusItems[1].formaId.base64).toBe(e2.id.base64);
    });

    it('should derive formaType from entity static property', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);

      const focusItems = Array.from(world.focusStack);
      expect(focusItems[0].formaType).toBe('mock');
    });
  });

  describe('unfocusForma', () => {
    it('should remove entity from stack', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);
      expect(world.focusStack.size).toBe(1);

      world.unfocusForma(entity);
      expect(world.focusStack.size).toBe(0);
    });

    it('should be no-op if entity not in stack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusForma(e1);
      expect(() => world.unfocusForma(e2)).not.toThrow();
      expect(world.focusStack.size).toBe(1);
      const focusItems = Array.from(world.focusStack);
      expect(focusItems[0].formaId.base64).toBe(e1.id.base64);
    });

    it('should remove only matching entity from multi-item stack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusForma(e1);
      world.focusForma(e2);
      world.focusForma(e3);

      world.unfocusForma(e2);

      expect(world.focusStack.size).toBe(2);
      const focusItems = Array.from(world.focusStack);
      expect(focusItems[0].formaId.base64).toBe(e3.id.base64);
      expect(focusItems[1].formaId.base64).toBe(e1.id.base64);
    });
  });

  describe('focusedForma', () => {
    it('should return most recently focused entity of type', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });

      world.focusForma(e1);

      const focused = world.focusedForma('mock');
      expect(focused).not.toBeNull();
      expect(focused?.formaId.base64).toBe(e1.id.base64);
      expect(focused?.formaType).toBe('mock');
    });

    it('should return null if type not in stack', () => {
      const focused = world.focusedForma('nonexistent');
      expect(focused).toBeNull();
    });

    it('should return first (most recent) when multiple of same type', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusForma(e1);
      world.focusForma(e2);

      const focused = world.focusedForma('mock');
      expect(focused?.formaId.base64).toBe(e2.id.base64);
    });
  });

  describe('focusStack getter', () => {
    it('should return defensive copy of stack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });

      world.focusForma(e1);
      const stack1 = world.focusStack;
      const stack2 = world.focusStack;

      expect(stack1).not.toBe(stack2); // Different FormaLists
      const items1 = Array.from(stack1);
      const items2 = Array.from(stack2);
      expect(items1[0].id.base64).toBe(items2[0].id.base64); // Same content
    });

    it('should return empty list initially', () => {
      expect(world.focusStack.size).toBe(0);
    });
  });

  describe('focusStack serialization', () => {
    it('should persist focusStack on save/load cycle', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusForma(e1);
      world.focusForma(e2);

      world.save();

      // Load into new world instance
      const world2 = World.fromPath(worldPath);
      world2.registerEntity(MockEntity);

      expect(world2.focusStack.size).toBe(2);
      const focusItems = Array.from(world2.focusStack);
      expect(focusItems[0].formaId.base64).toBe(e2.id.base64);
      expect(focusItems[0].formaType).toBe('mock');
      expect(focusItems[1].formaId.base64).toBe(e1.id.base64);
    });

    it('should serialize focusStack entries with targetId as string', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);
      world.save();

      const worldFile = path.join(worldPath, 'world.json');
      const data = fs.readFileSync(worldFile, 'utf8');
      const json = JSON.parse(data);

      expect(json.focusStack).toBeDefined();
      expect(Array.isArray(json.focusStack)).toBe(true);
      expect(json.focusStack[0].formaId).toBe(entity.id.base64);
      expect(json.focusStack[0].formaType).toBe('mock');
      expect(json.focusStack[0].name).toBe('test');
    });

    it('should restore focusStack with UUID64 id and targetId objects', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);
      world.save();

      const world2 = World.fromPath(worldPath);
      const stack = Array.from(world2.focusStack);

      expect(stack[0].id).toBeDefined();
      expect(typeof stack[0].id.base64).toBe('string');
      expect(stack[0].formaId).toBeDefined();
      expect(typeof stack[0].formaId.base64).toBe('string');
    });
  });

  describe('delete() removes from focusStack', () => {
    it('should remove focused entity from stack when deleted', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);
      expect(world.focusStack.size).toBe(1);

      world.delete('mock', entity.id.base64);

      expect(world.focusStack.size).toBe(0);
    });

    it('should remove only matching entity from multi-item stack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusForma(e1);
      world.focusForma(e2);
      world.focusForma(e3);

      expect(world.focusStack.size).toBe(3);

      world.delete('mock', e2.id.base64);

      expect(world.focusStack.size).toBe(2);
      const focusItems = Array.from(world.focusStack);
      expect(focusItems[0].formaId.base64).toBe(e3.id.base64);
      expect(focusItems[1].formaId.base64).toBe(e1.id.base64);
      expect(
        focusItems.some((f) => f.formaId.base64 === e2.id.base64),
      ).toBe(false);
    });

    it('should be no-op if entity not in focusStack', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusForma(e1);
      expect(() => world.delete('mock', e2.id.base64)).not.toThrow();
      expect(world.focusStack.size).toBe(1);
    });
  });

  describe('sort integration', () => {
    it('should support sort pattern: focusOrder tiebreak with id lexicographic', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusForma(e2);
      world.focusForma(e1);

      const entities = [e3, e2, e1];
      const sorted = entities.sort(
        (a, b) =>
          world.focusOrder(a) - world.focusOrder(b) ||
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

  describe('validate()', () => {
    it('removes stale entries from focusStack', () => {
      const worldPath = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
      try {
        const world = World.fromPath(worldPath);
        world.registerEntity(MockEntity);

        // Create 3 mock entities and focus all 3
        const m1 = world.entityList(MockEntity).addItem({ name: 'mock1' });
        const m2 = world.entityList(MockEntity).addItem({ name: 'mock2' });
        const m3 = world.entityList(MockEntity).addItem({ name: 'mock3' });

        world.focusForma(m1);
        world.focusForma(m2);
        world.focusForma(m3);

        expect(Array.from(world.focusStack).length).toBe(3);

        // Delete m2's backing file directly (simulating stale entry)
        const m2FilePath = path.join(
          worldPath,
          'mock',
          `${m2.id.base64}.json`,
        );
        fs.unlinkSync(m2FilePath);

        // Call validate and check returns false (entries were removed)
        expect(world.validate()).toBe(false);
        expect(Array.from(world.focusStack).length).toBe(2);

        // Call validate again — should return true (no more stale entries)
        expect(world.validate()).toBe(true);
      } finally {
        fs.rmSync(worldPath, { recursive: true, force: true });
      }
    });

    it('returns true when focusStack is empty', () => {
      const worldPath = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
      try {
        const world = World.fromPath(worldPath);
        expect(world.validate()).toBe(true);
      } finally {
        fs.rmSync(worldPath, { recursive: true, force: true });
      }
    });

    it('returns true when all entries are valid', () => {
      const worldPath = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
      try {
        const world = World.fromPath(worldPath);
        world.registerEntity(MockEntity);

        const m1 = world.entityList(MockEntity).addItem({ name: 'mock1' });
        world.focusForma(m1);

        expect(world.validate()).toBe(true);
      } finally {
        fs.rmSync(worldPath, { recursive: true, force: true });
      }
    });

    it('removes orphaned rgaFocusStack nodes when focusStack entry is stale', () => {
      const worldPath = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
      try {
        const world = World.fromPath(worldPath);
        world.registerEntity(MockEntity);

        const m1 = world.entityList(MockEntity).addItem({ name: 'mock1' });
        const m2 = world.entityList(MockEntity).addItem({ name: 'mock2' });
        world.focusForma(m1);
        world.focusForma(m2);

        let nodesBefore = world.rgaFocusStack.nodes(false);
        expect(nodesBefore[0].value.base64).toEqual(m1.id.base64)
        expect(nodesBefore[0].deleted).toEqual(false);
        expect(nodesBefore[1].value.base64).toEqual(m2.id.base64)
        expect(nodesBefore[1].deleted).toEqual(false);
        expect(nodesBefore.length).toBe(2);

        fs.unlinkSync(path.join(worldPath, 'mock', `${m2.id.base64}.json`));

        expect(world.validate()).toBe(false);

        let nodesAfter = world.rgaFocusStack.nodes(false);
        console.log('nodesAfter', nodesAfter.map(n=>n.value.timeId()));
        expect(nodesAfter[0].value.base64).toEqual(m1.id.base64);
        expect(nodesAfter[0].deleted).toEqual(false);
        expect(nodesAfter[1].value.base64).toEqual(m2.id.base64);
        expect(nodesAfter[1].deleted).toEqual(true);
        expect(nodesAfter.length).toBe(2);
        expect(world.rgaFocusStack.nodes().length).toBe(1);
        expect(world.rgaFocusStack.nodes()[0].value.toString()).toBe(m1.id.base64);
      } finally {
        fs.rmSync(worldPath, { recursive: true, force: true });
      }
    });

    it('cleans stale entries on toJSON() serialization', () => {
      const worldPath = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-'));
      try {
        const world = World.fromPath(worldPath);
        world.registerEntity(MockEntity);

        const m1 = world.entityList(MockEntity).addItem({ name: 'mock1' });
        const m2 = world.entityList(MockEntity).addItem({ name: 'mock2' });

        world.focusForma(m1);
        world.focusForma(m2);

        // Delete m1's file
        const m1FilePath = path.join(
          worldPath,
          'mock',
          `${m1.id.base64}.json`,
        );
        fs.unlinkSync(m1FilePath);

        // Serialize — should clean stale entries
        const json = world.toJSON();
        expect(json.focusStack.length).toBe(1);
        expect(json.focusStack[0].formaId).toBe(m2.id.toString());
      } finally {
        fs.rmSync(worldPath, { recursive: true, force: true });
      }
    });
  });

  describe('focusStack ↔ rgaFocusStack synchronization', () => {
    const getRgaFocusIds = (world: World): string[] => {
      const values = world.rgaFocusStack.values();
      return values.map((v: any) => v.base64);
    };

    const getFocusStackIds = (world: World): string[] => {
      const stack = Array.from(world.focusStack);
      return stack.map(f => f.formaId.base64);
    };

    it('should synchronize on focusForma', () => {
      const list = world.entityList(MockEntity);
      const entity = list.addItem({ name: 'test' });

      world.focusForma(entity);

      const focusIds = getFocusStackIds(world);
      const rgaIds = getRgaFocusIds(world);
      expect(focusIds).toEqual(rgaIds);
      expect(focusIds).toContain(entity.id.base64);
    });

    it('should synchronize on unfocusForma', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      world.focusForma(e1);
      world.focusForma(e2);
      world.unfocusForma(e1);

      const focusIds = getFocusStackIds(world);
      const rgaIds = getRgaFocusIds(world);
      expect(focusIds).toEqual(rgaIds);
      expect(focusIds).toContain(e2.id.base64);
      expect(focusIds).not.toContain(e1.id.base64);
    });

    it('should synchronize on moving entity to top (re-focus)', () => {
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      world.focusForma(e1);
      world.focusForma(e2);
      world.focusForma(e3);
      world.focusForma(e1); // Move e1 to top

      const focusIds = getFocusStackIds(world);
      const rgaIds = getRgaFocusIds(world);
      expect(focusIds).toEqual(rgaIds);
      expect(focusIds[0]).toBe(e1.id.base64);
      expect(focusIds.length).toBe(3);
    });

    it('should remain synchronized after multiple operations', () => {
      const list = world.entityList(MockEntity);
      const entities = Array.from({ length: 5 }, (_, i) =>
        list.addItem({ name: `e${i}` })
      );

      // Perform various operations
      entities.forEach((e, i) => world.focusForma(e));

      const focusIds = getFocusStackIds(world);
      const rgaIds = getRgaFocusIds(world);
      expect(focusIds).toEqual(rgaIds);
    });
  });

  describe('FocusManager serialization', () => {
    it('should serialize empty focusManager to JSON', () => {
      const fm = new FocusManager();
      const json = fm.toJSON();

      expect(json).toBeDefined();
      expect(json.focusStack).toBeDefined();
      expect(Array.isArray(json.focusStack)).toBe(true);
      expect(json.focusStack.length).toBe(0);
      expect(json.rgaFocusStack).toBeDefined();
    });

    it('should serialize focusManager with items to JSON', () => {
      const fm = new FocusManager();
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      fm.focusForma(e1);
      fm.focusForma(e2);

      const json = fm.toJSON();

      expect(json.focusStack.length).toBe(2);
      expect(json.focusStack[0].formaId).toBe(e1.id.base64);
      expect(json.focusStack[1].formaId).toBe(e2.id.base64);
      expect(json.focusStack[1].formaType).toBe('mock');
    });

    it('should deserialize JSON to focusManager', () => {
      const fm = new FocusManager();
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });

      fm.focusForma(e1);
      fm.focusForma(e2);

      const json = fm.toJSON();
      const restored = FocusManager.fromJSON(json);

      expect(restored).toBeDefined();
      expect(Array.from(restored.focusStack).length).toBe(2);
      const items = Array.from(restored.focusStack);
      expect(items[0].formaId.base64).toBe(e1.id.base64);
      expect(items[1].formaId.base64).toBe(e2.id.base64);
    });

    it('should round-trip focusManager through serialization', () => {
      const fm = new FocusManager();
      const list = world.entityList(MockEntity);
      const e1 = list.addItem({ name: 'e1' });
      const e2 = list.addItem({ name: 'e2' });
      const e3 = list.addItem({ name: 'e3' });

      fm.focusForma(e1);
      fm.focusForma(e2);
      fm.focusForma(e3);

      const json = fm.toJSON();
      const restored = FocusManager.fromJSON(json);

      const originalIds = Array.from(fm.focusStack).map(f => f.formaId.base64);
      const restoredIds = Array.from(restored.focusStack).map(f => f.formaId.base64);

      expect(restoredIds).toEqual(originalIds);
    });
  });
});
