import fs from 'fs';
import path from 'path';
import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';

const { ColorConsole } = Text;
const { cc } = ColorConsole;
const { WORLD } = DBG;

/**
 * Abstract World class manages persistent entity storage in .nameforma/ directory
 * Storage structure: .nameforma/{entity}/{id}.json
 */
export class World {
  #worldPath: string;
  #entities: Record<string, any> = {};

  /**
   * Create or load a World at the given path
   * @param {string} worldPath - Path to .nameforma/ directory
   */
  constructor(worldPath: string) {
    const msg = 'world.ctor';
    const dbg = WORLD?.CTOR;

    this.#worldPath = worldPath;

    // Ensure .nameforma directory exists
    if (!fs.existsSync(worldPath)) {
      fs.mkdirSync(worldPath, { recursive: true });
      dbg && cc.ok1(msg, `created ${worldPath}`);
    }

    dbg && cc.ok1(msg, `initialized ${worldPath}`);
  }

  /**
   * Search up filesystem tree for .nameforma/ directory
   * @param {string} startPath - Starting directory
   * @returns {string|null} - Path to .nameforma/ or null if not found
   */
  static findWorld(startPath: string = process.cwd()): string | null {
    const msg = 'world.findWorld';
    const dbg = WORLD?.FIND_WORLD;

    let currentPath = path.resolve(startPath);
    const root = path.parse(currentPath).root;

    while (currentPath !== root) {
      const worldPath = path.join(currentPath, '.nameforma');
      if (fs.existsSync(worldPath)) {
        dbg && cc.ok1(msg, `found ${worldPath}`);
        return worldPath;
      }
      currentPath = path.dirname(currentPath);
    }

    dbg && cc.ok1(msg, `not found from ${startPath}`);
    return null;
  }

  /**
   * Register an entity type with this world
   * @param {string} entityName - Entity name (e.g., 'task')
   * @param {class} EntityClass - Entity class with SCHEMA property
   */
  register(entityName: string, EntityClass: any): void {
    const msg = 'world.register';
    const dbg = WORLD?.REGISTER;

    if (!EntityClass.SCHEMA) {
      throw new Error(`${msg}: ${EntityClass.name} missing SCHEMA property`);
    }

    this.#entities[entityName] = EntityClass;
    dbg && cc.ok1(msg, `registered ${entityName}`);
  }

  /**
   * Save entity to world storage
   * @param {string} entityType - Entity type (e.g., 'task')
   * @param {object} entity - Entity with id
   */
  save(entityType: string, entity: any): void {
    const msg = 'world.save';
    const dbg = WORLD?.SAVE;

    if (!entity?.id) {
      throw new Error(`${msg}: entity missing id`);
    }

    const { id } = entity;
    const entityDir = path.join(this.#worldPath, entityType);

    // Create entity subdirectory on demand
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
      dbg && cc.ok1(msg, `created ${entityDir}`);
    }

    const filePath = path.join(entityDir, `${id}.json`);
    const data = JSON.stringify(entity, null, 2);
    fs.writeFileSync(filePath, data, 'utf8');

    dbg && cc.ok1(msg, `saved ${filePath}`);
  }

  /**
   * Load entity from world storage
   * @param {string} entityType - Entity type (e.g., 'task')
   * @param {string} id - Entity id
   * @returns {object|null} - Parsed entity or null if not found
   */
  load(entityType: string, id: string): any | null {
    const msg = 'world.load';
    const dbg = WORLD?.LOAD;

    const filePath = path.join(this.#worldPath, entityType, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      dbg && cc.ok1(msg, `not found ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const entity = JSON.parse(data);

    dbg && cc.ok1(msg, `loaded ${filePath}`);
    return entity;
  }

  /**
   * List all entities of a given type
   * @param {string} entityType - Entity type (e.g., 'task')
   * @returns {object[]} - Array of parsed entities
   */
  list(entityType: string): any[] {
    const msg = 'world.list';
    const dbg = WORLD?.LIST;

    const entityDir = path.join(this.#worldPath, entityType);
    if (!fs.existsSync(entityDir)) {
      dbg && cc.ok1(msg, `no entities for ${entityType}`);
      return [];
    }

    const files = fs.readdirSync(entityDir).filter((f) => f.endsWith('.json'));
    const entities = files.map((file) => {
      const filePath = path.join(entityDir, file);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    });

    dbg && cc.ok1(msg, `listed ${entities.length} ${entityType}(s)`);
    return entities;
  }

  /**
   * Delete entity from world storage
   * @param {string} entityType - Entity type (e.g., 'task')
   * @param {string} id - Entity id
   */
  delete(entityType: string, id: string): void {
    const msg = 'world.delete';
    const dbg = WORLD?.DELETE;

    const filePath = path.join(this.#worldPath, entityType, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      dbg && cc.ok1(msg, `not found ${filePath}`);
      return;
    }

    fs.unlinkSync(filePath);
    dbg && cc.ok1(msg, `deleted ${filePath}`);
  }

  /**
   * Get world path
   * @returns {string}
   */
  get worldPath(): string {
    return this.#worldPath;
  }
}

/**
 * Concrete TaskWorld manages Task entity storage
 */
export class TaskWorld extends World {
  constructor(worldPath: string) {
    super(worldPath);
    const msg = 'taskworld.ctor';
    const dbg = WORLD?.CTOR;

    // Register Task entity synchronously
    // Task is imported dynamically to avoid circular imports at module load
    (async () => {
      const { Task } = await import('./task.js');
      this.register('task', Task);
      dbg && cc.ok1(msg, 'registered Task entity');
    })();
  }
}
