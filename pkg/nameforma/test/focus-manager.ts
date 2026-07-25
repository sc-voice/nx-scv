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
import { FileRepository, World, Task } from '@sc-voice/nameforma';
import { FocusManager } from '@sc-voice/nameforma/unstable';

describe('FocusManager', () => {
  describe('FocusManager.focus()', () => {
    it('should push id onto focus stack', () => {
      const fm = new FocusManager();
      const entity = new Task({ name: 'test' });

      fm.focus(entity.id);

      expect(fm.peek()?.base64).toBe(entity.id.base64);
    });
  });

  describe('FocusManager.unfocus()', () => {
    it('should remove specified id and return it', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

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
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });
      const e3 = new Task({ name: 'e3' });

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
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focus(e1.id);
      expect(fm.unfocus(e2.id)).toBeNull();
      expect(fm.size).toBe(1);
    });
  });

  describe('FocusManager.focusOrder()', () => {
    it('should return correct order for focused entities and MAX_SAFE_INTEGER for unfocused', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });
      const e3 = new Task({ name: 'e3' });
      const e4 = new Task({ name: 'e4' });

      fm.focus(e1.id);
      fm.focus(e2.id);
      fm.focus(e3.id);

      expect(fm.focusOrder(e3.id)).toBe(0);
      expect(fm.focusOrder(e2.id)).toBe(1);
      expect(fm.focusOrder(e1.id)).toBe(2);
      expect(fm.focusOrder(e4.id)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('FocusManager.isFocused()', () => {
    it('should return true for focused entities', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focus(e1.id);
      fm.focus(e2.id);

      expect(fm.isFocused(e1)).toBe(true);
      expect(fm.isFocused(e2)).toBe(true);
    });

    it('should return false for unfocused entities', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focus(e1.id);

      expect(fm.isFocused(e2)).toBe(false);
    });

    it('should return false on empty stack', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });

      expect(fm.isFocused(e1)).toBe(false);
    });
  });

  describe('FocusManager.focusLocal()', () => {
    it('should push id onto local focus stack', () => {
      const fm = new FocusManager();
      const entity = new Task({ name: 'test' });

      fm.focusLocal(entity.id);

      expect(fm.peekLocal()?.base64).toBe(entity.id.base64);
    });

    it('should maintain stack order (most recent first)', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });
      const e3 = new Task({ name: 'e3' });

      fm.focusLocal(e1.id);
      fm.focusLocal(e2.id);
      fm.focusLocal(e3.id);

      expect(fm.peekLocal()?.base64).toBe(e3.id.base64);
    });
  });

  describe('FocusManager.unfocusLocal()', () => {
    it('should remove specified id and return it', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focusLocal(e1.id);
      fm.focusLocal(e2.id);

      const removed = fm.unfocusLocal(e1.id);
      expect(removed?.base64).toBe(e1.id.base64);
      expect(fm.peekLocal()?.base64).toBe(e2.id.base64);
    });

    it('should return null for non-existent id', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focusLocal(e1.id);
      expect(fm.unfocusLocal(e2.id)).toBeNull();
      expect(fm.peekLocal()?.base64).toBe(e1.id.base64);
    });

    it('should return null on empty stack', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });

      expect(fm.unfocusLocal(e1.id)).toBeNull();
    });

    it('should remove middle element from stack', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });
      const e3 = new Task({ name: 'e3' });

      fm.focusLocal(e1.id);
      fm.focusLocal(e2.id);
      fm.focusLocal(e3.id);

      fm.unfocusLocal(e2.id);
      expect(fm.peekLocal()?.base64).toBe(e3.id.base64);
    });
  });

  describe('FocusManager.peekLocal()', () => {
    it('should return most recent id in local focus stack', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focusLocal(e1.id);
      fm.focusLocal(e2.id);

      expect(fm.peekLocal()?.base64).toBe(e2.id.base64);
    });

    it('should return null on empty stack', () => {
      const fm = new FocusManager();
      expect(fm.peekLocal()).toBeNull();
    });
  });

  describe('FocusManager local vs RGA64 isolation', () => {
    it('should keep local focus separate from RGA64 focus', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focus(e1.id);
      fm.focusLocal(e2.id);

      expect(fm.peek()?.base64).toBe(e1.id.base64);
      expect(fm.peekLocal()?.base64).toBe(e2.id.base64);
    });

    it('should not affect RGA64 focus when clearing local focus', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });

      fm.focus(e1.id);
      fm.focusLocal(e2.id);
      fm.unfocusLocal(e2.id);

      expect(fm.peek()?.base64).toBe(e1.id.base64);
      expect(fm.peekLocal()).toBeNull();
      expect(fm.size).toBe(1);
    });

    it('should not affect local focus when manipulating RGA64 focus', () => {
      const fm = new FocusManager();
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });
      const e3 = new Task({ name: 'e3' });

      fm.focusLocal(e1.id);
      fm.focus(e2.id);
      fm.focus(e3.id);
      fm.unfocus(e3.id);

      expect(fm.peekLocal()?.base64).toBe(e1.id.base64);
      expect(fm.peek()?.base64).toBe(e2.id.base64);
      expect(fm.size).toBe(1);
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
      const e1 = new Task({ name: 'e1' });
      const e2 = new Task({ name: 'e2' });
      const e3 = new Task({ name: 'e3' });

      fm.focus(e1.id);
      fm.focus(e2.id);
      fm.focus(e3.id);

      const json = fm.toJSON();
      const restored = FocusManager.fromJSON(json);

      const originalIds = fm.ids().map((id) => id.base64);
      const restoredIds = restored.ids().map((id) => id.base64);

      expect(restoredIds).toEqual(originalIds);
    });
  });
});

