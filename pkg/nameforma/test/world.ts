import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { World } from '../src/world.js';
import { Forma } from '../src/forma.js';

// Mock entity class for testing - extends Forma
class MockEntity extends Forma {
  name: string = '';

  constructor(cfg: any = {}) {
    super({ id: cfg.id });
    this.patch(cfg);
  }

  static entity = 'mock';
  static override get SCHEMA() {
    return {
      name: 'MockEntity',
      namespace: 'test',
      type: 'record',
      fields: [
        ...Forma.SCHEMA.fields,
        { name: 'name', type: 'string' },
      ],
    };
  }

  static fromJson(data: any): MockEntity {
    return new MockEntity(data);
  }
}

describe('World Registry - Constructor & Entity Registration', () => {
  let tempDir: string;
  let worldPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create World and initialize registry', () => {
      const world = new World(worldPath);
      expect(world.worldPath).toBe(worldPath);
      expect(fs.existsSync(worldPath)).toBe(true);
    });

    it('should start with empty registry', () => {
      const world = new World(worldPath);
      expect(world.getEntityNames()).toEqual([]);
    });
  });

  describe('Entity Registration', () => {
    it('should register entity and derive name from EntityClass.entity', () => {
      const world = new World(worldPath);
      world.register(MockEntity);

      expect(world.getEntityNames()).toContain('mock');
    });

    it('should throw if entity missing entity static property', () => {
      const world = new World(worldPath);
      class BadEntity extends Forma {
        patch() {}
        static SCHEMA = {};
      }

      expect(() => world.register(BadEntity as any)).toThrow(
        /missing static entity property/
      );
    });

    it('should throw if entity missing SCHEMA static property', () => {
      const world = new World(worldPath);
      class BadEntity extends Forma {
        patch() {}
        static entity = 'bad';
        static SCHEMA = undefined;
        static fromJson(data: any): BadEntity {
          return new BadEntity(data);
        }
      }

      expect(() => world.register(BadEntity as any)).toThrow(
        /missing static SCHEMA property/
      );
    });

    it('should throw if entity missing fromJson static method', () => {
      const world = new World(worldPath);
      class BadEntity extends Forma {
        patch() {}
        static entity = 'bad';
        static SCHEMA = {};
      }

      expect(() => world.register(BadEntity as any)).toThrow(
        /missing static fromJson method/
      );
    });

    it('should register multiple entity types', () => {
      const world = new World(worldPath);

      class AnotherEntity extends Forma {
        patch() {}
        static entity = 'another';
        static SCHEMA = {};
        static fromJson(data: any): AnotherEntity {
          return new AnotherEntity(data);
        }
      }

      world.register(MockEntity);
      world.register(AnotherEntity);

      const names = world.getEntityNames();
      expect(names).toContain('mock');
      expect(names).toContain('another');
      expect(names.length).toBe(2);
    });

    it('should retrieve registered entity constructor by name', () => {
      const world = new World(worldPath);
      world.register(MockEntity);

      const ctor = world.entityClassOfName('mock');
      expect(ctor).not.toBeNull();
      expect(ctor?.entity).toBe('mock');
      expect(ctor?.SCHEMA).toBeDefined();
      expect(ctor?.fromJson).toBeDefined();
    });

    it('should return null for unregistered entity type', () => {
      const world = new World(worldPath);
      expect(world.entityClassOfName('unknown')).toBeNull();
    });
  });
});

