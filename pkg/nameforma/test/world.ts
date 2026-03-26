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
    this.put(cfg);
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
