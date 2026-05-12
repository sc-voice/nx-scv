import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'node:events';
import { Text } from '@sc-voice/tools';
import UUID64 from './uuid64.js';
import { DBG } from './defines.js';
import {
  EntityConstructor,
  validateEntity,
  STANDARD_ENTITIES,
} from './entity.js';
import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import {
  FormaList,
  type IFormaItem,
  type IEventBus,
  type FormaListEvent,
} from './forma-list.js';
import { Focus } from './focus.js';
import { NfUrl } from './nf-url.js';
import { FuzzyNamespace, type INamespaced, type IFuzzyNamespace } from './fuzzy-namespace.js';

const { ColorConsole } = Text;
const { cc } = ColorConsole;
const { WORLD } = DBG;

/**
 * World class manages persistent entity storage in .nameforma/ directory
 * World is a singleton that maintains local preferences and is
 * client-serializable using fromPath() to deserialize.
 *
 * Storage structure: .nameforma/{entity}/{id}.json
 *
 * Implements IEventBus to receive FormaList mutation events and
 * automatically persist changes to disk.
 */
interface HistoryEntry {
  timestamp: string;
  user: 'agent' | 'human';
  command: string;
}

export class World extends Forma implements IEventBus, INamespaced {
  #worldPath: string;
  #entityRegistry: Map<string, EntityConstructor> = new Map();
  #numeronym: Map<string, string> = new Map();
  #focusStack: FormaList<Focus>;
  #bus: EventEmitter;
  #history: HistoryEntry[] = [];
  #namespace: FuzzyNamespace;

  // Export Focus class for use elsewhere
  static Focus = Focus;

  /**
   * Create a World at the given path with optional id
   * @param {string} worldPath - Path to .nameforma/ directory
   * @param {UUID64 | string} id - Optional world id (generates new if not provided)
   */
  constructor(worldPath: string, id?: UUID64 | string) {
    const worldRoot = path.dirname(worldPath);
    const nfUrl = new NfUrl(worldRoot, '~');
    const name = nfUrl.uri;
    super({ id, name, summary: worldPath });
    //super({id, name:worldPath.split("/").at(-1), summary:worldPath});

    const msg = 'world.ctor';
    const dbg = WORLD?.CTOR;

    this.#worldPath = worldPath;
    this.#namespace = new FuzzyNamespace();
    this.#focusStack = new FormaList<Focus>(
      [],
      Focus as any,
      { keyField: 'formaId' },
    );
    this.#bus = new EventEmitter();

    // Register standard entities
    for (const EntityClass of STANDARD_ENTITIES) {
      this.registerEntity(EntityClass);
    }

    // Populate namespace with existing tasks
    this.#populateNamespace();

    // Ensure .nameforma directory exists
    if (!fs.existsSync(worldPath)) {
      fs.mkdirSync(worldPath, { recursive: true });
      dbg && cc.ok1(msg, `created ${worldPath}`);
    }

    // Wire persistence listener for FormaList mutations
    this.#bus.on('change', (event: FormaListEvent<any>) => {
      const dbg = WORLD?.EVENT || WORLD?.ALL;
      const msg = 'w3d.#bus.change' + event.type;
      const { entity } = event;

      if (!entity) {
        return; // No entity to persist
      }

      const entityType = (entity.constructor as any).entity;
      if (!entityType) {
        dbg && cc.bad1(`${msg} entity missing entity type`, entity);
        return;
      }