describe('World Storage - Save, Load, List, Delete', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = new World(worldPath);
    world.register(MockEntity);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('save()', () => {
    it('should save entity to disk with entity type directory', () => {
      const entity = new MockEntity({ name: 'test-entity' });
      world.save('mock', entity);

      const filePath = path.join(worldPath, 'mock', `${entity.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should create entity directory on demand', () => {
      const entity = new MockEntity({ name: 'test-entity' });
      const mockDir = path.join(worldPath, 'mock');

      expect(fs.existsSync(mockDir)).toBe(false);
      world.save('mock', entity);
      expect(fs.existsSync(mockDir)).toBe(true);
    });

    it('should throw if entity missing id', () => {
      const entity = new MockEntity({ name: 'test-entity' });
      const badEntity = { name: 'test-entity', id: null };

      expect(() => world.save('mock', badEntity)).toThrow(/entity missing id/);
    });

    it('should store valid JSON that can be parsed', () => {
      const entity = new MockEntity({ name: 'test-entity' });
      world.save('mock', entity);

      const filePath = path.join(worldPath, 'mock', `${entity.id}.json`);
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);

      expect(parsed.name).toBe('test-entity');
      expect(parsed.id).toBeDefined();
    });
  });

  describe('loadEntity()', () => {
    it('should load entity by exact UUID64', () => {
      const original = new MockEntity({ name: 'test-entity' });
      world.save('mock', original);

      const loaded = world.loadEntity(MockEntity, original.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('test-entity');
      expect(loaded?.id.toString()).toBe(original.id.toString());
    });

    it('should load entity by UUID64 string', () => {
      const original = new MockEntity({ name: 'test-entity' });
      world.save('mock', original);

      const idStr = original.id.toString();
      const loaded = world.loadEntity(MockEntity, idStr);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('test-entity');
    });

    it('should return null if entity not found', () => {
      const fakeId = '0PqgFX2700-zCl_5WUKC7W';
      const loaded = world.loadEntity(MockEntity, fakeId);

      expect(loaded).toBeNull();
    });

    it('should return null on invalid UUID64 string', () => {
      const loaded = world.loadEntity(MockEntity, 'invalid-id');
      expect(loaded).toBeNull();
    });

    it('should reconstruct id as UUID64 POJO', () => {
      const original = new MockEntity({ name: 'test-entity' });
      world.save('mock', original);

      const loaded = world.loadEntity(MockEntity, original.id);

      expect(loaded?.id).toBeDefined();
      expect(typeof loaded?.id.base64).toBe('string');
    });
  });

  describe('loadFuzzy() - Default Levenshtein Behavior', () => {
    it('should match exact full UUID64 (default levenshtein = searchId.length)', () => {
      const original = new MockEntity({ name: 'exact-match' });
      world.save('mock', original);

      const idStr = original.id.toString();
      const loaded = world.loadFuzzy(MockEntity, idStr);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('exact-match');
    });

    it('should match partial UUID64 with default levenshtein', () => {
      const original = new MockEntity({ name: 'partial-match' });
      world.save('mock', original);

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 8);
      const loaded = world.loadFuzzy(MockEntity, partial);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('partial-match');
    });

    it('should return null if no match found', () => {
      const entity = new MockEntity({ name: 'test' });
      world.save('mock', entity);

      const loaded = world.loadFuzzy(MockEntity, 'nonexistent-id');

      expect(loaded).toBeNull();
    });

    it('should throw on ambiguous match', () => {
      // Create two entities and use a short search string that could match both
      // UUID64 base64 uses specific characters; we search with a character that appears in both
      const e1 = new MockEntity({ name: 'entity1' });
      const e2 = new MockEntity({ name: 'entity2' });
      world.save('mock', e1);
      world.save('mock', e2);

      // Use a single character that both UUIDs likely contain (fuzzy matching with levenshtein=1)
      // This should match both entities and throw ambiguous error
      expect(() => world.loadFuzzy(MockEntity, '0')).toThrow(
        /ambiguous match/
      );
    });

    it('should use searchId.length as default levenshtein', () => {
      const original = new MockEntity({ name: 'fuzzy-test' });
      world.save('mock', original);

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 10);

      const loaded = world.loadFuzzy(MockEntity, partial);
      expect(loaded).not.toBeNull();
    });
  });

  describe('loadFuzzy() - Custom Levenshtein', () => {
    it('should accept explicit levenshtein parameter', () => {
      const original = new MockEntity({ name: 'custom-lev' });
      world.save('mock', original);

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 5);

      const loaded = world.loadFuzzy(MockEntity, partial, 5);
      expect(loaded).not.toBeNull();
    });

    it('should throw if levenshtein out of range', () => {
      const entity = new MockEntity({ name: 'test' });
      world.save('mock', entity);

      expect(() =>
        world.loadFuzzy(MockEntity, 'search', 999)
      ).toThrow(/levenshtein out of range/);
    });
  });

  describe('loadFuzzy() - Case Insensitivity', () => {
    it('should match case-insensitively by default', () => {
      const original = new MockEntity({ name: 'case-test' });
      world.save('mock', original);

      const idStr = original.id.toString();
      const uppercase = idStr.toUpperCase().substring(0, 8);

      const loaded = world.loadFuzzy(MockEntity, uppercase);
      expect(loaded).not.toBeNull();
    });
  });

  describe('list()', () => {
    it('should return empty array if entity type not found', () => {
      const entities = world.list('mock');
      expect(entities).toEqual([]);
    });

    it('should list all entities of a type', () => {
      const e1 = new MockEntity({ name: 'entity1' });
      const e2 = new MockEntity({ name: 'entity2' });
      const e3 = new MockEntity({ name: 'entity3' });

      world.save('mock', e1);
      world.save('mock', e2);
      world.save('mock', e3);

      const entities = world.list('mock');
      expect(entities.length).toBe(3);
      expect(entities.map((e) => e.name).sort()).toEqual([
        'entity1',
        'entity2',
        'entity3',
      ]);
    });

    it('should return parsed JSON objects', () => {
      const entity = new MockEntity({ name: 'test-entity' });
      world.save('mock', entity);

      const entities = world.list('mock');
      expect(entities[0].name).toBe('test-entity');
      expect(entities[0].id).toBeDefined();
    });
  });

  describe('delete()', () => {
    it('should delete entity file from disk', () => {
      const entity = new MockEntity({ name: 'delete-me' });
      world.save('mock', entity);

      const filePath = path.join(worldPath, 'mock', `${entity.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      world.delete('mock', entity.id.toString());
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should silently succeed if entity not found', () => {
      expect(() => world.delete('mock', 'nonexistent-id')).not.toThrow();
    });

    it('should not affect other entities', () => {
      const e1 = new MockEntity({ name: 'keep' });
      const e2 = new MockEntity({ name: 'delete' });

      world.save('mock', e1);
      world.save('mock', e2);

      world.delete('mock', e2.id.toString());

      const entities = world.list('mock');
      expect(entities.length).toBe(1);
      expect(entities[0].name).toBe('keep');
    });
  });
});
