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
import { execSync } from 'child_process';
import { World, Forma, Entity, Task, Action, UUID64, User } from '@sc-voice/nameforma';
import { RGA64Node } from '@sc-voice/nameforma/unstable';
import { Text } from '@sc-voice/tools';
const { ColorConsole } = Text;
const { cc } = ColorConsole;


// THIS MUST BE THE FIRST TEST BECAUSE OF THROTTLING
describe('World — watermark persistence', () => {
  let tempDir: string;
  let worldPath: string;
  let userSignature: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-watermark-'));
    worldPath = path.join(tempDir, '.nameforma');

    // Initialize git repo in tempDir with user.name
    execSync('git init', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });

    // Create initial commit so HEAD exists
    fs.writeFileSync(path.join(tempDir, 'README.md'), 'test');
    execSync('git add README.md', { cwd: tempDir });
    execSync('git commit -m "initial"', { cwd: tempDir });

    // Get the expected user signature
    const user = User.fromGit(tempDir);
    userSignature = user.signature();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should preserve watermark across save/load cycle', () => {
    const msg = "world:1565";
    const dbg = 1;

    // No watermark for new worlds
    dbg && cc.tag1(msg, "world1");
    const world1 = World.fromPath(worldPath);
    const worldFile = path.join(worldPath, 'world.json');
    const data1 = fs.readFileSync(worldFile, 'utf8');
    const json1 = JSON.parse(data1);
    expect(json1.watermark).toEqual({}); // no watermark on new worlds

    // Existing world must have a watermark
    dbg && cc.tag1(msg, "world2");
    const world2 = World.fromPath(worldPath);
    //const data2 = fs.readFileSync(worldFile, 'utf8');
    const data2 = JSON.stringify(world2);
    const json2 = JSON.parse(data2);
    const keys2 = Object.keys(json2.watermark)
    expect(keys2.length).toEqual(1); // watermark on existing worlds
    const uuid2 = keys2[0];

    // Existing world watermark does not change without a git pull
    dbg && cc.tag1(msg, "world3");
    const world3 = World.fromPath(worldPath);
    //const data3 = fs.readFileSync(worldFile, 'utf8');
    const data3 = JSON.stringify(world3);
    const json3 = JSON.parse(data3);
    const keys3 = Object.keys(json3.watermark)
    expect(keys3.length).toEqual(1); // watermark on existing worlds
    const uuid3 = keys3[0];
    expect(uuid3).toEqual(uuid2);
  });
});

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
      const world = World.fromPath(worldPath);
      expect(world.worldPath).toBe(worldPath);
      expect(fs.existsSync(worldPath)).toBe(true);
    });

    it('should start with standard entities auto-registered', () => {
      const world = World.fromPath(worldPath);
      expect(world.getEntityNames()).toContain('task');
    });
  });

  describe('Entity Registration', () => {
    it('should register entity and derive name from EntityClass.entity', () => {
      const world = World.fromPath(worldPath);

      expect(world.getEntityNames()).toContain('task');
    });

    it('should throw if entity missing entity static property', () => {
      const world = World.fromPath(worldPath);
      class BadEntity extends Forma {
        override patch() {}
        static override avroSchema: any = {};
      }

      expect(() => world.registerEntity(BadEntity as any)).toThrow(
        /missing static entity property/,
      );
    });

    it('should throw if entity missing avroSchema static property', () => {
      const world = World.fromPath(worldPath);
      class BadEntity extends Forma {
        override patch() {}
        static entity = 'bad';
        static override avroSchema: any = undefined;
        static fromJson(data: any): BadEntity {
          return new BadEntity(data);
        }
      }

      expect(() => world.registerEntity(BadEntity as any)).toThrow(
        /missing static avroSchema property/,
      );
    });

    it('should throw if entity missing fromJson static method', () => {
      const world = World.fromPath(worldPath);
      class BadEntity extends Forma {
        override patch() {}
        static entity = 'bad';
        static override avroSchema: any = {};
      }

      expect(() => world.registerEntity(BadEntity as any)).toThrow(
        /missing static fromJson method/,
      );
    });

    it('should register multiple entity types', () => {
      const world = World.fromPath(worldPath);

      class AnotherEntity extends Forma {
        override patch() {}
        static entity = 'another';
        static override avroSchema: any = {};
        static fromJson(data: any): AnotherEntity {
          return new AnotherEntity(data);
        }
      }

      world.registerEntity(AnotherEntity as any);

      const names = world.getEntityNames();
      expect(names).toContain('task'); // Auto-registered
      expect(names).toContain('another');
      expect(names.length).toBe(2);
    });

    it('should retrieve registered entity constructor by name', () => {
      const world = World.fromPath(worldPath);

      const ctor = world.entityClassOfName('task');
      expect(ctor).not.toBeNull();
      expect(ctor?.entity).toBe('task');
      expect(ctor?.avroSchema).toBeDefined();
      expect(ctor?.fromJson).toBeDefined();
    });

    it('should return null for unregistered entity type', () => {
      const world = World.fromPath(worldPath);
      expect(world.entityClassOfName('unknown')).toBeNull();
    });
  });
});

