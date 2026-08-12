import fs from 'fs';
import path from 'path';
import sift from 'sift';
import { pathToFileURL } from 'url';
import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import UUID64 from './uuid64.js';
import {
  Filter,
  FilterOperators,
  TObject,
  type IEntity,
  IEntityRepository,
  IEntityCursor,
  Entity,
} from './entity.js';
import { EntityRegistry } from './entity-registry.js';
import { EntityCursor } from './entity-cursor.js';
import { World } from './world.js';
import { DBG } from './defines.js';
import { NfUrl } from './nf-url.js';
import { Text } from '@sc-voice/tools';
const { ColorConsole } = Text;
const { cc } = ColorConsole;

class FileEntityCursor<T extends IEntity> extends EntityCursor<T> {
  #asyncGen: AsyncGenerator<T>;

  constructor(asyncGen: AsyncGenerator<T>) {
    super();
    this.#asyncGen = asyncGen;
  }

  protected async *rawIterator(): AsyncGenerator<T> {
    for await (const item of this.#asyncGen) {
      yield item;
    }
  }
}

export class FileRepository implements IEntityRepository {
  #worldPath: string;
  #entityRegistry: EntityRegistry;

  constructor(worldPath: string) {
    const msg = 'FileRepository.ctor';
    if (!worldPath.includes('.nameforma')) {
      throw new Error(`${msg} invalid worldPath: ${worldPath}`);
    }
    this.#worldPath = worldPath;
    this.#entityRegistry = new EntityRegistry();
  }

  get entityRegistry(): EntityRegistry {
    return this.#entityRegistry;
  }

  get projectUrl(): URL {
    const projectPath = path.dirname(this.#worldPath);
    return pathToFileURL(projectPath);
  }

  static async create(worldPath: string): Promise<FileRepository> {
    return new FileRepository(worldPath);
  }

  async upsertOne<T extends IEntity>(
    EntityClass: T,
    cfg: object,
  ): Promise<ReturnType<T['fromJson']>> {
    let instance: ReturnType<T['fromJson']>;
    if ((cfg as any) instanceof (EntityClass as any)) {
      instance = cfg as ReturnType<T['fromJson']>;
    } else {
      instance = new (EntityClass as any)(cfg) as ReturnType<
        T['fromJson']
      >;
    }
    this.#save((EntityClass as any).collection, instance);
    return instance;
  }

  async findOne<T extends IEntity>(
    EntityClass: T,
    filter: object,
  ): Promise<ReturnType<T['fromJson']> | null> {
    const keys = Object.keys(filter);
    if (keys.length !== 1 || keys[0] !== 'id') {
      throw new Error(
        `FileRepository.findOne: only {id} filter supported, got ${JSON.stringify(filter)}`,
      );
    }
    const id = (filter as any).id;
    const filePath = path.join(
      this.#worldPath,
      (EntityClass as any).collection,
      `${id}.json`,
    );
    if (!fs.existsSync(filePath)) return null;
    return this.#load(EntityClass, filePath);
  }

  findMany<T extends IEntity>(
    EntityClass: T,
    filter?: Omit<Filter<TObject>, 'collection'>,
  ): IEntityCursor<T> {
    const collection = (EntityClass as any).collection;
    const collectionFilter: Filter<TObject> = { ...filter, collection };
    return new FileEntityCursor(this.#findAllGenerator(collectionFilter));
  }

  async *#findAllGenerator(filter: Filter<TObject>): AsyncGenerator<any> {
    const f = filter as any;
    const fc = f.collection;
    const wp = this.#worldPath;
    let entityNames: string[];

    // Filter entityNames by collection if present in filter
    if (typeof fc === 'string') {
      entityNames = [fc];
    } else if (fc !== undefined) {
      // Collection is a sift operator object, filter entityNames through sift
      const allNames = this.#entityRegistry.getEntityNames();
      const collectionFilter = (sift as any)({ collection: fc });
      entityNames = allNames.filter((name) =>
        collectionFilter({ collection: name }),
      );
    } else {
      entityNames = this.#entityRegistry.getEntityNames();
    }

    const sf = (sift as any)(filter);
    const matchingFilesFilter = {
      id: (f as any).id,
      updatedAt: (f as any).updatedAt,
    };

    // Collect all matching file paths across collections, then sort by ID
    const filePathsWithIds: Array<{
      filePath: string;
      EntityClass: any;
      idStr: string;
    }> = [];
    for (const name of entityNames) {
      const EntityClass = this.#entityRegistry.entityClassOfName(name);
      if (EntityClass) {
        const entityDir = path.join(wp, (EntityClass as any).collection);
        for await (const { filePath, file } of this.#matchingFiles(
          entityDir,
          matchingFilesFilter,
        )) {
          const idStr = file.slice(0, -5); // remove .json extension
          filePathsWithIds.push({ filePath, EntityClass, idStr });
        }
      }
    }

    // Sort file paths by ID in descending order (newest-first)
    filePathsWithIds.sort(
      (a, b) => -UUID64.compareBase64(a.idStr, b.idStr),
    );

    // Load entities in sorted order and apply filter
    for (const { filePath, EntityClass } of filePathsWithIds) {
      const entity = this.#load(EntityClass, filePath);
      if (sf(entity)) {
        yield entity;
      }
    }
  }