describe('FocusManager world', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = await FileRepository.worldFromPath(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('focusedForma', () => {
    it('should return most recently focused entity of type', async () => {
      const e1 = await world.upsertOne(Task, { name: 'e1' });

      world.focusManager.focus(e1.id);

      const focused = await world.focusedForma('task');
      expect(focused).not.toBeNull();
      expect(focused?.id.base64).toBe(e1.id.base64);
      expect((focused?.constructor as any).collection).toBe('task');
    });

    it('should return null if type not in stack', async () => {
      const focused = await world.focusedForma('nonexistent');
      expect(focused).toBeNull();
    });

    it('should return first (most recent) when multiple of same type', async () => {
      const e1 = await world.upsertOne(Task, { name: 'e1' });
      const e2 = await world.upsertOne(Task, { name: 'e2' });

      world.focusManager.focus(e1.id);
      world.focusManager.focus(e2.id);

      const focused = await world.focusedForma('task');
      expect(focused?.id.base64).toBe(e2.id.base64);
    });
  });

  describe('World serialization', () => {
    it('should persist focus state on save/load cycle', async () => {
      const e1 = await world.upsertOne(Task, { name: 'e1' });
      const e2 = await world.upsertOne(Task, { name: 'e2' });

      world.focusManager.focus(e1.id);
      world.focusManager.focus(e2.id);
      await world.save();

      const world2 = await FileRepository.worldFromPath(worldPath);
      world2.registerEntity(Task);

      const ids = world2.focusManager.ids().map((id) => id.base64);
      expect(ids).toEqual([e2.id.base64, e1.id.base64]);
    });

    it('should restore focus ids as UUID64 objects', async () => {
      const entity = await world.upsertOne(Task, { name: 'test' });

      world.focusManager.focus(entity.id);
      await world.save();

      const world2 = await FileRepository.worldFromPath(worldPath);
      const ids = world2.focusManager.ids();

      expect(ids.length).toBe(1);
      expect(typeof ids[0].base64).toBe('string');
      expect(ids[0].base64).toBe(entity.id.base64);
    });
  });

  describe('delete() removes from focusManager', () => {
    it('should remove focused entity from stack when deleted', async () => {
      const entity = await world.upsertOne(Task, { name: 'test' });

      world.focusManager.focus(entity.id);
      expect(world.focusManager.size).toBe(1);

      await world.delete('task', entity.id.base64);

      expect(world.focusManager.size).toBe(0);
    });

    it('should remove only matching entity from multi-item stack', async () => {
      const e1 = await world.upsertOne(Task, { name: 'e1' });
      const e2 = await world.upsertOne(Task, { name: 'e2' });
      const e3 = await world.upsertOne(Task, { name: 'e3' });

      world.focusManager.focus(e1.id);
      world.focusManager.focus(e2.id);
      world.focusManager.focus(e3.id);

      expect(world.focusManager.size).toBe(3);

      await world.delete('task', e2.id.base64);

      expect(world.focusManager.size).toBe(2);
      const ids = world.focusManager.ids().map((id) => id.base64);
      expect(ids[0]).toBe(e3.id.base64);
      expect(ids[1]).toBe(e1.id.base64);
      expect(ids).not.toContain(e2.id.base64);
    });

    it('should be no-op if entity not in focus stack', async () => {
      const e1 = await world.upsertOne(Task, { name: 'e1' });
      const e2 = await world.upsertOne(Task, { name: 'e2' });

      world.focusManager.focus(e1.id);
      await expect(
        world.delete('task', e2.id.base64),
      ).resolves.not.toThrow();
      expect(world.focusManager.size).toBe(1);
    });
  });

  describe('sort integration', () => {
    it('should support sort pattern: focusOrder tiebreak with id lexicographic', async () => {
      const e1 = await world.upsertOne(Task, { name: 'e1' });
      const e2 = await world.upsertOne(Task, { name: 'e2' });
      const e3 = await world.upsertOne(Task, { name: 'e3' });

      world.focusManager.focus(e2.id);
      world.focusManager.focus(e1.id);

      const entities = [e3, e2, e1];
      const sorted = entities.sort(
        (a, b) =>
          world.focusManager.focusOrder(a.id) -
            world.focusManager.focusOrder(b.id) ||
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
