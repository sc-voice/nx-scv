import { describe, it, expect, beforeEach } from '@sc-voice/vitest';
import { EntityRegistry } from '../src/entity-registry.js';
import { IEntity } from '../src/entity.js';

describe('EntityRegistry', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  const mockEntity = (collection: string): IEntity =>
    ({
      collection,
      avroSchema: {},
      fromJson: () => ({}),
    }) as unknown as IEntity;

  it('registers an entity class', () => {
    const TaskEntity = mockEntity('task');
    registry.registerEntity(TaskEntity);
    expect(registry.entityClassOfName('task')).toBe(TaskEntity);
  });

  it('returns null for unregistered entity', () => {
    expect(registry.entityClassOfName('unknown')).toBeNull();
  });

  it('returns all registered entity names', () => {
    registry.registerEntity(mockEntity('task'));
    registry.registerEntity(mockEntity('recipe'));
    registry.registerEntity(mockEntity('world'));

    const names = registry.getEntityNames();
    expect(names).toContain('task');
    expect(names).toContain('recipe');
    expect(names).toContain('world');
    expect(names).toHaveLength(3);
  });

  it('overwrites existing entity with same collection name', () => {
    const entity1 = mockEntity('task');
    const entity2 = mockEntity('task');

    registry.registerEntity(entity1);
    registry.registerEntity(entity2);

    expect(registry.entityClassOfName('task')).toBe(entity2);
    expect(registry.getEntityNames()).toHaveLength(1);
  });

  it('throws when registering entity without collection property', () => {
    const badEntity = {
      avroSchema: {},
      fromJson: () => ({}),
    } as unknown as IEntity;

    expect(() => registry.registerEntity(badEntity)).toThrow();
  });
});