describe('World.create()', () => {
  let tempDir: string;
  let worldPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-create-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    fs.mkdirSync(worldPath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates world.json and returns a World with the given worldPath', () => {
    const world = World.create(worldPath);
    expect(world.worldPath).toBe(worldPath);
    expect(fs.existsSync(path.join(worldPath, 'world.json'))).toBe(true);
  });

  it('throws if world.json already exists', () => {
    World.create(worldPath);
    expect(() => World.create(worldPath)).toThrow(/World exists at/);
  });
});

describe('World.load()', () => {
  let tempDir: string;
  let worldPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-load-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    fs.mkdirSync(worldPath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('throws if world.json does not exist', () => {
    expect(() => World.load(worldPath)).toThrow(/World not found at/);
  });

  it('loads a world created by World.create() with the same id', () => {
    const created = World.create(worldPath);
    const loaded = World.load(worldPath);
    expect(loaded.id.base64).toBe(created.id.base64);
    expect(loaded.worldPath).toBe(worldPath);
  });
});

describe('World Storage - Save, Load, List, Delete', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = World.fromPath(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('entityList API', () => {
    it('should save entity to disk via entityList.addItem()', () => {
      const f7t = world.entityList(Task);
      const entity = f7t.addItem(new Task({ name: 'test-entity' }));

      const filePath = path.join(worldPath, 'task', `${entity.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should create entity directory on demand', () => {
      const mockDir = path.join(worldPath, 'task');
      expect(fs.existsSync(mockDir)).toBe(false);

      const f7t = world.entityList(Task);
      f7t.addItem(new Task({ name: 'test-entity' }));

      expect(fs.existsSync(mockDir)).toBe(true);
    });

    it('should store valid JSON that can be parsed', () => {
      const f7t = world.entityList(Task);
      const entity = f7t.addItem(new Task({ name: 'test-entity' }));

      const filePath = path.join(worldPath, 'task', `${entity.id}.json`);
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);

      expect(parsed.name).toBe('test-entity');
      expect(parsed.id).toBeDefined();
    });
  });

  describe('loadEntity()', () => {
    it('should load entity by exact UUID64', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'test-entity' }));

      const loaded = world.loadEntity(Task, original.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('test-entity');
      expect(loaded?.id.toString()).toBe(original.id.toString());
    });

    it('should load entity by UUID64 string', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'test-entity' }));

      const idStr = original.id.toString();
      const loaded = world.loadEntity(Task, idStr);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('test-entity');
    });

    it('should return null if entity not found', () => {
      const fakeId = '0PqgFX2700-zCl_5WUKC7W';
      const loaded = world.loadEntity(Task, fakeId);

      expect(loaded).toBeNull();
    });

    it('should return null on invalid UUID64 string', () => {
      const loaded = world.loadEntity(Task, 'invalid-id');
      expect(loaded).toBeNull();
    });

    it('should reconstruct id as UUID64 POJO', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'test-entity' }));

      const loaded = world.loadEntity(Task, original.id);

      expect(loaded?.id).toBeDefined();
      expect(typeof loaded?.id.base64).toBe('string');
    });
  });

  describe('loadFuzzy() - Default Levenshtein Behavior', () => {
    it('should match exact full UUID64 (default levenshtein = searchId.length)', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'exact-match' }));

      const idStr = original.id.toString();
      const loaded = world.loadFuzzy(Task, idStr);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('exact-match');
    });

    it('should match partial UUID64 with default levenshtein', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'partial-match' }));

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 8);
      const loaded = world.loadFuzzy(Task, partial);

      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('partial-match');
    });

    it('should return null if no match found', () => {
      const f7t = world.entityList(Task);
      f7t.addItem(new Task({ name: 'test' }));

      const loaded = world.loadFuzzy(Task, 'nonexistent-id');

      expect(loaded).toBeNull();
    });

    it('should throw on ambiguous match', () => {
      // Create two entities and use a short search string that could match both
      // UUID64 base64 uses specific characters; we search with a character that appears in both
      const f7t = world.entityList(Task);
      f7t.addItem(new Task({ name: 'entity1' }));
      f7t.addItem(new Task({ name: 'entity2' }));

      // Use a single character that both UUIDs likely contain (fuzzy matching with levenshtein=1)
      // This should match both entities and throw ambiguous error
      expect(() => world.loadFuzzy(Task, '0')).toThrow(
        /ambiguous match/,
      );
    });

    it('should use searchId.length as default levenshtein', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'fuzzy-test' }));

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 10);

      const loaded = world.loadFuzzy(Task, partial);
      expect(loaded).not.toBeNull();
    });
  });

  describe('loadFuzzy() - Custom Levenshtein', () => {
    it('should accept explicit levenshtein parameter', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'custom-lev' }));

      const idStr = original.id.toString();
      const partial = idStr.substring(0, 5);

      const loaded = world.loadFuzzy(Task, partial, 5);
      expect(loaded).not.toBeNull();
    });

    it('should throw if levenshtein out of range', () => {
      const f7t = world.entityList(Task);
      f7t.addItem(new Task({ name: 'test' }));

      expect(() => world.loadFuzzy(Task, 'search', 999)).toThrow(
        /levenshtein out of range/,
      );
    });
  });

  describe('loadFuzzy() - Case Insensitivity', () => {
    it('should match case-insensitively by default', () => {
      const f7t = world.entityList(Task);
      const original = f7t.addItem(new Task({ name: 'case-test' }));

      const idStr = original.id.toString();
      const uppercase = idStr.toUpperCase().substring(0, 8);

      const loaded = world.loadFuzzy(Task, uppercase);
      expect(loaded).not.toBeNull();
    });
  });

  describe('list()', () => {
    it('should return empty array if entity type not found', () => {
      const entities = world.list('task');
      expect(entities).toEqual([]);
    });

    it('should list all entities of a type', () => {
      const f7t = world.entityList(Task);
      f7t.addItem(new Task({ name: 'entity1' }));
      f7t.addItem(new Task({ name: 'entity2' }));
      f7t.addItem(new Task({ name: 'entity3' }));

      const entities = world.list('task');
      expect(entities.length).toBe(3);
      expect(entities.map((e) => e.name).sort()).toEqual([
        'entity1',
        'entity2',
        'entity3',
      ]);
    });

    it('should return parsed JSON objects', () => {
      const f7t = world.entityList(Task);
      f7t.addItem(new Task({ name: 'test-entity' }));

      const entities = world.list('task');
      expect(entities[0].name).toBe('test-entity');
      expect(entities[0].id).toBeDefined();
    });
  });

  describe('delete()', () => {
    it('should delete entity file from disk', () => {
      const f7t = world.entityList(Task);
      const entity = f7t.addItem(new Task({ name: 'delete-me' }));

      const filePath = path.join(worldPath, 'task', `${entity.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      world.delete('task', entity.id.toString());
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should silently succeed if entity not found', () => {
      expect(() => world.delete('task', 'nonexistent-id')).not.toThrow();
    });

    it('should not affect other entities', () => {
      const f7t = world.entityList(Task);
      const e1 = f7t.addItem(new Task({ name: 'keep' }));
      const e2 = f7t.addItem(new Task({ name: 'delete' }));

      world.delete('task', e2.id.toString());

      const entities = world.list('task');
      expect(entities.length).toBe(1);
      expect(entities[0].name).toBe('keep');
    });
  });

  describe('entityList()', () => {
    it('should return empty FormaList if entity type not found', () => {
      const list = world.entityList(Task);
      expect(list.size).toBe(0);
    });

    it('should return FormaList with typed entities after saves', () => {
      const list = world.entityList(Task);
      list.addItem(new Task({ name: 'entity1' }));
      list.addItem(new Task({ name: 'entity2' }));
      list.addItem(new Task({ name: 'entity3' }));
      expect(list.size).toBe(3);

      const names = Array.from(list)
        .map((e) => e.name)
        .sort();
      expect(names).toEqual(['entity1', 'entity2', 'entity3']);
    });

    it('should return entities with UUID64 POJO ids', () => {
      const list = world.entityList(Task);
      list.addItem(new Task({ name: 'test-entity' }));
      expect(list.size).toBe(1);

      const items = Array.from(list);
      expect(items[0].name).toBe('test-entity');
      expect(items[0].id).toBeDefined();
      expect(items[0].id.base64).toBeDefined();
    });

    it('should return FormaList that is iterable', () => {
      const list = world.entityList(Task);
      list.addItem(new Task({ name: 'first' }));
      list.addItem(new Task({ name: 'second' }));
      const collected: Task[] = [];

      for (const entity of list) {
        collected.push(entity);
      }

      expect(collected.length).toBe(2);
      expect(collected.map((e) => e.name).sort()).toEqual([
        'first',
        'second',
      ]);
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
    world = World.fromPath(worldPath);
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
      expect(json.focusManager).toBeDefined();
      expect(json.watermark).toBeDefined();
      expect(Object.keys(json).sort()).toEqual([
        'focusManager',
        'id',
        'name',
        'numeronym',
        'summary',
        'watermark',
      ]);
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
    it('should load existing world and preserve id', () => {
      world.save();

      // fromPath should load existing world with same id
      const originalId = world.id.toString();
      const world2 = World.fromPath(worldPath);

      expect(world2.id.toString()).toBe(originalId);
    });

    it('should throw Error when world.json missing id', () => {
      world.save();

      // Corrupt the world.json file to remove id
      const worldFile = path.join(worldPath, 'world.json');
      fs.writeFileSync(worldFile, '{}', 'utf8');

      expect(() => World.fromPath(worldPath)).toThrow(/World.fromJson: missing id/);
    });

    it('should throw Error on invalid JSON', () => {
      world.save();

      // Corrupt the world.json file
      const worldFile = path.join(worldPath, 'world.json');
      fs.writeFileSync(worldFile, 'invalid json {', 'utf8');

      expect(() => World.fromPath(worldPath)).toThrow(SyntaxError);
    });

    it('should throw Error when world.json has invalid id format', () => {
      world.save();

      // Corrupt the id field with invalid format
      const worldFile = path.join(worldPath, 'world.json');
      fs.writeFileSync(worldFile, JSON.stringify({ 
        id: 'not-a-valid-uuid64', numeronym: {}, focusManager: "hello" 
      }), 'utf8');

      expect(() => World.fromPath(worldPath)).toThrow();
    });
  });

  describe('round-trip: save() then load()', () => {
    it('should preserve world id across save/fromPath cycle', () => {
      // Save world state
      const originalId = world.id.toString();
      world.save();

      // Load into new instance at same path
      const world2 = World.fromPath(worldPath);
      expect(world2.id.toString()).toBe(originalId);
    });

    it('should preserve focus stack and numeronym across save/load cycle', () => {
      const f7t = world.entityList(Task);
      const entity = f7t.addItem(new Task({ name: 'test-entity' }));

      // Set up state: focus an entity and add numeronym mapping
      world.focusManager.focus(entity.id);
      world.setNumeronym(new Map([['foo', 'bar'], ['abc', 'xyz']]));

      // Save and load world
      world.save();

      const world2 = World.fromPath(worldPath);

      // Verify focus stack was preserved
      const focusedEntry = world2.focusedForma(Task.entity);
      expect(focusedEntry).not.toBeNull();
      expect(focusedEntry?.id.base64).toBe(entity.id.base64);

      // Verify numeronym was preserved
      const numeronym = world2.getNumeronym();
      expect(numeronym.get('foo')).toBe('bar');
      expect(numeronym.get('abc')).toBe('xyz');
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
      expect(json.focusManager).toBeDefined();
      expect(json.watermark).toBeDefined();
      expect(Object.keys(json).sort()).toEqual([
        'focusManager',
        'id',
        'name',
        'numeronym',
        'summary',
        'watermark',
      ]);
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
      expect(json.focusManager).toBeDefined();
      expect(json.watermark).toBeDefined();
      expect(Object.keys(json).sort()).toEqual([
        'focusManager',
        'id',
        'name',
        'numeronym',
        'summary',
        'watermark',
      ]);
    });
  });

  describe('FormaList persistence (round-trip)', () => {
    it('should persist entity to file when added via entityList', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = World.fromPath(worldPath);
      world.registerEntity(Task);

      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'test task' }));

      // Verify file was created
      const filePath = path.join(
        worldPath,
        'task',
        `${task.id.base64}.json`,
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      expect(json.name).toBe('test task');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should delete entity file when removed via entityList', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = World.fromPath(worldPath);
      world.registerEntity(Task);

      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'test task' }));
      const filePath = path.join(
        worldPath,
        'task',
        `${task.id.base64}.json`,
      );

      expect(fs.existsSync(filePath)).toBe(true);

      list.deleteItem(task.id.base64);

      expect(fs.existsSync(filePath)).toBe(false);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should update entity file when patched via entityList', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = World.fromPath(worldPath);
      world.registerEntity(Task);

      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'original' }));
      const filePath = path.join(
        worldPath,
        'task',
        `${task.id.base64}.json`,
      );

      // Patch via FormaList
      list.patchItem(task.id.base64, { name: 'updated' });

      // Verify file was updated
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      expect(json.name).toBe('updated');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should load persisted entities on entityList() call', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const worldPath = path.join(tmpDir, '.nameforma');
      const world = World.fromPath(worldPath);
      world.registerEntity(Task);

      // Add and modify tasks
      const list1 = world.entityList(Task);
      const task1 = list1.addItem(new Task({ name: 'task1' }));
      const task2 = list1.addItem(new Task({ name: 'task2' }));
      list1.patchItem(task1.id.base64, { name: 'task1-updated' });

      // Create new world instance and load
      const world2 = World.fromPath(worldPath);
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

describe('World — namespace', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = World.fromPath(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('namespace method', () => {
    it('should return IReadOnlyNamespace interface', () => {
      const ns = world.namespace;
      expect(ns).toBeDefined();
      expect(typeof ns[Symbol.iterator]).toBe('function');
      expect(typeof ns.getForma).toBe('function');
    });

    it('should return only world in namespace when no tasks exist', () => {
      const ns = world.namespace;
      const items = Array.from(ns);
      expect(items.length).toBe(1);
      expect(items[0][1].id.base64).toBe(world.id.base64);
    });

    it('should populate namespace with existing tasks at construct time', () => {
      const list = world.entityList(Task);
      const task1 = list.addItem(new Task({ name: 'task1' }));
      const task2 = list.addItem(new Task({ name: 'task2' }));

      // Create new world instance to test population at construct time
      const world2 = World.fromPath(worldPath);
      const ns = world2.namespace;

      expect(ns.getForma(world2.id.base64)?.id.base64).toBe(world2.id.base64);

      const fz1 = ns.fuzzyIdOf(task1);
      expect(ns.getForma(fz1)?.id.base64).toBe(task1.id.base64);

      const fz2 = ns.fuzzyIdOf(task2);
      expect(ns.getForma(fz2)?.id.base64).toBe(task2.id.base64);
    });

    it('should keep namespace in sync when task is added', () => {
      const ns = world.namespace;
      expect(ns.getForma(world.id.base64)?.id.base64).toBe(world.id.base64);

      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'new-task' }));

      const fz = ns.fuzzyIdOf(task);
      expect(ns.getForma(fz)?.id.base64).toBe(task.id.base64);
    });

    it('should keep namespace in sync when task is patched', () => {
      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'original' }));

      const ns = world.namespace;
      const fz = ns.fuzzyIdOf(task);
      expect(ns.getForma(fz)?.name).toBe('original');

      // Patch the task
      list.patchItem(task.id.base64, { name: 'updated' });

      expect(ns.getForma(fz)?.name).toBe('updated');
    });

    it('should keep namespace in sync when task is deleted', () => {
      const list = world.entityList(Task);
      const task1 = list.addItem(new Task({ name: 'task1' }));
      const task2 = list.addItem(new Task({ name: 'task2' }));

      const ns = world.namespace;
      expect(ns.getForma(world.id.base64)?.id.base64).toBe(world.id.base64);

      const fz1 = ns.fuzzyIdOf(task1);
      const fz2 = ns.fuzzyIdOf(task2);

      // Delete one task
      list.deleteItem(task1.id.base64);

      expect(ns.getForma(fz1)).toBeUndefined();
      expect(ns.getForma(fz2)?.id.base64).toBe(task2.id.base64);
    });

    it('should resolve task by full UUID64 fuzzyId', () => {
      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'test' }));

      const ns = world.namespace;
      const found = ns.getForma(task.id.base64);

      expect(found).toBeDefined();
      expect(found?.id.base64).toBe(task.id.base64);
      expect(found?.name).toBe('test');
    });

    it('should resolve task by partial fuzzyId', () => {
      const list = world.entityList(Task);
      const task = list.addItem(new Task({ name: 'test' }));

      const ns = world.namespace;
      const fz = ns.fuzzyIdOf(task);
      const found = ns.getForma(fz);

      expect(found).toBeDefined();
      expect(found?.id.base64).toBe(task.id.base64);
    });

    it('should return undefined for non-existent fuzzyId', () => {
      const list = world.entityList(Task);
      list.addItem(new Task({ name: 'task' }));

      const ns = world.namespace;
      const found = ns.getForma('nonexistent-id');

      expect(found).toBeUndefined();
    });

    it('should iterate namespace with masked fuzzyIds', () => {
      const list = world.entityList(Task);
      const task1 = list.addItem(new Task({ name: 'task1' }));
      const task2 = list.addItem(new Task({ name: 'task2' }));

      const ns = world.namespace;

      expect(ns.getForma(world.id.base64)?.id.base64).toBe(world.id.base64);

      const fz1 = ns.fuzzyIdOf(task1);
      expect(typeof fz1).toBe('string');
      expect(fz1.length).toBeGreaterThanOrEqual(5);
      expect(ns.getForma(fz1)?.id.base64).toBe(task1.id.base64);

      const fz2 = ns.fuzzyIdOf(task2);
      expect(typeof fz2).toBe('string');
      expect(fz2.length).toBeGreaterThanOrEqual(5);
      expect(ns.getForma(fz2)?.id.base64).toBe(task2.id.base64);
    });
  });

  describe('entityList receives namespace for LEUI fuzzyIds', () => {
    it('should return FormaList with namespace so itemListId returns fuzzyId', () => {
      const list = world.entityList(Task);
      const task1 = list.addItem(new Task({ name: 'task1' }));
      const task2 = list.addItem(new Task({ name: 'task2' }));

      // Get the itemListId for each task
      const id1 = list.itemListId(task1);
      const id2 = list.itemListId(task2);

      // Should be masked fuzzyIds (short, min 5 chars), not full timeIds
      expect(id1.length).toBeGreaterThanOrEqual(5);
      expect(id2.length).toBeGreaterThanOrEqual(5);

      // Should not be the full base64 id (which is much longer)
      expect(id1.length).toBeLessThan(task1.id.base64.length);
      expect(id2.length).toBeLessThan(task2.id.base64.length);

      // Should be resolvable via namespace.getForma
      const ns = world.namespace;
      expect(ns.getForma(id1)).toBe(task1);
      expect(ns.getForma(id2)).toBe(task2);
    });
  });
});