      switch (event.type) {
        case 'add':
        case 'patch':
          dbg &&
            cc.ok(`${msg} ${entityType}: ${entity.id.toString()}`, event);
          this.#saveEntity(entityType, entity);
          if (entityType === 'task') {
            this.#namespace.removeForma(entity.id.base64);
            this.#namespace.addForma(entity);
          }
          break;
        case 'delete':
          // Check if the item being deleted is itself an entity (top-level)
          // or if it's a nested item (child of entity, like Action of Task)
          const itemIsEntity = !!(event.item?.constructor as any).entity;
          if (itemIsEntity) {
            // Top-level entity deletion: delete the entity file
            dbg &&
              cc.ok(
                `${msg} ${entityType}: ${entity.id.toString()}`,
                event,
              );
            this.delete(entityType, entity.id.base64);
          } else {
            // Nested item deletion: save the parent entity with updated children
            dbg &&
              cc.ok(
                `${msg} nested item deleted, saving parent ${entityType}: ${entity.id.toString()}`,
                event,
              );
            this.#saveEntity(entityType, entity);
            if (entityType === 'task') {
              this.#namespace.removeForma(entity.id.base64);
              this.#namespace.addForma(entity);
            }
          }
          break;
        case 'move':
          // Move doesn't require persistence (order changes don't persist)
          break;
        default:
          dbg && cc.bad1(`${msg} unknown event type`, event);
          break;
      }
    });

    dbg && cc.ok1(msg, `initialized ${worldPath}`);
  }

  /**
   * Populate namespace with all Task entities from disk
   */
  #populateNamespace(): void {
    const msg = 'world.#populateNamespace';
    const dbg = WORLD?.ALL;

    // Import Task class dynamically to avoid circular dependency
    const Task = this.entityClassOfName('task');
    if (!Task) {
      dbg && cc.ok1(msg, 'task entity not registered');
      return;
    }

    const taskDir = path.join(this.#worldPath, 'task');
    if (!fs.existsSync(taskDir)) {
      dbg && cc.ok1(msg, 'no tasks directory');
      return;
    }

    const files = fs
      .readdirSync(taskDir)
      .filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(taskDir, file);
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const entity = JSON.parse(data);

        if (entity.id) {
          try {
            entity.id = UUID64.fromString(entity.id);
          } catch (err) {
            dbg && cc.bad1(`${msg} invalid id in ${filePath}`, entity.id);
            continue;
          }
        }

        const task = Task.fromJson(entity);
        this.#namespace.addForma(task);
      } catch (err) {
        dbg && cc.bad1(`${msg} failed to load ${filePath}`, err);
      }
    }

    dbg && cc.ok1(msg, `loaded ${files.length} tasks`);
  }

  /**
   * Implement INamespaced: return the namespace of tasks
   */
  namespace(): IFuzzyNamespace {
    return this.#namespace;
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
   * @param {EntityConstructor} EntityClass - Entity class with entity, avroSchema, and fromJson
   * @throws {Error} - If entity missing required static properties
   */
  registerEntity(EntityClass: EntityConstructor): void {
    const msg = 'world.registerEntity';
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
   * Save entity to world storage (internal API, use entityList.addItem/patchItem instead)
   * @param {string} entityType - Entity type (e.g., 'task')
   * @param {object} entity - Entity with id
   */
  #saveEntity(entityType: string, entity: any): void {
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
   * Save World state to world.json
   * Creates .nameforma/ directory if missing
   */
  save(): void {
    const msg = 'world.save';
    const dbg = WORLD?.SAVE;

    // Ensure .nameforma directory exists
    if (!fs.existsSync(this.#worldPath)) {
      fs.mkdirSync(this.#worldPath, { recursive: true });
      dbg && cc.ok1(msg, `created ${this.#worldPath}`);
    }

    const worldFile = path.join(this.#worldPath, 'world.json');
    const data = JSON.stringify(this.toJSON(), null, 2);
    fs.writeFileSync(worldFile, data, 'utf8');

    dbg && cc.ok1(msg, `saved ${worldFile}`);
  }

  /**
   * Reload mutable state (focusStack, numeronym, history) from world.json.
   * Used to refresh a long-lived World instance after external writes.
   */
  sync(): void {
    const worldFile = path.join(this.#worldPath, 'world.json');
    if (!fs.existsSync(worldFile)) return;

    const data = JSON.parse(fs.readFileSync(worldFile, 'utf8'));

    if (data.numeronym && typeof data.numeronym === 'object') {
      this.#numeronym = new Map(Object.entries(data.numeronym));
    }

    if (data.focusStack && Array.isArray(data.focusStack)) {
      const focuses = data.focusStack.map((f: any) =>
        Focus.fromJson({
          id: f.id,
          formaId: f.formaId,
          formaType: f.formaType,
          name: f.name,
          summary: f.summary,
        }),
      );
      this.#focusStack = new FormaList<Focus>(
        focuses,
        Focus as any,
        { keyField: 'formaId' },
      );
    }

    if (data.history && Array.isArray(data.history)) {
      this.#history = data.history.filter(
        (e: any) =>
          e.timestamp &&
          (e.user === 'agent' || e.user === 'human') &&
          e.command,
      );
    }
  }

  /**
   * Load World state from world.json
   * Validates that world.json exists and contains valid id.
   * @returns {World} - Returns this for method chaining
   * @throws {Error} - If world.json does not exist or is invalid
   */
  load(): World {
    const msg = 'world.load';
    const dbg = WORLD?.LOAD;

    const worldFile = path.join(this.#worldPath, 'world.json');

    if (!fs.existsSync(worldFile)) {
      throw new Error(`${msg}: world.json not found at ${worldFile}`);
    }

    const data = fs.readFileSync(worldFile, 'utf8');
    const json = JSON.parse(data);

    // Verify id exists in loaded data
    if (!json.id) {
      throw new Error(`${msg}: world.json missing id`);
    }

    dbg && cc.ok1(msg, `loaded ${worldFile}`);

    return this;
  }

  /**
   * Load entity from world storage using type-driven lookup
   * @template T - Entity constructor type
   * @param {T} EntityClass - Entity class (e.g., Task)
   * @param {UUID64 | string} id - Entity id (UUID64 instance or OPB64 string)
   * @returns {ReturnType<T['fromJson']>|null} - Typed entity instance, or null if not found
   * @throws {Error} - If id validation fails
   */
  loadEntity<T extends EntityConstructor>(
    EntityClass: T,
    id: UUID64 | string,
  ): ReturnType<T['fromJson']> | null {
    const msg = 'world.loadEntity';
    const dbg = WORLD?.LOAD;

    // Extract entityType from EntityClass.entity
    const entityType = EntityClass.entity;

    // Convert UUID64 to string if needed
    const idStr = typeof id === 'string' ? id : id.toString();

    const filePath = path.join(
      this.#worldPath,
      entityType,
      `${idStr}.json`,
    );
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
   * Load any forma from world storage using fuzzy id matching
   * Tries all registered entity types and returns first match
   * @param {string} match - Partial or fuzzy id string to match
   * @param {number} levenshtein - Optional fuzzy matching parameter (see Identifiable.idFilter)
   * @returns {any} - Matching forma instance, or null if not found
   *
   * @example
   * const forma = world.loadFuzzyForma("partial-id"); // Could be Task, Action, etc.
   */
  loadFuzzyForma(match: string, levenshtein?: number): any {
    for (const entityName of this.getEntityNames()) {
      const EntityClass = this.entityClassOfName(entityName);
      if (!EntityClass) continue;
      try {
        return this.loadFuzzy(EntityClass, match, levenshtein);
      } catch {
        // Not found in this type, try next
      }
    }
    return null;
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
    levenshtein?: number,
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
    const files = fs
      .readdirSync(entityDir)
      .filter((f) => f.endsWith('.json'));
    const matchingFiles = files.filter((file) =>
      filter(file.slice(0, -5)),
    );

    if (matchingFiles.length === 0) {
      dbg && cc.ok1(msg, `no match for ${match} in ${entityType}`);
      return null;
    }

    if (matchingFiles.length > 1) {
      const ids = matchingFiles.map((f) => f.slice(0, -5)).join(', ');
      throw new Error(
        `${msg}: ambiguous match for "${match}": found ${matchingFiles.length} matches [${ids}]`,
      );
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
   * @deprecated (see entityList)
   */
  list(entityType: string): any[] {
    const msg = 'world.list';
    const dbg = WORLD?.LIST;

    const entityDir = path.join(this.#worldPath, entityType);
    if (!fs.existsSync(entityDir)) {
      dbg && cc.ok1(msg, `no entities for ${entityType}`);
      return [];
    }

    const files = fs
      .readdirSync(entityDir)
      .filter((f) => f.endsWith('.json'));
    const entities = files.map((file) => {
      const filePath = path.join(entityDir, file);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    });

    dbg && cc.ok1(msg, `listed ${entities.length} ${entityType}(s)`);
    return entities;
  }

  /**
   * Load entities of a given type as a FormaList for CRUD operations
   * Reconstructs entity.id as UUID64 POJO and returns typed FormaList
   * @template T - Entity constructor type
   * @param {T} EntityClass - Entity class (e.g., Task)
   * @returns {FormaList<ReturnType<T['fromJson']>>} - FormaList of typed entities
   *
   * @example
   * const taskList = world.entityList(Task);
   * for (const task of taskList) {
   *   console.log(task.title);
   * }
   */
  entityList<T extends EntityConstructor>(
    EntityClass: T,
  ): FormaList<ReturnType<T['fromJson']>> {
    const msg = 'world.entityList';
    const dbg = WORLD?.LIST;

    const entityType = EntityClass.entity;
    const entityDir = path.join(this.#worldPath, entityType);
    const items: ReturnType<T['fromJson']>[] = [];

    if (fs.existsSync(entityDir)) {
      const files = fs
        .readdirSync(entityDir)
        .filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(entityDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const entity = JSON.parse(data);

        // Reconstruct id as UUID64 POJO (consistent with loadEntity/loadFuzzy)
        if (entity.id) {
          try {
            entity.id = UUID64.fromString(entity.id);
          } catch (err) {
            throw new Error(`${filePath}: invalid id "${entity.id}"`);
          }
        }

        // Reconstruct as typed instance
        const typedEntity = EntityClass.fromJson(entity);
        items.push(typedEntity as ReturnType<T['fromJson']>);
      }
    }

    dbg &&
      cc.ok1(msg, `loaded ${items.length} ${entityType}(s) as FormaList`);
    return new FormaList<ReturnType<T['fromJson']>>(
      items,
      EntityClass as any,
      { emitter: this, namespace: this.#namespace },
    );
  }

  /**
   * Delete entity from world storage and remove from focus stack
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

    // Remove from namespace if task
    if (entityType === 'task') {
      this.#namespace.removeForma(id);
    }

    // Remove from focus stack if present
    try {
      this.#focusStack.deleteItem(id);
    } catch {
      // Not in focus stack, that's fine
    }

    fs.unlinkSync(filePath);
    dbg && cc.ok1(msg, `deleted ${filePath}`);
  }

  /**
   * Emit event to all registered listeners
   * @param event - Event name
   * @param payload - Event payload
   */
  emit(event: string, payload: any): boolean {
    return this.#bus.emit(event, payload);
  }

  /**
   * Register event listener
   * @param event - Event name
   * @param listener - Listener function
   */
  on(event: string, listener: (payload: any) => void): this {
    this.#bus.on(event, listener);
    return this;
  }

  /**
   * Get world path
   * @returns {string}
   */
  get worldPath(): string {
    return this.#worldPath;
  }

  /**
   * Get focus order (index in focusStack by forma id, 0 = most recent)
   * @param {Forma} ent - Forma or Focus entity
   * @returns {number} - 0-based index if forma is focused (0=most recent), Number.MAX_SAFE_INTEGER if not
   */
  focusOrder(ent: Forma): number {
    // For Focus items (which have formaId), lookup by formaId
    // For regular Forma items (Task, etc.), lookup by id
    const isFocus = ent instanceof Focus;
    const lookupId = isFocus ? (ent as any).formaId : ent.id;
    const lookupIdStr =
      typeof lookupId === 'string' ? lookupId : lookupId.base64;

    const items = Array.from(this.#focusStack);
    // Most recent is at end of FormaList, so iterate backwards
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].formaId.base64 === lookupIdStr) {
        return items.length - 1 - i; // Position from most recent
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * Focus a forma (push to top of stack, move if already focused)
   * @param {Forma} forma - Forma to focus
   */
  focusForma(forma: any): void {
    const formaIdStr = forma.id.base64;

    // Remove if already in stack (by formaId)
    try {
      this.#focusStack.deleteItem(formaIdStr);
    } catch {
      // Not in stack, that's fine
    }

    // Create new Focus entry from entity and add to stack
    const focus = Focus.fromEntity(forma);
    this.#focusStack.addItem(focus);
  }

  /**
   * Unfocus a forma (remove from stack)
   * @param {Forma} forma - Forma to unfocus
   */
  unfocusForma(forma: any): void {
    const formaIdStr = forma.id.base64;
    try {
      this.#focusStack.deleteItem(formaIdStr);
    } catch {
      // Not in stack, that's fine
    }
  }

  /**
   * Get focused forma of a given type (most recent)
   * @param {string} formaType - Type name (e.g., 'task')
   * @returns {Focus|null} - Focus entry or null
   */
  focusedForma(formaType: string): Focus | null {
    // Most recent is at end of FormaList, iterate backwards
    const items = Array.from(this.#focusStack);
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].formaType === formaType) {
        return items[i];
      }
    }
    return null;
  }

  /**
   * Get focusStack as FormaList, ordered by recency (newest first)
   * @returns {FormaList<Focus>} - FormaList of focuses in reverse chronological order
   */
  get focusStack(): FormaList<Focus> {
    // Return new FormaList with items reversed (most recent first)
    const items = Array.from(this.#focusStack).reverse();
    return new FormaList<Focus>(
      items,
      Focus as any,
      { keyField: 'formaId' },
    );
  }

  /**
   * Remove stale entries from focusStack where backing entity no longer exists
   * @returns {boolean} - true if any entries were removed, false otherwise
   */
  override validate(opts: any = {}): boolean {
    let result = super.validate(opts);

    const msg = 'w3d.validate';
    const before = Array.from(this.#focusStack);
    const valid = before.filter((focus) => {
      try {
        const EntityClass = this.entityClassOfName(focus.formaType);
        if (!EntityClass) return false;
        return this.loadEntity(EntityClass, focus.formaId) !== null;
      } catch {
        return false;
      }
    });
    if (valid.length === before.length) return false;
    this.#focusStack = new FormaList<Focus>(
      valid,
      Focus as any,
      { keyField: 'formaId' },
    );
    if (before.length - valid.length > 0) {
      console.warn(
        `Cleaned ${before.length - valid.length} stale focus entries`,
      );
    }
    return result;
  }

  /**
   * Log a command to history (max 10 entries). Called after successful execution.
   * @param {string} cmd - The command that was executed
   * @param {string} user - 'agent' or 'human'
   */
  logCommand(cmd: string, user: 'agent' | 'human' = 'human'): void {
    const entry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      user,
      command: cmd,
    };
    this.#history.unshift(entry);
    if (this.#history.length > 10) {
      this.#history.pop();
    }
    this.save();
  }

  /**
   * Get command history
   */
  get history(): HistoryEntry[] {
    return [...this.#history];
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
      return World.fromJson(json, worldPath);
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
   * Get numeronym map
   * @returns {Map<string, string>} - Map of numeronyms
   */
  getNumeronym(): Map<string, string> {
    return this.#numeronym;
  }

  /**
   * Set numeronym map
   * @param {Map<string, string>} numeronym - Map of numeronyms
   */
  setNumeronym(numeronym: Map<string, string>): void {
    this.#numeronym = numeronym;
  }

  /**
   * Serialize World to JSON
   * Only stores enumerable fields
   * @returns {object} - JSON representation
   */
  toJSON(): any {
    this.validate();
    return {
      focusStack: Array.from(this.#focusStack).map((f) => ({
        id: f.id.toString(),
        formaId: f.formaId.toString(),
        formaType: f.formaType,
        name: f.name,
        summary: f.summary,
      })),
      id: this.id,
      numeronym: Object.fromEntries(this.#numeronym),
      history: this.#history,
    };
  }

  /**
   * Deserialize World from JSON
   * @param {object} data - JSON data with id and optional numeronym and focusStack
   * @param {string} baseDir - Base directory containing world.json (the .nameforma directory)
   * @returns {World} - World instance with worldPath set to baseDir
   */
  static fromJson(data: any, baseDir?: string): World {
    if (!data.id) {
      throw new Error('World.fromJson: missing id');
    }

    // worldPath is the directory containing world.json
    const worldPath = baseDir || '.';

    const world = new World(worldPath, data.id);

    // Restore numeronym map if present
    if (data.numeronym && typeof data.numeronym === 'object') {
      world.#numeronym = new Map(Object.entries(data.numeronym));
    }

    // Restore focusStack if present
    if (data.focusStack && Array.isArray(data.focusStack)) {
      const focuses = data.focusStack.map((f: any) =>
        Focus.fromJson({
          id: f.id,
          formaId: f.formaId,
          formaType: f.formaType,
          name: f.name,
          summary: f.summary,
        }),
      );
      world.#focusStack = new FormaList<Focus>(
        focuses,
        Focus as any,
        { keyField: 'formaId' },
      );
    }

    // Restore history if present
    if (data.history && Array.isArray(data.history)) {
      world.#history = data.history.filter(
        (entry: any) =>
          entry.timestamp &&
          (entry.user === 'agent' || entry.user === 'human') &&
          entry.command,
      );
    }

    return world;
  }
}
