import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'node:events';
import { Text } from '@sc-voice/tools';
import UUID64 from './uuid64.js';
import { DBG } from './defines.js';
import {
  Entity,
  type IEntity,
  type IEntityRepository,
  validateEntity,
} from './entity.js';
import { Task } from './task.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { Identifiable } from './identifiable.js';
import { Forma, type Constructor } from './forma.js';
import { FormaField } from './forma-field.js';
import { User } from './user.js';
import { GitCLI } from './git-cli.js';
import {
  FormaList,
  type IEventBus,
  type FormaListEvent,
} from './forma-list.js';
import { Focus } from './focus.js';
import { FocusManager, type IFocusManager } from './focus-manager.js';
import { NfUrl } from './nf-url.js';
import {
  RenderData,
  RenderRow,
  RenderDetail,
  IRenderable,
  IView,
  ZenoCoord,
  ZenoStep,
  ZENO_1_ROW_TERSE,
  ZENO_1_ROW_VERBOSE,
  ZENO_3_ROWS,
  zenoStepToLines,
  linesToZenoStep,
} from './navigable-view.js';
import { RenderBuffer } from './render-buffer.js';
import RGA64Watermark from './rga64-watermark.js';
import RGA64Stack from './rga64-stack.js';

const { ColorConsole } = Text;
const { cc } = ColorConsole;
const { WORLD } = DBG;

const THROTTLE = { watermark: 0 };
const theme = NameFormaTheme.shared;

/**
 * Standard entities registered by default in World
 */

/**
 * World is a singleton that manages persistent entity storage
 * using IEntityRepository
 *
 * Implements IEventBus to receive FormaList mutation events and
 * automatically persist changes to disk.
 */
export class World extends Entity implements IEventBus {
  static #lastWorld: World | undefined;

  readonly repository: IEntityRepository;
  #worldPath: string;
  #gitCLI: GitCLI;
  #entityRegistry: Map<string, IEntity> = new Map();
  #numeronym: Map<string, string> = new Map();
  #focusManager: FocusManager;
  #watermark: RGA64Watermark;
  #bus: EventEmitter;
  lastSyncTime: number;
  #logFile: string;

  // UUID64 signature of the non-specific world (@see log)
  static readonly NO_WORLD = '_NO_WORLD_NW';

  // Export Focus class for use elsewhere
  static Focus = Focus;