describe('World — resolveFuzzyId()', () => {
  let tempDir: string;
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-test-'));
    worldPath = path.join(tempDir, '.nameforma');
    world = World.fromPath(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns { entity, forma } where entity === forma for world namespace', () => {
    const task = world.entityList(Task).addItem(new Task({ name: 'top-level task' }));

    const result = world.resolveFuzzyId(task.id.base64);

    expect(result).toBeDefined();
    expect(result!.forma).toBe(result!.entity);
    expect(result!.forma.id.base64).toBe(task.id.base64);
  });

  it('returns undefined for unknown fuzzyId', () => {
    const result = world.resolveFuzzyId('nonexistent-id');
    expect(result).toBeUndefined();
  });

  it('task id resolves via world namespace even when task is focused', () => {
    // A task id lives only in the world namespace, never in the focus namespace.
    // This means resolveFuzzyId always returns { entity: task, forma: task } for task ids —
    // entity === forma is the invariant for top-level formas.
    //
    // Architectural note: if a child forma were given the same id as a task (which should
    // be impossible given UUID64 uniqueness), world namespace would win because it is checked
    // first. Overlapping namespaces are not currently possible by construction, but the
    // priority order (world > focus) defines the tiebreak if that assumption ever breaks.
    const task = world.entityList(Task).addItem(new Task({ name: 'focused task' }));
    world.focusManager.focus(task.id);

    const result = world.resolveFuzzyId(task.id.base64);

    expect(result).toBeDefined();
    expect(result!.entity).toBe(result!.forma);
    expect(result!.forma.id.base64).toBe(task.id.base64);
  });

  it('returns { entity: task, forma: action } for action in focused task namespace', () => {
    const task = world.entityList(Task).addItem(new Task({ name: 'parent task' }));
    world.focusManager.focus(task.id);
    const action = task.actions(world).addItem(new Action({ name: 'nested action' }));

    const result = world.resolveFuzzyId(action.id.base64);

    expect(result).toBeDefined();
    expect(result!.entity.id.base64).toBe(task.id.base64);
    expect(result!.forma).toBeInstanceOf(Action);
    expect(result!.forma.id.base64).toBe(action.id.base64);
  });

  it('resolves action after world reload (round-trip serialization)', () => {
    const task = world.entityList(Task).addItem(new Task({ name: 'parent task' }));
    world.focusManager.focus(task.id);
    const action = task.actions(world).addItem(new Action({ name: 'nested action' }));
    world.save();

    const w2 = World.fromPath(worldPath);
    const focused = w2.focusedForma('task') as Task | null;
    w2.focusManager.focus(focused!.id);

    const result = w2.resolveFuzzyId(action.id.base64);

    expect(result).toBeDefined();
    expect(result!.entity.id.base64).toBe(task.id.base64);
    expect(result!.forma.id.base64).toBe(action.id.base64);
  });
});