  /**
   * Query all entities across all collections.
   * @param filter MongoDB-style filter object
   * @returns Cursor for lazy iteration and composition
   */
  findAll(filter: Filter<TObject>): IEntityCursor<IEntity> {
    return new FileEntityCursor(this.#findAllGenerator(filter));
  }

  async *#matchingFiles(
    entityDir: string,
    filter?: { id?: string; updatedAt?: Date | FilterOperators<Date> },
  ): AsyncGenerator<{ file: string; filePath: string }> {
    if (!fs.existsSync(entityDir)) return;
    const updatedAtFilter = this.#parseUpdatedAtFilter(filter?.updatedAt);
    const id = (filter as any)?.id;

    if (id && !updatedAtFilter) {
      const file = `${id}.json`;
      const filePath = path.join(entityDir, file);
      if (fs.existsSync(filePath)) yield { file, filePath };
      return;
    }

    const files = fs
      .readdirSync(entityDir)
      .filter((f) => f.endsWith('.json'));
    for (const file of files) {
      if (id && file.slice(0, -5) !== id) continue;
      if (updatedAtFilter) {
        const stats = fs.statSync(path.join(entityDir, file));
        if (!this.#filterUpdatedAt(stats.mtimeMs, updatedAtFilter))
          continue;
      }
      yield { file, filePath: path.join(entityDir, file) };
    }
  }

  #parseUpdatedAtFilter(
    updatedAt?:
      | Date
      | { $eq?: Date; $gt?: Date; $gte?: Date; $lt?: Date; $lte?: Date },
  ): { op: string; thresholdMs: number } | null {
    if (!updatedAt) return null;
    if (updatedAt instanceof Date) {
      return { op: '$eq', thresholdMs: updatedAt.getTime() };
    }
    const ops = ['$eq', '$gt', '$gte', '$lt', '$lte'];
    for (const op of ops) {
      const val = (updatedAt as any)[op];
      if (val instanceof Date) {
        return { op, thresholdMs: val.getTime() };
      }
    }
    return null;
  }

