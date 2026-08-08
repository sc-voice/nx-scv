import { describe, it, expect, beforeEach } from '@sc-voice/vitest';
import {
  Entity,
  EntityScope,
  Schema,
  UUID64,
  ArrayEntityCursor,
} from '@sc-voice/nameforma';

class TestEntity extends Entity {
  static collection = 'test-entity';
}

describe('EntityScope', () => {
  let entities: TestEntity[];
  let cursor: ArrayEntityCursor<TestEntity>;

  beforeEach(() => {
    entities = [
      new TestEntity({ name: 'e1', status: 'active' }),
      new TestEntity({ name: 'e2', status: 'inactive' }),
      new TestEntity({ name: 'e3', status: 'active' }),
    ];
    cursor = new ArrayEntityCursor(entities);
  });

  describe('fromEntityCursor', () => {
    it('drains entities from cursor', async () => {
      const scope = await EntityScope.fromEntityCursor(cursor, 10);
      expect(scope.length).toBe(3);
      expect(scope.entities).toEqual(entities);
    });

    it('respects limit parameter', async () => {
      const scope = await EntityScope.fromEntityCursor(cursor, 2);
      expect(scope.length).toBe(2);
      expect((scope.entities[0] as any).name).toBe('e1');
      expect((scope.entities[1] as any).name).toBe('e2');
    });

    it('handles zero limit', async () => {
      const scope = await EntityScope.fromEntityCursor(cursor, 0);
      expect(scope.length).toBe(0);
      expect(scope.entities).toEqual([]);
    });

    it('applies projection to entities', async () => {
      const projection: Record<string, 0 | 1> = { id: 1, name: 1 };
      const scope = await EntityScope.fromEntityCursor(
        cursor,
        10,
        projection,
      );
      expect(scope.projection).toEqual(projection);
      expect(scope.projected.length).toBe(3);
      expect(scope.projected[0]).toHaveProperty('id');
      expect(scope.projected[0]).toHaveProperty('name');
      expect(scope.projected[0]).not.toHaveProperty('status');
    });

    it('handles empty projection', async () => {
      const scope = await EntityScope.fromEntityCursor(cursor, 10, {});
      expect(scope.projection).toEqual({});
      expect(scope.projected).toEqual(entities);
    });
  });

  describe('Navigation', () => {
    let scope: EntityScope;

    beforeEach(async () => {
      scope = await EntityScope.fromEntityCursor(cursor, 10);
    });

    it('starts at index 0', () => {
      expect(scope.index).toBe(0);
    });

    it('next() increments index', () => {
      scope.next();
      expect(scope.index).toBe(1);
      scope.next();
      expect(scope.index).toBe(2);
    });

    it('next() stops at last index', () => {
      scope.next();
      scope.next();
      scope.next();
      expect(scope.index).toBe(2);
    });

    it('prev() decrements index', () => {
      scope.next();
      scope.next();
      scope.prev();
      expect(scope.index).toBe(1);
    });

    it('prev() stops at index 0', () => {
      scope.prev();
      expect(scope.index).toBe(0);
    });

    it('moveTo() sets index with bounds', () => {
      scope.moveTo(5);
      expect(scope.index).toBe(2); // clamped to length-1

      scope.moveTo(1);
      expect(scope.index).toBe(1);

      scope.moveTo(-5);
      expect(scope.index).toBe(0); // clamped to 0
    });
  });

  describe('Index access', () => {
    let scope: EntityScope;

    beforeEach(async () => {
      scope = await EntityScope.fromEntityCursor(cursor, 10);
    });

    it('at() returns entity at current index by default', () => {
      const entity = scope.at();
      expect(entity).toEqual(entities[0]);
    });

    it('at(i) returns entity at specified index', () => {
      const entity = scope.at(2);
      expect(entity).toEqual(entities[2]);
    });

    it('at() returns null for negative index', () => {
      const entity = scope.at(-1);
      expect(entity).toBeNull();
    });

    it('at() returns null for out-of-bounds index', () => {
      const entity = scope.at(10);
      expect(entity).toBeNull();
    });

    it('at() reflects navigation changes', () => {
      expect(scope.at()).toEqual(entities[0]);
      scope.next();
      expect(scope.at()).toEqual(entities[1]);
      scope.prev();
      expect(scope.at()).toEqual(entities[0]);
    });
  });

  describe('Edge cases', () => {
    it('handles single entity', async () => {
      const singleCursor = new ArrayEntityCursor([entities[0]]);
      const scope = await EntityScope.fromEntityCursor(singleCursor, 10);
      expect(scope.length).toBe(1);
      expect(scope.index).toBe(0);
      scope.next();
      expect(scope.index).toBe(0); // stays at 0
    });

    it('handles empty entities', async () => {
      const emptyCursor = new ArrayEntityCursor<TestEntity>([]);
      const scope = await EntityScope.fromEntityCursor(emptyCursor, 10);
      expect(scope.length).toBe(0);
      expect(scope.at()).toBeNull();
      scope.next();
      expect(scope.index).toBe(0);
    });
  });
});