describe('World — validate()', () => {
  let tempDir: string;
  let worldPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-validate-'));
    worldPath = path.join(tempDir, '.nameforma');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns true when focus stack is empty', () => {
    const world = World.fromPath(worldPath);
    expect(world.validate()).toBe(true);
  });

  it('returns true when all focused entities exist on disk', () => {
    const world = World.fromPath(worldPath);
    const e1 = world.entityList(Task).addItem(new Task({ name: 'e1' }));
    world.focusManager.focus(e1.id);
    expect(world.validate()).toBe(true);
  });

  it('removes stale focus entry and returns false', () => {
    const world = World.fromPath(worldPath);
    const e1 = world.entityList(Task).addItem(new Task({ name: 'e1' }));
    const e2 = world.entityList(Task).addItem(new Task({ name: 'e2' }));
    const e3 = world.entityList(Task).addItem(new Task({ name: 'e3' }));
    world.focusManager.focus(e1.id);
    world.focusManager.focus(e2.id);
    world.focusManager.focus(e3.id);
    expect(world.focusManager.size).toBe(3);

    fs.unlinkSync(path.join(worldPath, 'task', `${e2.id.base64}.json`));

    expect(world.validate()).toBe(false);
    expect(world.focusManager.size).toBe(2);
  });

  it('returns true on second validate after stale entry removed', () => {
    const world = World.fromPath(worldPath);
    const e1 = world.entityList(Task).addItem(new Task({ name: 'e1' }));
    world.focusManager.focus(e1.id);
    fs.unlinkSync(path.join(worldPath, 'task', `${e1.id.base64}.json`));
    expect(world.validate()).toBe(false);
    expect(world.validate()).toBe(true);
  });

});
