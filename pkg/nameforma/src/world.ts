import { EventEmitter } from 'node:events';
import { Text } from '@sc-voice/tools';
import UUID64 from './uuid64.js';
import { DBG } from './defines.js';
import { logger } from './file-repository.js';
import {
  Entity,
  type IEntity,
  type IEntityRepository,
  validateEntity,
} from './entity.js';
import { Task } from './task.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { Identifiable } from './identifiable.js';
import { FuzzyNamespace, IReadOnlyNamespace } from './fuzzy-namespace.js';
import { Forma, type Constructor, type IFormaMutator } from './forma.js';
import { Command } from './mutator.js';
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

  #repository: IEntityRepository;
  #worldPath: string;
  #gitCLI: GitCLI;
  #numeronym: Map<string, string> = new Map();
  #focusManager: FocusManager;
  #watermark: RGA64Watermark;
  #bus: EventEmitter;

  // UUID64 signature of the non-specific world (@see log)
  static readonly NO_WORLD = '_NO_WORLD_NW';

  // Export Focus class for use elsewhere
  static Focus = Focus;

  /**
   * Create a World at the given path with optional config (internal use only)
   * Use FileRepository.worldFromPath() to get or create a World instance.
   * @param {string} worldPath - Path to .nameforma/ directory
   * @param {IEntityRepository} repository - Entity repository implementation
   * @param {Partial<World>} cfg - Configuration with optional id, name, summary
   */
  constructor(
    worldPath: string,
    repository: IEntityRepository,
    cfg: Partial<World> = {},
  ) {
    const ctx = 'World.ctor';
    const { id = new UUID64(), name = 'name', summary = 'summary?' } = cfg;
    super({ id, name, summary });
    const dbg = WORLD?.CTOR;

    this.#repository = repository;
    this.#worldPath = worldPath;
    this.#gitCLI = GitCLI.fromUrl(this.#repository.projectUrl);
    this.#watermark = new RGA64Watermark();
    this.#focusManager = new FocusManager();
    this.#bus = new EventEmitter();

    // Register standard entities
    this.registerEntity(Task);

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
          await this.#saveEntity(entityType, entity);
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
            await this.#saveEntity(entityType, entity);
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

    logger.info({ ctx }, worldPath);
    World.#lastWorld = this;
  }

  /** Initialize namespace with all registered entities */
  async #populateNamespace(): Promise<void> {
    const msg = 'world.populateNamespace';
    const dbg = WORLD?.ALL;

    const entityNames = this.getEntityNames();
    let totalLoaded = 0;

    for (const entityTypeName of entityNames) {
      const IEntity = this.entityClassOfName(entityTypeName);
      if (!IEntity) {
        dbg && cc.bad1(msg, `no IEntity for ${entityTypeName}`);
        continue;
      }

      let typeLoaded = 0;
      for await (const instance of this.#repository.findMany(
        IEntity as any,
      )) {
        try {
          this.addToNamespace(instance);
          typeLoaded++;
          totalLoaded++;
        } catch (err) {
          dbg &&
            cc.bad1(
              `${msg} failed to add ${entityTypeName} to namespace`,
              err,
            );
        }
      }

      dbg &&
        cc.ok1(msg, `loaded ${typeLoaded} ${entityTypeName} entities`);
    }
    // add self
    this.addToNamespace(this);

    dbg && cc.ok1(msg, `total loaded ${totalLoaded} entities`);
  }

  /**
   * Resolve fuzzy ID using active names spaces in order:
   * 1. transient focus
   * 2. persistent focus (@see RGA64Stack)
   * 3. world entity namespace
   * @param {string} fuzzyId - Fuzzy ID to resolve
   * @returns {Promise<{ entity: Forma, forma: Forma } | undefined>} - entity is the serializing entity; forma is the matched forma
   */
  async resolveFuzzyId(
    fuzzyId: string,
  ): Promise<{ entity: Forma; forma: Forma } | undefined> {
    const msg = 'world.resolveFuzzyId';
    const dbg = WORLD?.FUZZY_ID;
    const ns = await this.namespace;

    // Get focused entity: local focus (transactional) takes precedence over RGA64 focus
    const fm = this.#focusManager;
    const focusId = fm.peekLocal() || fm.peek();
    const focusedEntity = focusId ? ns.getForma(focusId.base64) : null;
    let forma: Forma | undefined;

    // Focused entity
    if (fuzzyId === 'focus') {
      if (focusedEntity) {
        return { entity: focusedEntity, forma: focusedEntity };
      }
    }

    // Primary namespace is in focused entity
    if (focusedEntity) {
      const nsPrimary = await (focusedEntity as any)?.namespace;
      forma = nsPrimary.getForma(fuzzyId);
      if (forma) {
        dbg &&
          cc.ok1(msg, `focus namespace: ${fuzzyId} => ${forma.id.base64}`);
        return { entity: focusedEntity, forma };
      }
    }

    // World entity
    if (fuzzyId === 'world') {
      dbg && cc.ok1(msg, `world: ${fuzzyId} => ${this.id.base64}`);
      return { entity: this, forma: this };
    }

    // Secondary namespace is the world
    const nsSecondary = await this.namespace;
    forma = nsSecondary.getForma(fuzzyId);
    if (forma) {
      if (!(forma instanceof Entity)) {
        throw new Error(`Expected Entity: ${typeof forma}?`);
      }
      dbg &&
        cc.ok1(msg, `world namespace: ${fuzzyId} => ${forma.id.base64}`);
      return { entity: forma, forma };
    }

    dbg && cc.bad1(msg, `not found: ${fuzzyId}`);
    return undefined;
  }

  /**
   * Apply batch mutations to a forma via commands, persisting changes
   * Implements IFormaMutator for bulk transactional updates
   * @template T - Forma type being mutated
   * @param {string} fuzzyId - Fuzzy ID to resolve target forma
   * @param {Command[]} commands - Mutation commands to apply
   * @returns {Promise<Partial<T>>} Delta of changes (prior values)
   * @throws {Error} If fuzzyId not found or field conflicts detected
   */
  async mutate<T extends Forma = Forma>(
    fuzzyId: string,
    commands: readonly Command[],
  ): Promise<Partial<T>> {
    const msg = 'world.mutate';
    const dbg = WORLD?.MUTATE;

    const resolved = await this.resolveFuzzyId(fuzzyId);
    if (!resolved) {
      throw new Error(`${msg}: fuzzyId not found: ${fuzzyId}`);
    }

    const { entity, forma } = resolved;
    const delta: Record<string, any> = {};

    // Apply commands and aggregate deltas
    for (const cmd of commands) {
      const changed = forma.applyCommand(cmd);
      if (changed && Object.keys(changed).length > 0) {
        for (const [key, value] of Object.entries(changed)) {
          delta[key] = value;
        }
      }
    }

    // Persist parent entity with mutated content
    const entityType = (entity.constructor as any).collection || 'forma';
    await this.#saveEntity(entityType, entity);
    dbg && cc.ok1(msg, `mutated ${fuzzyId}`, delta);

    return delta as Partial<T>;
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

    this.#repository.entityRegistry.registerEntity(EntityClass);
    dbg && cc.ok1(msg, `registered collection: ${EntityClass.collection}`);
  }

  /**
   * Get all registered entity names
   * @returns {string[]} - Array of entity names
   */
  getEntityNames(): string[] {
    return this.#repository.entityRegistry.getEntityNames();
  }

  /**
   * Get entity constructor by name
   * @param {string} name - Entity name
   * @returns {IEntity|null} - Entity constructor or null if not registered
   */
  entityClassOfName(name: string): IEntity | null {
    return this.#repository.entityRegistry.entityClassOfName(name);
  }

  /**
   * Save entity to world storage (internal API, use entityList.addItem/patchItem instead)
   * @param {string} entityType - Entity type (e.g., 'task')
   * @param {object} entity - Entity with id
   */
  async #saveEntity(entityType: string, entity: any): Promise<void> {
    const msg = 'world.save';
    const dbg = WORLD?.SAVE;

    if (!entity?.id) {
      throw new Error(`${msg}: entity missing id`);
    }

    const EntityClass = this.entityClassOfName(entityType);
    if (!EntityClass) {
      throw new Error(`${msg}: ${entityType} not registered`);
    }

    await this.#repository.upsertOne(EntityClass, entity);
    dbg && cc.ok1(msg, `saved ${entityType}:${entity.id}`);
  }

  /** Must be called after construction */
  async initialize(): Promise<void> {
    this.clearNamespace();
    await this.#populateNamespace();
    const isValid = await this.syncFocusManager();
    if (!isValid) {
      await this.save();
    }
  }

  /**
   * Save World state to world.json
   * Creates .nameforma/ directory if missing
   */
  async save(): Promise<void> {
    await this.#repository.saveWorld(this);
  }

  override copyFrom(that: World): void {
    super.copyFrom(that);
    this.#numeronym = new Map(that.#numeronym);
    this.#watermark = RGA64Watermark.fromJSON(that.#watermark.toJSON());
    this.#focusManager = FocusManager.fromJSON(
      that.#focusManager.toJSON(),
    );
  }

  /**
   * Synchronize world with #repository
   *
   * Intended for polling scenarios (e.g., nf-watch) where a long-lived World
   * instance needs to stay current with external writes.
   */
  async syncRepository(): Promise<void> {
    let freshWorld = (await this.#repository.loadWorld()) as World;
    this.copyFrom(freshWorld);
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
    return await this.#repository.findOne(EntityClass, { id: idStr });
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
    const ids = await this.#repository.distinct<string>('id', {
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

    // Load the matching entity via repository
    const id = matchingIds[0];
    const typedEntity = await this.#repository.findOne(EntityClass, { id });
    if (!typedEntity) {
      throw new Error(`${msg}: entity ${entityType}/${id} not found`);
    }

    // Namespace is the canonical source of Forma instances: registering the
    // freshly-loaded instance keeps it in sync (addForma replaces any stale entry for this id).
    this.addToNamespace(typedEntity);

    dbg && cc.ok1(msg, `loaded ${entityType}/${typedEntity.id}`);
    return typedEntity as ReturnType<T['fromJson']>;
  }

  /** Generate stream of entities ordered by entityComparator
   * @param {targetClass} desired Entity class (e.g., Task)
   * @param {filter} Optional Entity filter
   * @param {limit} Optional maximum number of entities to return
   */
  *entityStream<T extends Entity, C extends Constructor<T>>(
    targetClass: C,
    filter?: (element: T) => boolean,
    limit?: number,
  ): Generator<InstanceType<C>> {
    const msg = 'world.entityStream';
    const dbg = DBG.WORLD.ENTITY_STREAM;
    const ns = this.namespace;
    if (ns == null) throw new Error(`${msg} uninitialized world`);
    const rawEntities = [...ns.findByClass(targetClass, filter)];
    const entities = filter ? rawEntities.filter(filter) : rawEntities;
    entities.sort(this.entityComparator);

    let count = 0;
    for (const entity of entities) {
      if (limit !== undefined && count >= limit) break;
      yield entity;
      count++;
    }
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
    const items = [...this.entityStream(EntityClass as any)];
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
    const instance = await this.#repository.upsertOne(EntityClass, cfg);
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

    await this.#repository.delete(entityType, id);
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
   * Get the repository used to serialize the world
   * @returns {IEntityRepository}
   */
  get repository(): IEntityRepository {
    return this.#repository;
  }
  /**
   * Get focused forma of a given type (most recent).
   * Uses entity registry to validate type and namespace to resolve current entity state.
   * @param {string} formaType - Registered entity type name (e.g., 'task')
   * @returns {Promise<Forma|null>} - Focused entity or null
   */
  async focusedForma(formaType: string): Promise<Forma | null> {
    if (!this.entityClassOfName(formaType)) return null;
    const ns = this.namespace;
    for (const id of this.#focusManager.ids()) {
      const entity = ns.getForma(id.base64);
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
      const ids = await this.#repository.distinct<string>('id', {
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
      const userSignature = this.#gitCLI.getUser().signature();

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
  override toJSON(): any {
    return {
      ...super.toJSON(),
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

    const world = new World(worldPath, repository, { id: data.id });

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

  get entityComparator(): (a: Entity, b: Entity) => number {
    return (a: Entity, b: Entity): number => {
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
      let formas = [...this.entityStream(ec as any)].sort(c8r);
      buf.pushRow([
        new FormaField(eName, false, ec.collection, '' + formas.length),
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
} // World