  /**
   * Create a World at the given path with optional id (internal use only)
   * Use FileRepository.worldFromPath() to get or create a World instance.
   * @param {string} worldPath - Path to .nameforma/ directory
   * @param {UUID64 | string} id - Optional world id (generates new if not provided)
   */
  constructor(
    worldPath: string,
    repository: IEntityRepository,
    id: UUID64 | string = new UUID64(),
  ) {
    const worldRoot = path.dirname(worldPath);

    // Try to use package.json name/description as defaults
    let name: string | undefined;
    let summary: string | undefined;
    try {
      const packageJsonPath = path.join(worldRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        name = pkg.name;
        summary = pkg.description;
      }
    } catch (err) {
      // Silently ignore package.json read errors
    }

    // Fallback to path-based defaults
    if (!name) {
      const nfUrl = new NfUrl(worldRoot, '~');
      name = nfUrl.uri;
    }
    if (!summary) {
      summary = worldPath;
    }

    super({ id, name, summary });

    const msg = 'world.ctor';
    const dbg = WORLD?.CTOR;

    this.repository = repository;
    this.#worldPath = worldPath;
    this.#gitCLI = new GitCLI(path.dirname(worldPath));
    this.#watermark = new RGA64Watermark();
    this.#focusManager = new FocusManager();
    this.#bus = new EventEmitter();
    this.lastSyncTime = 0;
    this.#logFile = path.join(worldPath, 'nf.log');

    // Register standard entities
    this.registerEntity(Task);

    // Ensure .nameforma directory exists
    if (!fs.existsSync(worldPath)) {
      fs.mkdirSync(worldPath, { recursive: true });
      dbg && cc.ok1(msg, `created ${worldPath}`);
    }

    // Wire persistence listener for FormaList mutations
    this.#bus.on('change', async (event: FormaListEvent<any>) => {
      const dbg = WORLD?.EVENT || WORLD?.ALL;
      const msg = 'w3d.#bus.change' + event.type;
      const { entity } = event;

      if (!entity) {
        return; // No entity to persist
      }

      const entityType = (entity.constructor as any).collection;
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
            this.mutableNamespace.removeForma(entity.id.base64);
            this.mutableNamespace.addForma(entity);
          }
          break;
        case 'delete':
          // Check if the item being deleted is itself an entity (top-level)
          // or if it's a nested item (child of entity, like Action of Task)
          const itemIsEntity = !!(event.item?.constructor as any)
            .collection;
          if (itemIsEntity) {
            // Top-level entity deletion: delete the entity file
            dbg &&
              cc.ok(
                `${msg} ${entityType}: ${entity.id.toString()}`,
                event,
              );
            await this.delete(entityType, entity.id.base64);
          } else {
            // Nested item deletion: save the parent entity with updated children
            dbg &&
              cc.ok(
                `${msg} nested item deleted, saving parent ${entityType}: ${entity.id.toString()}`,
                event,
              );
            this.#saveEntity(entityType, entity);
            if (entityType === 'task') {
              this.mutableNamespace.removeForma(entity.id.base64);
              this.mutableNamespace.addForma(entity);
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
    this.log('initialized', new Date().toISOString());
    World.#lastWorld = this;
  }

  /**
   * Populate namespace with all entities from disk based on registered IEntitys
   */
  protected override populateNamespace(): void {
    const msg = 'world.populateNamespace';
    const dbg = WORLD?.ALL;

    const entityNames = this.getEntityNames();
    let totalLoaded = 0;

    for (const entityTypeName of entityNames) {
      const entityDir = path.join(this.#worldPath, entityTypeName);
      if (!fs.existsSync(entityDir)) {
        dbg && cc.ok1(msg, `no ${entityTypeName} directory`);
        continue;
      }

      const files = fs
        .readdirSync(entityDir)
        .filter((f) => f.endsWith('.json'));

      const IEntity = this.entityClassOfName(entityTypeName);
      if (!IEntity) {
        dbg && cc.bad1(msg, `no IEntity for ${entityTypeName}`);
        continue;
      }

      for (const file of files) {
        const filePath = path.join(entityDir, file);
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const entity = JSON.parse(data);

          if (entity.id) {
            try {
              entity.id = UUID64.fromString(entity.id);
            } catch (err) {
              dbg &&
                cc.bad1(`${msg} invalid id in ${filePath}`, entity.id);
              continue;
            }
          }

          const instance = IEntity.fromJson(entity);
          this.addToNamespace(instance);
          totalLoaded++;
        } catch (err) {
          dbg && cc.bad1(`${msg} failed to load ${filePath}`, err);
        }
      }

      dbg &&
        cc.ok1(msg, `loaded ${files.length} ${entityTypeName} entities`);
    }
    // add self
    this.addToNamespace(this);

    dbg && cc.ok1(msg, `total loaded ${totalLoaded} entities`);
  }

  /** Append Forma message to nf.log */
  logForma(forma: Forma, ...strs: string[]) {
    const msg = strs.join(' ');
    const id = UUID64.createRelatedId(forma.id);
    fs.appendFileSync(this.#logFile, `${id}: ${msg}\n`);
  }

  /** Append World message to nf.log */
  log(...strs: string[]) {
    const msg = strs.join(' ');
    if (fs.existsSync(this.#worldPath)) {
      this.logForma(this, msg);
    } else {
      // Ignore messages for orphaned worlds.
      // Tests create orphaned worlds
    }
  }

  /** Log messages independent of any world.
   * Use this sparingly to track pre-world creation events
   * The nf.log file will be created within the cwd hierarchy
   * or within the cwd itself if cws has no valid worldPath.
   */
  static log(...strs: string[]) {
    if (World.#lastWorld != null) {
      // World is normally a singleton except in testing, which needs
      // creates multiple worlds. Using #lastWorld provides diagnostic
      // logs for testing.
      World.#lastWorld.log(...strs);
      return;
    }

    // Usecase1: logging before world creation (Production)
    // Usecase2: logging before first test world creation (Test)
    const msg = strs.join(' ');
    const id = UUID64.forSignature(World.NO_WORLD);
    const worldPath = World.findWorld();
    const logFile = path.join(worldPath ?? process.cwd(), 'nf.log');
    fs.appendFileSync(logFile, `${id}: ${msg}\n`);
  }

  /**
   * Resolve fuzzy ID with world namespace as primary, focused entity's namespace as secondary.
   * Verifies against RGA64Stack implementation.
   * @param {string} fuzzyId - Fuzzy ID to resolve
   * @returns {{ entity: Forma, forma: Forma } | undefined} - entity is the serializing entity; forma is the matched forma
   */
  resolveFuzzyId(
    fuzzyId: string,
  ): { entity: Forma; forma: Forma } | undefined {
    const msg = 'world.resolveFuzzyId';
    const dbg = WORLD?.FUZZY_ID;

    // Get focused entity
    const focusId = this.#focusManager.peek();
    const focusedEntity = focusId
      ? this.namespace.getForma(focusId.base64)
      : null;

    // Primary namespace is in focused entity
    if (focusedEntity) {
      const nsPrimary = (focusedEntity as any)?.namespace;
      const forma = nsPrimary.getForma(fuzzyId);
      if (forma) {
        dbg &&
          cc.ok1(msg, `found in focused entity namespace: ${fuzzyId}`);
        return { entity: focusedEntity, forma };
      }
    }

    // Secondary namespace is the world
    const nsSecondary = this.namespace;
    const forma = nsSecondary.getForma(fuzzyId);
    if (forma) {
      dbg && cc.ok1(msg, `found in world namespace: ${fuzzyId}`);
      return { entity: forma, forma };
    }

    dbg && cc.bad1(msg, `not found: ${fuzzyId}`);
    return undefined;
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
   * Derives entity name from EntityClass.collection static property
   * @param {IEntity} EntityClass - Entity class with entity, avroSchema, and fromJson
   * @throws {Error} - If entity missing required static properties
   */
  registerEntity(EntityClass: IEntity): void {
    const msg = 'world.registerEntity';
    const dbg = WORLD?.REGISTER;

    // Validate entity class has required properties
    validateEntity(EntityClass);

    const collection = EntityClass.collection;
    this.#entityRegistry.set(collection, EntityClass);
    dbg && cc.ok1(msg, `registered collection: ${collection}`);
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
   * @returns {IEntity|null} - Entity constructor or null if not registered
   */
  entityClassOfName(name: string): IEntity | null {
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
  async save(): Promise<void> {
    await this.repository.saveWorld(this);
  }

  /**
   * Synchronize namespace with filesystem state, maintaining 1-to-1 invariant.
   *
   * World maintains that namespace entities are exactly those on disk. External
   * processes may add/modify/delete entity files; sync() reconciles these changes:
   * - Reloads entities modified after lastSyncTime
   * - Adds entities that don't exist in namespace
   * - Removes entities whose backing files were deleted
   *
   * Also reloads mutable state (focusManager, numeronym, watermark) from world.json.
   *
   * Intended for polling scenarios (e.g., nf-watch) where a long-lived World
   * instance needs to stay current with external writes. Called automatically
   * by fromPath() on world creation/load.
   *
   * Updates lastSyncTime to now after reconciliation.
   */
  async syncRepository(): Promise<void> {
    const msg = 'world.syncRepository';
    const dbg = WORLD.SYNC_REPOSITORY;

    // Reload mutable state from world.json
    const worldFile = path.join(this.#worldPath, 'world.json');
    if (fs.existsSync(worldFile)) {
      const data = JSON.parse(fs.readFileSync(worldFile, 'utf8'));

      if (data.numeronym && typeof data.numeronym === 'object') {
        this.#numeronym = new Map(Object.entries(data.numeronym));
      }

      if (data.watermark && typeof data.watermark === 'object') {
        this.#watermark = RGA64Watermark.fromJSON(data.watermark);
      }

      if (data.focusManager) {
        this.#focusManager = FocusManager.fromJSON(data.focusManager);
      }
    }

    // Reconcile filesystem entities with namespace
    const syncStart = this.lastSyncTime;

    // Collect all filesystem entities and track which ones we've seen
    const filesystemEntities = new Map<string, any>();

    await this.syncFocusManager();

    for (const entityTypeName of this.getEntityNames()) {
      const entityDir = path.join(this.#worldPath, entityTypeName);
      if (!fs.existsSync(entityDir)) continue;

      const IEntity = this.entityClassOfName(entityTypeName);
      if (!IEntity) continue;

      const files = fs
        .readdirSync(entityDir)
        .filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(entityDir, file);
        const stats = fs.statSync(filePath);
        const idStr = file.slice(0, -5);

        // Check if file was modified since last sync OR is not in namespace
        const inNamespace = this.namespace.getForma(idStr);
        const needsReload = stats.mtimeMs > syncStart || !inNamespace;

        if (needsReload) {
          try {
            const data = fs.readFileSync(filePath, 'utf8');
            const entity = JSON.parse(data);

            // Reconstruct id as UUID64 POJO
            if (entity.id) {
              try {
                entity.id = UUID64.fromString(entity.id);
              } catch (err) {
                dbg &&
                  cc.bad1(`${msg} invalid id in ${filePath}`, entity.id);
                continue;
              }
            }

            // Reconstruct as typed instance
            const typedEntity = IEntity.fromJson(entity);
            filesystemEntities.set(idStr, typedEntity);

            // Add or replace in namespace
            if (inNamespace) {
              this.mutableNamespace.removeForma(idStr);
            }
            this.mutableNamespace.addForma(typedEntity);

            dbg &&
              cc.ok(
                `${msg} ${entityTypeName} ${idStr} ${inNamespace ? 'reloaded' : 'added'}`,
              );
          } catch (err) {
            dbg && cc.bad1(`${msg} failed to load ${filePath}`, err);
          }
        } else {
          filesystemEntities.set(idStr, inNamespace);
        }
      }
    }

    // Ensure world is in namespace and won't be removed during sync
    if (!this.namespace.getForma(this.id.base64)) {
      this.addToNamespace(this);
    }
    filesystemEntities.set(this.id.base64, this);

    // Remove entities from namespace that no longer exist on filesystem
    for (const [fuzzyId, forma] of this.namespace) {
      const idStr = forma.id.base64;
      if (!filesystemEntities.has(idStr)) {
        this.mutableNamespace.removeForma(idStr);
        dbg && cc.ok(`${msg} removed stale ${idStr}`);
      }
    }

    // Update sync cursor
    this.lastSyncTime = Date.now();
    dbg && cc.ok1(msg, `synchronized namespace with filesystem`);
  }

  /**
   * Load entity from world storage using type-driven lookup
   * @template T - Entity constructor type
   * @param {T} EntityClass - Entity class (e.g., Task)
   * @param {UUID64 | string} id - Entity id (UUID64 instance or OPB64 string)
   * @returns {ReturnType<T['fromJson']>|null} - Typed entity instance, or null if not found
   * @throws {Error} - If id validation fails
   */
  async loadEntity<T extends IEntity>(
    EntityClass: T,
    id: UUID64 | string,
  ): Promise<ReturnType<T['fromJson']> | null> {
    const idStr = typeof id === 'string' ? id : id.toString();
    return await this.repository.findOne(EntityClass, { id: idStr });
  }

  /**
   * Load any forma from world storage using fuzzy id matching
   * Tries all registered entity types and returns first match
   * @param {string} match - Partial or fuzzy id string to match
   * @param {number} levenshtein - Optional fuzzy matching parameter (see Identifiable.idFilter)
   * @returns {any} - Matching forma instance, or null if not found
   *
   * @example
   * const forma = await await world.loadFuzzyForma("partial-id"); // Could be Task, Action, etc.
   */
  async loadFuzzyForma(match: string, levenshtein?: number): Promise<any> {
    for (const entityName of this.getEntityNames()) {
      const EntityClass = this.entityClassOfName(entityName);
      if (!EntityClass) continue;
      try {
        return await this.loadFuzzy(EntityClass, match, levenshtein);
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
   * const task = await await world.loadFuzzy(Task, "partial-id", 5); // Type is Task | null
   */
  async loadFuzzy<T extends IEntity>(
    EntityClass: T,
    match: string,
    levenshtein?: number,
  ): Promise<ReturnType<T['fromJson']> | null> {
    const msg = 'await world.loadFuzzy';
    const dbg = WORLD?.LOAD;

    const entityType = EntityClass.collection;
    const ids = await this.repository.distinct<string>('id', {
      collection: entityType,
    });

    if (ids.length === 0) {
      dbg && cc.ok1(msg, `no entities for ${entityType}`);
      return null;
    }

    // Create filter function for id matching
    const filter = Identifiable.idFilter(match, levenshtein);
    const matchingIds = ids.filter(filter);

    if (matchingIds.length === 0) {
      dbg && cc.ok1(msg, `no match for ${match} in ${entityType}`);
      return null;
    }

    if (matchingIds.length > 1) {
      throw new Error(
        `${msg}: ambiguous match for "${match}": found ${matchingIds.length} matches [${matchingIds.join(', ')}]`,
      );
    }

    // Load and reconstruct the matching entity
    const id = matchingIds[0];
    const filePath = path.join(this.#worldPath, entityType, `${id}.json`);
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

    // Namespace is the canonical source of Forma instances: registering the
    // freshly-loaded instance keeps it in sync (addForma replaces any stale entry for this id).
    this.addToNamespace(typedEntity);

    dbg && cc.ok1(msg, `loaded ${entityType}/${entity.id}`);
    return typedEntity as ReturnType<T['fromJson']>;
  }

  /**
   * @deprecated
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
  entityList<T extends IEntity>(
    EntityClass: T,
  ): FormaList<ReturnType<T['fromJson']>> {
    const msg = 'world.entityList';
    const dbg = WORLD?.LIST;

    const entityType = EntityClass.collection;
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
      { emitter: this, namespace: this.mutableNamespace },
    );
  }

  /**
   * Create and persist a new entity
   * @param EntityClass - Entity constructor (e.g., Task)
   * @param cfg - Configuration object passed to constructor
   * @returns Created entity instance
   */
  async upsertOne<T extends IEntity>(
    EntityClass: T,
    cfg: any = {},
  ): Promise<ReturnType<T['fromJson']>> {
    const instance = await this.repository.upsertOne(EntityClass, cfg);
    this.addToNamespace(instance);
    return instance;
  }

  /**
   * Delete entity from world storage and remove from focus stack
   * @param {string} entityType - Entity type (e.g., 'task')
   * @param {string} id - Entity id
   */
  async delete(entityType: string, id: string): Promise<void> {
    // Remove from namespace
    this.mutableNamespace.removeForma(id);

    // Remove from focus stack if present (ignore invalid UUIDs)
    try {
      this.#focusManager.unfocus(UUID64.fromString(id));
    } catch {
      // Invalid UUID64 format; entity was not in focus
    }

    await this.repository.delete(entityType, id);
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
   * Get watermark for tracking commit observations
   * @returns {RGA64Watermark}
   */
  get watermark(): RGA64Watermark {
    return this.#watermark;
  }

  /**
   * Get the focus manager
   * @returns {IFocusManager}
   */
  get focusManager(): IFocusManager {
    return this.#focusManager;
  }

  /**
   * Get focused forma of a given type (most recent).
   * Uses entity registry to validate type and namespace to resolve current entity state.
   * @param {string} formaType - Registered entity type name (e.g., 'task')
   * @returns {Forma|null} - Focused entity or null
   */
  focusedForma(formaType: string): Forma | null {
    if (!this.entityClassOfName(formaType)) return null;
    for (const id of this.#focusManager.ids()) {
      const entity = this.namespace.getForma(id.base64);
      if (entity && (entity.constructor as any).collection === formaType) {
        return entity;
      }
    }
    return null;
  }

  /**
   * Remove stale entries from focusManager where backing entity no longer exists
   * @returns {boolean} - true if any entries were removed, false otherwise
   */
  protected async syncFocusManager(opts: any = {}): Promise<boolean> {
    const msg = 'w3d.syncFocusManager';
    const result = super.validate(opts);
    const fm = this.#focusManager;
    const dbg = WORLD.SYNC_REPOSITORY;

    const validIds = new Set<string>();
    for (const entityType of this.getEntityNames()) {
      const ids = await this.repository.distinct<string>('id', {
        collection: entityType,
      });
      ids.forEach((id) => validIds.add(id));
    }

    const beforeSize = fm.size;
    for (const id of fm.ids()) {
      if (!validIds.has(id.toString())) {
        fm.unfocus(id);
      }
    }

    const isValid = fm.size === beforeSize;
    if (!isValid) {
      dbg && cc.ok1(msg, `Cleaned ${beforeSize - fm.size} entries`);
    }

    return result && isValid;
  }

  /**
   * Synchronize watermark with current git HEAD observation.
   * Records that the current user has observed the latest commit.
   * Returns true if watermark was advanced
   */
  syncWatermark(): boolean {
    const msg = 'w3d.syncWatermark';
    const dbg = DBG.WORLD.WATERMARK;

    THROTTLE.watermark++;
    if (1 == THROTTLE.watermark) {
      dbg && cc.ok1(msg, THROTTLE.watermark, 'validating...');
    } else {
      dbg && cc.ok1(msg, THROTTLE.watermark, '(ignored)');
      return false;
    }
    const startTime = performance.now();

    try {
      const gitDir = path.dirname(this.#worldPath);
      const user = User.fromGit(gitDir);
      const userSignature = user.signature();

      // Get current HEAD as UUID64
      const { uuid64: headUuid } = UUID64.forGitObserved(
        'HEAD',
        this.#gitCLI,
      );

      // Update watermark with this observation
      const advanced = this.#watermark.update(userSignature, headUuid);

      // Compact focus stack with updated watermark
      if (advanced) {
        this.#focusManager.compact(this.#watermark.minObservedTime());
      }

      const elapsedMs = performance.now() - startTime;
      dbg &&
        cc.ok1(
          msg,
          `${advanced ? 'advanced' : 'unchanged'} for ${userSignature} (${elapsedMs.toFixed(2)}ms)`,
        );
      return advanced;
    } catch (err) {
      // Not in a git repo or git not available - that's ok
      const elapsedMs = performance.now() - startTime;
      dbg &&
        cc.ok1(
          msg,
          `skipped (${elapsedMs.toFixed(2)}ms): ${err instanceof Error ? err.message : String(err)}`,
        );
      return false;
    }
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
    return {
      id: this.id,
      name: this.name,
      summary: this.summary,
      focusManager: this.#focusManager.toJSON(),
      numeronym: Object.fromEntries(this.#numeronym),
      watermark: this.#watermark.toJSON(),
    };
  }

  /**
   * Deserialize World from JSON (internal use only)
   * @param {object} data - JSON data with id and optional numeronym and focusManager
   * @param {string} baseDir - Base directory containing world.json (the .nameforma directory)
   * @returns {World} - World instance with worldPath set to baseDir
   */
  static fromJson(
    data: any,
    repository: IEntityRepository,
    baseDir?: string,
  ): World {
    const msg = 'W3D.fromJson';
    const dbg = WORLD.LOAD;
    if (!data.id) {
      throw new Error('World.fromJson: missing id');
    }

    // worldPath is the directory containing world.json
    const worldPath = baseDir || '.';

    const world = new World(worldPath, repository, data.id);

    // Restore numeronym map if present
    if (data.numeronym && typeof data.numeronym === 'object') {
      world.#numeronym = new Map(Object.entries(data.numeronym));
    }

    // Restore watermark if present
    if (data.watermark && typeof data.watermark === 'object') {
      world.#watermark = RGA64Watermark.fromJSON(data.watermark);
    }

    if (data.focusManager) {
      world.#focusManager = FocusManager.fromJSON(data.focusManager);
    }

    // Restore name and summary if present in saved data
    if (data.name !== undefined) {
      world.name = data.name;
    }
    if (data.summary !== undefined) {
      world.summary = data.summary;
    }

    return world;
  }

  get entityComparator(): (a: Forma, b: Forma) => number {
    return (a: Forma, b: Forma): number => {
      const fm = this.#focusManager;
      const cmp = fm.focusOrder(a.id) - fm.focusOrder(b.id);
      return cmp || b.id.compare(a.id);
    };
  }

  /**
   * Render data at given zeno level of semantic detail
   */
  override renderDataAtZeno(view: IView, zeno: ZenoCoord): RenderData {
    const msg = 'w3d.renderDataAtZeno';
    const { anchorStep, pivotStep } = zeno;
    const headerData: RenderData = super.renderDataAtZeno(view, zeno);
    const ZENO_TERSE = new ZenoCoord(ZENO_1_ROW_TERSE, ZENO_1_ROW_TERSE);
    const dbg = 1;

    if (anchorStep <= ZENO_3_ROWS) {
      return headerData;
    }
    const buf = new RenderBuffer(view, zenoStepToLines(anchorStep));
    for (const row of headerData as RenderRow[]) buf.pushRow(row);

    const focusIds = this.#focusManager.ids();

    const entityNames = this.getEntityNames();
    for (const eName of entityNames) {
      const ec = this.entityClassOfName(eName);
      if (ec == null) {
        dbg && cc.bad1(msg, `entityhClassOfName(${eName})`);
        continue;
      }
      const c8r = this.entityComparator;
      let formas = this.entityList(ec).sort(c8r);
      buf.pushRow([
        new FormaField(eName, false, ec.collection, '' + formas.size),
      ]);
      for (const f of formas) {
        const row = f.renderDataAtZeno(view, ZENO_TERSE) as RenderRow;
        let bullet = '-';
        switch (this.#focusManager.focusOrder(f.id)) {
          case 0: // Top focus
            //bullet = theme.nfNominal("▶");
            bullet = theme.nfNominal('●');
            break;
          case 1: // Top focus
            bullet = theme.nfWarn('⦿');
            break;
          default: // Other focus
            bullet = theme.nfAttend('◦');
            break;
          case Number.MAX_SAFE_INTEGER: // Not focused
            //bullet = theme.nfAway("-");
            bullet = theme.nfAway('▬');
            break;
        }
        row.unshift(bullet);
        if (!buf.pushRow(row)) {
          break;
        }
      } // for formas
    } // for entitNames

    return buf.getRenderData();
  } // renderDataAtZeno

  /** Find all Entities matching the query in this Task's namespace.
   * @param targetClass Task or other Entity
   * @param filter optional boolean filter callback
   * @returns Iterable<Forma> of matching items in this Task's namespace
   */
  override *findByClass<T extends Forma, C extends Constructor<T>>(
    targetClass: C,
    filter?: (element: T) => boolean,
  ): Generator<InstanceType<C>> {
    const resolvedFilter = filter ?? (() => true);
    const items = [
      ...this.namespace.findByClass(targetClass, resolvedFilter),
    ].sort(this.entityComparator);
    yield* items;
  }
} // World