  /** Use mtime as a proxy for updatedAt.  */
  #filterUpdatedAt(
    mtimeMs: number,
    filter: { op: string; thresholdMs: number },
  ): boolean {
    const { op, thresholdMs } = filter;

    // mtime optimization: skip if mtime alone proves the filter can't match
    switch (op) {
      case '$lt':
        return mtimeMs < thresholdMs ? true : false;
      case '$gt':
        return mtimeMs > thresholdMs ? true : false;
      default:
        throw new Error(
          'Equality matches are not supported for updatedAt',
        );
    }

    return true;
  }

  async distinct<R>(
    field: string,
    filter?: Filter<TObject>,
  ): Promise<R[]> {
    const f = filter as any;
    function fieldValue(filePath: string): any {
      if (!fs.existsSync(filePath)) {
        return undefined;
      }

      // return values for fields covered by metadata (e.g., indexes, etc.)
      if (field === 'id') return f.id;
      if (field === 'collection') {
        return path.basename(path.dirname(filePath));
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data[field];
    }

    if (f?.id) {
      // Filenames (`${id}.json`) are a covering index on id: when field==='id'
      // we can answer from the directory listing alone, no file body read needed.
      const dirs: string[] = f.collection
        ? [f.collection]
        : fs
            .readdirSync(this.#worldPath, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
      for (const dirName of dirs) {
        const filePath = path.join(
          this.#worldPath,
          dirName,
          `${f.id}.json`,
        );
        const value = fieldValue(filePath);
        if (value !== undefined) {
          return [value];
        }
      }
      return [];
    }

    if (f?.collection) {
      const entityDir = path.join(this.#worldPath, f.collection);
      const values = new Set<R>();
      for await (const { file, filePath } of this.#matchingFiles(
        entityDir,
        f,
      )) {
        if (field === 'id') {
          values.add(file.slice(0, -5) as unknown as R);
        } else {
          const value = fieldValue(filePath);
          if (value !== undefined) values.add(value);
        }
      }
      return Array.from(values);
    }

    throw new Error(
      'FileRepository.distinct: filter.collection or filter.id required',
    );
  }

  async delete(entityType: string, id: string): Promise<void> {
    const filePath = path.join(this.#worldPath, entityType, `${id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async saveWorld(world: Record<string, any>): Promise<void> {
    const msg = 'f12y.save';
    const dbg = DBG.WORLD.SAVE;

    // Ensure .nameforma directory exists
    if (!fs.existsSync(this.#worldPath)) {
      fs.mkdirSync(this.#worldPath, { recursive: true });
      dbg && cc.ok1(msg, `created ${this.#worldPath}`);
    }

    const worldFile = path.join(this.#worldPath, 'world.json');
    const data = JSON.stringify(world.toJSON(), null, 2);
    fs.writeFileSync(worldFile, data, 'utf8');

    dbg && cc.ok1(msg, `saved ${worldFile}`);
  }

  async loadWorld(): Promise<World> {
    return await FileRepository.loadWorld(this.#worldPath);
  }

  #save(entityType: string, entity: any): void {
    const entityDir = path.join(this.#worldPath, entityType);
    if (!fs.existsSync(entityDir))
      fs.mkdirSync(entityDir, { recursive: true });
    fs.writeFileSync(
      path.join(entityDir, `${entity.id}.json`),
      JSON.stringify(entity, null, 2),
      'utf8',
    );
  }

  #load<T extends IEntity>(
    EntityClass: T,
    filePath: string,
  ): ReturnType<T['fromJson']> {
    const entity = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (entity.id) entity.id = UUID64.fromString(entity.id);
    return EntityClass.fromJson(entity) as ReturnType<T['fromJson']>;
  }

  /**
   * Search up filesystem tree for .nameforma/ directory
   * @param {string} startPath - Starting directory
   * @returns {string|null} - Path to .nameforma/ or null if not found
   */
  static findWorld(startPath: string = process.cwd()): string | null {
    const msg = 'world.findWorld';
    const dbg = DBG.WORLD.FIND_WORLD;

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

  /** @deprecated
   * Load or create World from path
   * Reads .nameforma/world.json if exists, otherwise creates new World only if create option is true
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static async worldFromPath(worldPath: string): Promise<World> {
    const msg = 'world.fromPath';
    const dbg = DBG.WORLD.LOAD;

    const worldFile = path.join(worldPath, 'world.json');

    let world: World | undefined;

    if (fs.existsSync(worldFile)) {
      world = await this.loadWorld(worldPath);
    } else {
      world = await this.createWorld(worldPath);
    }

    return world;
  }

  /**
   * Create new World at path. Throws Error if world exists.
   * Creates .nameforma/world.json
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static async createWorld(worldPath: string): Promise<World> {
    const msg = 'f12y.createWorld';
    const dbg = DBG.WORLD.CTOR;

    const worldFile = path.join(worldPath, 'world.json');

    let world: World | undefined;

    if (fs.existsSync(worldFile)) {
      throw new Error(`World exists at ${worldPath}`);
    }

    // Compute name and summary defaults for new world
    const worldRoot = path.dirname(worldPath);
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

    // Ensure .nameforma directory exists
    if (!fs.existsSync(worldPath)) {
      fs.mkdirSync(worldPath, { recursive: true });
      dbg && cc.ok1(msg, `created ${worldPath}`);
    }

    // Create new World only if create flag is true
    const repository = new FileRepository(worldPath);
    world = new World(worldPath, repository, { name, summary });
    await world.initialize();

    // Save world.json with generated id
    const worldData = JSON.stringify(world.toJSON(), null, 2);
    fs.writeFileSync(worldFile, worldData, 'utf8');
    dbg && cc.ok1(msg, `created ${worldFile}`);

    return world;
  }

  /**
   * Load World from path and throws if it does not exist
   * Reads .nameforma/world.json
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static async loadWorld(worldPath: string): Promise<World> {
    const msg = 'f12y.load';
    const dbg = DBG.WORLD.LOAD;

    const worldFile = path.join(worldPath, 'world.json');
    if (!fs.existsSync(worldFile)) {
      throw new Error(
        `World not found at ${worldPath}. Run 'nf init ${worldPath}' to create one.`,
      );
    }

    let world: World | undefined;
    const data = fs.readFileSync(worldFile, 'utf8');
    const json = JSON.parse(data);
    dbg && cc.ok1(msg, `loaded ${worldFile}`);
    const repository = new FileRepository(worldPath);
    world = World.fromJson(json, repository, worldPath);
    // Synchronize watermark with current git HEAD and persist if advanced
    const watermarkAdvanced = world.syncWatermark();
    const isValid = world.validate();
    if (!isValid || watermarkAdvanced) {
      await repository.saveWorld(world);
      dbg && cc.ok1(msg, `saved`);
    }

    await world.initialize();

    return world;
  }
}

export const logger = (() => {
  if (!DBG.PINO) {
    return {
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
      fatal: () => {},
      trace: () => {},
    };
  }

  const worldPath = FileRepository.findWorld() || process.cwd();
  const logDir = worldPath;

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const stream = createStream(
    (time) => {
      const dt =
        time instanceof Date ? time : new Date(time || Date.now());
      const year = String(dt.getFullYear()).slice(-2);
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return path.join(logDir, `nf.${year}${month}${day}.log`);
    },
    {
      size: '10M',
      maxFiles: 10,
    },
  );

  return pino(stream);
})();
