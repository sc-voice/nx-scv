import fs from 'fs';
import path from 'path';
import { Text } from '@sc-voice/tools';
import UUID64 from './uuid64.js';
import { DBG } from './defines.js';
import { EntityConstructor, validateEntity } from './entity.js';
import { Identifiable } from './identifiable.js';

const { ColorConsole } = Text;
const { cc } = ColorConsole;
const { WORLD } = DBG;

/**
 * World class manages persistent entity storage in .nameforma/ directory
 * World is a singleton that maintains local preferences and is
 * client-serializable using fromPath() to deserialize.
 * 
 * Storage structure: .nameforma/{entity}/{id}.json
 */
export class World extends Identifiable {
  #worldPath: string;
  #entityRegistry: Map<string, EntityConstructor> = new Map();

  /**
   * Create a World at the given path with optional id
   * @param {string} worldPath - Path to .nameforma/ directory
   * @param {UUID64 | string} id - Optional world id (generates new if not provided)
   */
  constructor(worldPath: string, id?: UUID64 | string) {
    super(id);

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
   * Register an entity class with this world
   * Derives entity name from EntityClass.entity static property
   * @param {EntityConstructor} EntityClass - Entity class with entity, SCHEMA, and fromJson
   * @throws {Error} - If entity missing required static properties
   */
  register(EntityClass: EntityConstructor): void {
    const msg = 'world.register';
    const dbg = WORLD?.REGISTER;

    // Validate entity class has required properties
    validateEntity(EntityClass);

    const entityName = EntityClass.entity;
    this.#entityRegistry.set(entityName, EntityClass);
    dbg && cc.ok1(msg, `registered ${entityName}`);
  }

  /**
   * Get all registered entity names
   * @returns {string[]} - Array of entity names
   */
  getEntityNames(): string[] {
    return Array.from(this.#entityRegistry.keys());
  }

  /**
   * Get entity constructor by name
   * @param {string} name - Entity name
   * @returns {EntityConstructor|null} - Entity constructor or null if not registered
   */
  entityClassOfName(name: string): EntityConstructor | null {
    return this.#entityRegistry.get(name) || null;
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
   * Load entity from world storage using type-driven lookup
   * @template T - Entity constructor type
   * @param {T} EntityClass - Entity class (e.g., Task)
   * @param {UUID64 | string} id - Entity id (UUID64 instance or OPB64 string)
   * @returns {ReturnType<T['fromJson']>|null} - Typed entity instance, or null if not found
   * @throws {Error} - If id validation fails
   */
  loadEntity<T extends EntityConstructor>(EntityClass: T, id: UUID64 | string): ReturnType<T['fromJson']> | null {
    const msg = 'world.loadEntity';
    const dbg = WORLD?.LOAD;

    // Extract entityType from EntityClass.entity
    const entityType = EntityClass.entity;

    // Convert UUID64 to string if needed
    const idStr = typeof id === 'string' ? id : id.toString();

    const filePath = path.join(this.#worldPath, entityType, `${idStr}.json`);
    if (!fs.existsSync(filePath)) {
      dbg && cc.ok1(msg, `not found ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const entity = JSON.parse(data);

    // Validate and reconstruct id as UUID64 POJO
    // After JSON.parse(), entity.id is OPB64 string (from uuid64.toJSON())
    // Reconstruct it as UUID64 POJO so Entity contract (id: UUID64) is satisfied
    if (entity.id) {
      try {
        entity.id = UUID64.fromString(entity.id);
      } catch (err) {
        throw new Error(`${filePath}: invalid id "${entity.id}"`);
      }
    }

    // Reconstruct as typed instance via EntityClass.fromJson
    const typedEntity = EntityClass.fromJson(entity);

    dbg && cc.ok1(msg, `loaded ${filePath}`);
    return typedEntity as ReturnType<T['fromJson']>;
  }

  /**
   * Load entity from world storage using fuzzy id matching
   * @template T - Entity constructor type
   * @param {T} EntityClass - Entity class constructor
   * @param {string} match - Partial or fuzzy id string to match
   * @param {number} levenshtein - Optional fuzzy matching parameter (see Identifiable.idFilter)
   * @returns {ReturnType<T['fromJson']>|null} - Matching typed entity instance, or null if not found
   * @throws {Error} - If levenshtein parameter is out of range or multiple matches found
   *
   * @example
   * const task = world.loadFuzzy(Task, "partial-id", 5); // Type is Task | null
   */
  loadFuzzy<T extends EntityConstructor>(
    EntityClass: T,
    match: string,
    levenshtein?: number
  ): ReturnType<T['fromJson']> | null {
    const msg = 'world.loadFuzzy';
    const dbg = WORLD?.LOAD;

    const entityType = EntityClass.entity;
    const entityDir = path.join(this.#worldPath, entityType);

    if (!fs.existsSync(entityDir)) {
      dbg && cc.ok1(msg, `no entities for ${entityType}`);
      return null;
    }

    // Create filter function for filename matching
    const filter = Identifiable.idFilter(match, levenshtein);

    // Get all .json files and filter by filename (id)
    const files = fs.readdirSync(entityDir).filter((f) => f.endsWith('.json'));
    const matchingFiles = files.filter((file) => filter(file.slice(0, -5)));

    if (matchingFiles.length === 0) {
      dbg && cc.ok1(msg, `no match for ${match} in ${entityType}`);
      return null;
    }

    if (matchingFiles.length > 1) {
      const ids = matchingFiles.map((f) => f.slice(0, -5)).join(', ');
      throw new Error(`${msg}: ambiguous match for "${match}": found ${matchingFiles.length} matches [${ids}]`);
    }

    // Load and reconstruct the matching entity
    const filePath = path.join(entityDir, matchingFiles[0]);
    const data = fs.readFileSync(filePath, 'utf8');
    const entity = JSON.parse(data);

    // Reconstruct id as UUID64 POJO
    if (entity.id) {
      try {
        entity.id = UUID64.fromString(entity.id);
      } catch (err) {
        throw new Error(`${filePath}: invalid id "${entity.id}"`);
      }
    }

    // Reconstruct as typed instance
    const typedEntity = EntityClass.fromJson(entity);

    dbg && cc.ok1(msg, `loaded ${entityType}/${entity.id}`);
    return typedEntity as ReturnType<T['fromJson']>;
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

  /**
   * Load or create World from path
   * Reads .nameforma/world.json if exists, otherwise creates new World
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   */
  static fromPath(worldPath: string): World {
    const msg = 'world.fromPath';
    const dbg = WORLD?.CTOR;

    const worldFile = path.join(worldPath, 'world.json');

    if (fs.existsSync(worldFile)) {
      const data = fs.readFileSync(worldFile, 'utf8');
      const json = JSON.parse(data);
      dbg && cc.ok1(msg, `loaded ${worldFile}`);
      return World.fromJson(json);
    }

    // Create new World
    const world = new World(worldPath);

    // Save world.json with generated id
    const worldData = JSON.stringify(world.toJSON(), null, 2);
    fs.writeFileSync(worldFile, worldData, 'utf8');
    dbg && cc.ok1(msg, `created ${worldFile}`);

    return world;
  }

  /**
   * Serialize World to JSON
   * @returns {object} - JSON representation
   */
  toJSON(): any {
    return {
      id: this.id,
      worldPath: this.#worldPath,
    };
  }

  /**
   * Deserialize World from JSON
   * @param {object} data - JSON data
   * @returns {World} - World instance
   */
  static fromJson(data: any): World {
    if (!data.worldPath) {
      throw new Error('World.fromJson: missing worldPath');
    }
    return new World(data.worldPath, data.id);
  }
}
