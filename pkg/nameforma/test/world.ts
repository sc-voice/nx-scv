import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { World } from '../src/world.js';
import { Forma } from '../src/forma.js';
import { Task } from '../src/task.js';

// Mock entity class for testing - extends Forma
class MockEntity extends Forma {
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

    it('should start with standard entities auto-registered', () => {
      const world = new World(worldPath);
      expect(world.getEntityNames()).toContain('task');
    });
  });

  describe('Entity Registration', () => {
    it('should register entity and derive name from EntityClass.entity', () => {
      const world = new World(worldPath);
      world.registerEntity(MockEntity);

      expect(world.getEntityNames()).toContain('mock');
    });

    it('should throw if entity missing entity static property', () => {
      const world = new World(worldPath);
      class BadEntity extends Forma {
        patch() {}
        static avroSchema = {};
      }

      expect(() => world.registerEntity(BadEntity as any)).toThrow(
        /missing static entity property/
      );
    });

    it('should throw if entity missing avroSchema static property', () => {
      const world = new World(worldPath);
      class BadEntity extends Forma {
        patch() {}
        static entity = 'bad';
        static avroSchema = undefined;
        static fromJson(data: any): BadEntity {
          return new BadEntity(data);
        }
      }

      expect(() => world.registerEntity(BadEntity as any)).toThrow(
        /missing static avroSchema property/
      );
    });

    it('should throw if entity missing fromJson static method', () => {
      const world = new World(worldPath);
      class BadEntity extends Forma {
        patch() {}
        static entity = 'bad';
        static avroSchema = {};
      }

      expect(() => world.registerEntity(BadEntity as any)).toThrow(
        /missing static fromJson method/
      );
    });

    it('should register multiple entity types', () => {
      const world = new World(worldPath);

      class AnotherEntity extends Forma {
        patch() {}
        static entity = 'another';
        static avroSchema = {};
        static fromJson(data: any): AnotherEntity {
          return new AnotherEntity(data);
        }
      }

      world.registerEntity(MockEntity);
      world.registerEntity(AnotherEntity);

      const names = world.getEntityNames();
      expect(names).toContain('task');      // Auto-registered
      expect(names).toContain('mock');
      expect(names).toContain('another');
      expect(names.length).toBe(3);
    });

    it('should retrieve registered entity constructor by name', () => {
      const world = new World(worldPath);
      world.registerEntity(MockEntity);

      const ctor = world.entityClassOfName('mock');
      expect(ctor).not.toBeNull();
      expect(ctor?.entity).toBe('mock');
      expect(ctor?.avroSchema).toBeDefined();
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
    world.registerEntity(MockEntity);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('entityList API', () => {
    it('should save entity to disk via entityList.addItem()', () => {
      const f7t = world.entityList(MockEntity);
      const entity = f7t.addItem({ name: 'test-entity' });

      const filePath = path.join(worldPath, 'mock', `${entity.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should create entity directory on demand', () => {
      const mockDir = path.join(worldPath, 'mock');
      expect(fs.existsSync(mockDir)).toBe(false);

      const f7t = world.entityList(MockEntity);
      f7t.addItem({ name: 'test-entity' });

      expect(fs.existsSync(mockDir)).toBe(true);
    });

    it('should store valid JSON that can be parsed', () => {
      const f7t = world.entityList(MockEntity);
      const entity = f7t.addItem({ name: 'test-entity' });

      const filePath = path.join(worldPath, 'mock', `${entity.id}.json`);
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);

      expect(parsed.name).toBe('test-entity');
      expect(parsed.id).toBeDefined();
    });
  });

  describe('loadEntity()', () => {
    it('should load entity by exact UUID64', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'test-entity' });

      const loaded = world.loadEntity(MockEntity, original.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('test-entity');
      expect(loaded?.id.toString()).toBe(original.id.toString());
    });

    it('should load entity by UUID64 string', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'test-entity' });

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
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'test-entity' });

      const loaded = world.loadEntity(MockEntity, original.id);

      expect(loaded?.id).toBeDefined();
      expect(typeof loaded?.id.base64).toBe('string');
    });
  });

  describe('loadFuzzy() - Default Levenshtein Behavior', () => {
    it('should match exact full UUID64 (default levenshtein = searchId.length)', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'exact-match' });

      const idStr = original.id.toString();
      const loaded = world.loadFuzzy(MockEntity, idStr);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('exact-match');
    });

    it('should match partial UUID64 with default levenshtein', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'partial-match' });

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 8);
      const loaded = world.loadFuzzy(MockEntity, partial);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('partial-match');
    });

    it('should return null if no match found', () => {
      const f7t = world.entityList(MockEntity);
      f7t.addItem({ name: 'test' });

      const loaded = world.loadFuzzy(MockEntity, 'nonexistent-id');

      expect(loaded).toBeNull();
    });

    it('should throw on ambiguous match', () => {
      // Create two entities and use a short search string that could match both
      // UUID64 base64 uses specific characters; we search with a character that appears in both
      const f7t = world.entityList(MockEntity);
      f7t.addItem({ name: 'entity1' });
      f7t.addItem({ name: 'entity2' });

      // Use a single character that both UUIDs likely contain (fuzzy matching with levenshtein=1)
      // This should match both entities and throw ambiguous error
      expect(() => world.loadFuzzy(MockEntity, '0')).toThrow(
        /ambiguous match/
      );
    });

    it('should use searchId.length as default levenshtein', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'fuzzy-test' });

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 10);

      const loaded = world.loadFuzzy(MockEntity, partial);
      expect(loaded).not.toBeNull();
    });
  });

  describe('loadFuzzy() - Custom Levenshtein', () => {
    it('should accept explicit levenshtein parameter', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'custom-lev' });

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 5);

      const loaded = world.loadFuzzy(MockEntity, partial, 5);
      expect(loaded).not.toBeNull();
    });

    it('should throw if levenshtein out of range', () => {
      const f7t = world.entityList(MockEntity);
      f7t.addItem({ name: 'test' });

      expect(() =>
        world.loadFuzzy(MockEntity, 'search', 999)
      ).toThrow(/levenshtein out of range/);
    });
  });

  describe('loadFuzzy() - Case Insensitivity', () => {
    it('should match case-insensitively by default', () => {
      const f7t = world.entityList(MockEntity);
      const original = f7t.addItem({ name: 'case-test' });

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
      const f7t = world.entityList(MockEntity);
      f7t.addItem({ name: 'entity1' });
      f7t.addItem({ name: 'entity2' });
      f7t.addItem({ name: 'entity3' });

      const entities = world.list('mock');
      expect(entities.length).toBe(3);
      expect(entities.map((e) => e.name).sort()).toEqual([
        'entity1',
        'entity2',
        'entity3',
      ]);
    });

    it('should return parsed JSON objects', () => {
      const f7t = world.entityList(MockEntity);
      f7t.addItem({ name: 'test-entity' });

      const entities = world.list('mock');
      expect(entities[0].name).toBe('test-entity');
      expect(entities[0].id).toBeDefined();
    });
  });

  describe('delete()', () => {
    it('should delete entity file from disk', () => {
      const f7t = world.entityList(MockEntity);
      const entity = f7t.addItem({ name: 'delete-me' });

      const filePath = path.join(worldPath, 'mock', `${entity.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      world.delete('mock', entity.id.toString());
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should silently succeed if entity not found', () => {
      expect(() => world.delete('mock', 'nonexistent-id')).not.toThrow();
    });

    it('should not affect other entities', () => {
      const f7t = world.entityList(MockEntity);
      const e1 = f7t.addItem({ name: 'keep' });
      const e2 = f7t.addItem({ name: 'delete' });

      world.delete('mock', e2.id.toString());

      const entities = world.list('mock');
      expect(entities.length).toBe(1);
      expect(entities[0].name).toBe('keep');
    });
  });

  describe('entityList()', () => {
    it('should return empty FormaList if entity type not found', () => {
      const list = world.entityList(MockEntity);
      expect(list.size).toBe(0);
    });

    it('should return FormaList with typed entities after saves', () => {
      const list = world.entityList(MockEntity);
      list.addItem({ name: 'entity1' });
      list.addItem({ name: 'entity2' });
      list.addItem({ name: 'entity3' });
      expect(list.size).toBe(3);

      const names = Array.from(list).map((e) => e.name).sort();
      expect(names).toEqual(['entity1', 'entity2', 'entity3']);
    });

    it('should return entities with UUID64 POJO ids', () => {
      const list = world.entityList(MockEntity);
      list.addItem({ name: 'test-entity' });
      expect(list.size).toBe(1);

      const items = Array.from(list);
      expect(items[0].name).toBe('test-entity');
      expect(items[0].id).toBeDefined();
      expect(items[0].id.base64).toBeDefined();
    });

    it('should return FormaList that is iterable', () => {
      const list = world.entityList(MockEntity);
      list.addItem({ name: 'first' });
      list.addItem({ name: 'second' });
      const collected: MockEntity[] = [];

      for (const entity of list) {
        collected.push(entity);
      }

      expect(collected.length).toBe(2);
      expect(collected.map((e) => e.name).sort()).toEqual(['first', 'second']);
    });
  });
});

describe('World Serialization - save()/load() methods', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = new World(worldPath);
    world.registerEntity(MockEntity);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('save()', () => {
    it('should save World state to world.json', () => {
      const worldFile = path.join(worldPath, 'world.json');
      world.save();

      expect(fs.existsSync(worldFile)).toBe(true);
    });

    it('should create .nameforma directory if missing', () => {
      // Remove the world directory
      fs.rmSync(worldPath, { recursive: true, force: true });
      expect(fs.existsSync(worldPath)).toBe(false);

      world.save();
      expect(fs.existsSync(worldPath)).toBe(true);
    });

    it('should write correct JSON format with only id', () => {
      world.save();

      const worldFile = path.join(worldPath, 'world.json');
      const data = fs.readFileSync(worldFile, 'utf8');
      const json = JSON.parse(data);

      expect(json.id).toBeDefined();
      expect(json.numeronym).toBeDefined();
      expect(json.focusStack).toBeDefined();
      expect(Object.keys(json).sort()).toEqual(['focusStack', 'id', 'numeronym']);  // No worldPath
    });

    it('should preserve World id across save', () => {
      const originalId = world.id.toString();
      world.save();

      const worldFile = path.join(worldPath, 'world.json');
      const data = fs.readFileSync(worldFile, 'utf8');
      const json = JSON.parse(data);

      expect(json.id).toBe(originalId);
    });
  });

  describe('load()', () => {
    it('should load and verify world.json exists and is valid', () => {
      world.save();

      // Create a new World instance at same path (with different id)
      const world2 = new World(worldPath);
      const world2Id = world2.id.toString();

      // load() should not fail
      expect(() => world2.load()).not.toThrow();

      // world2 keeps its own id (load doesn't change it)
      expect(world2.id.toString()).toBe(world2Id);
    });

    it('should return this for method chaining', () => {
      world.save();

      const world2 = new World(worldPath);
      const result = world2.load();

      expect(result).toBe(world2);
    });

    it('should throw Error if world.json does not exist', () => {
      const world2 = new World(worldPath);

      expect(() => world2.load()).toThrow(/world.json not found/);
    });

    it('should throw Error if world.json missing id', () => {
      world.save();

      // Corrupt the world.json file to remove id
      const worldFile = path.join(worldPath, 'world.json');
      fs.writeFileSync(worldFile, '{}', 'utf8');

      const world2 = new World(worldPath);

      expect(() => world2.load()).toThrow(/world.json missing id/);
    });

    it('should let JSON parse errors throw naturally', () => {
      world.save();

      // Corrupt the world.json file
      const worldFile = path.join(worldPath, 'world.json');
      fs.writeFileSync(worldFile, 'invalid json {', 'utf8');

      const world2 = new World(worldPath);

      expect(() => world2.load()).toThrow();
    });
  });

  describe('round-trip: save() then load()', () => {
    it('should allow save/load cycle without errors', () => {
      // Save world state
      world.save();

      // Load into new instance at same path
      const world2 = new World(worldPath);
      expect(() => world2.load()).not.toThrow();
    });

    it('should preserve entity data across save/load cycle', () => {
      const f7t = world.entityList(MockEntity);
      const entity = f7t.addItem({ name: 'test-entity' });

      // Save and load world
      world.save();

      const world2 = new World(worldPath);
      world2.registerEntity(MockEntity);
      world2.load();

      // Verify entity can still be loaded (entities are stored separately)
      const loaded = world2.loadEntity(MockEntity, entity.id);
      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('test-entity');
    });
  });

  describe('fromPath() integration', () => {
    it('should create and save new World if world.json does not exist', () => {
      const world2 = World.fromPath(worldPath);

      const worldFile = path.join(worldPath, 'world.json');
      expect(fs.existsSync(worldFile)).toBe(true);

      // Verify world.json has only id (no worldPath)
      const data = fs.readFileSync(worldFile, 'utf8');
      const json = JSON.parse(data);
      expect(json.id).toBeDefined();
      expect(json.numeronym).toBeDefined();
      expect(json.focusStack).toBeDefined();
      expect(Object.keys(json).sort()).toEqual(['focusStack', 'id', 'numeronym']);
    });

    it('should load existing World if world.json exists', () => {
      // Create and save initial world
      const originalId = world.id.toString();
      world.save();

      // Use fromPath to load it
      const world2 = World.fromPath(worldPath);

      expect(world2.id.toString()).toBe(originalId);
    });

    it('should not overwrite existing world.json on fromPath', () => {
      // Create and save initial world
      const originalId = world.id.toString();
      world.save();

      // Use fromPath to load (should not overwrite)
      const world2 = World.fromPath(worldPath);

      // Verify the loaded world has same id
      expect(world2.id.toString()).toBe(originalId);

      // Verify world.json still has original id and only id (no worldPath)
      const worldFile = path.join(worldPath, 'world.json');
      const data = fs.readFileSync(worldFile, 'utf8');
      const json = JSON.parse(data);
      expect(json.id).toBe(originalId);
      expect(json.numeronym).toBeDefined();
      expect(json.focusStack).toBeDefined();
      expect(Object.keys(json).sort()).toEqual(['focusStack', 'id', 'numeronym']);
    });
  });

  describe('FormaList persistence (round-trip)', () => {
    it('should persist entity to file when added via entityList', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = new World(worldPath);
      world.registerEntity(Task);

      const list = world.entityList(Task);
      const task = list.addItem({ name:'test task' });

      // Verify file was created
      const filePath = path.join(worldPath, 'task', `${task.id.base64}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      expect(json.name).toBe('test task');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should delete entity file when removed via entityList', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = new World(worldPath);
      world.registerEntity(Task);

      const list = world.entityList(Task);
      const task = list.addItem({ name:'test task' });
      const filePath = path.join(worldPath, 'task', `${task.id.base64}.json`);

      expect(fs.existsSync(filePath)).toBe(true);

      list.deleteItem(task.id.base64);

      expect(fs.existsSync(filePath)).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should update entity file when patched via entityList', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = new World(worldPath);
      world.registerEntity(Task);

      const list = world.entityList(Task);
      const task = list.addItem({ name:'original' });
      const filePath = path.join(worldPath, 'task', `${task.id.base64}.json`);

      // Patch via FormaList
      list.patchItem(task.id.base64, { name:'updated' });

      // Verify file was updated
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      expect(json.name).toBe('updated');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should load persisted entities on entityList() call', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = new World(worldPath);
      world.registerEntity(Task);

      // Add and modify tasks
      const list1 = world.entityList(Task);
      const task1 = list1.addItem({ name:'task1' });
      const task2 = list1.addItem({ name:'task2' });
      list1.patchItem(task1.id.base64, { name:'task1-updated' });

      // Create new world instance and load
      const world2 = new World(worldPath);
      world2.registerEntity(Task);
      const list2 = world2.entityList(Task);

      expect(list2.size).toBe(2);

      const loaded1 = list2.getItem(task1.id.base64);
      const loaded2 = list2.getItem(task2.id.base64);

      expect(loaded1.name).toBe('task1-updated');
      expect(loaded2.name).toBe('task2');

      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});

describe('World - focusStack', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = new World(worldPath);
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
      world.focusForma(e1);  // Move e1 to top

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

      expect(stack1).not.toBe(stack2);  // Different FormaLists
      const items1 = Array.from(stack1);
      const items2 = Array.from(stack2);
      expect(items1[0].id.base64).toBe(items2[0].id.base64);  // Same content
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
      expect(focusItems.some(f => f.formaId.base64 === e2.id.base64)).toBe(false);
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
        (a, b) => world.focusOrder(a) - world.focusOrder(b) || a.id.base64.localeCompare(b.id.base64)
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
