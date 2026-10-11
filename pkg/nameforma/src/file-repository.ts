import fs from 'fs';
import path from 'path';
import sift from 'sift';
import { pathToFileURL } from 'url';
import { UUID64 } from './uuid64.js';
import {
  Filter,
  FilterOperators,
  TObject,
  type IEntity,
  IEntityCursor,
  Entity,
} from './entity.js';
import { type IRepository } from './repository.js';
import { EntityRegistry } from './entity-registry.js';
import { EntityCursor } from './entity-cursor.js';
import { World } from './world.js';
import { findWorld } from './defines.js';
import { WorldRepository } from './world-repository.js';

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

export class FileRepository implements IRepository {
  #entityRegistry: EntityRegistry;
  #worldRepo: WorldRepository;

  constructor(worldRepo: WorldRepository) {
    this.#worldRepo = worldRepo;
    this.#entityRegistry = new EntityRegistry();
  }

  get entityRegistry(): EntityRegistry {
    return this.#entityRegistry;
  }

  get projectUrl(): URL {
    const projectPath = path.dirname(this.#worldRepo.worldPath);
    return pathToFileURL(projectPath);
  }

  static async create(worldPath: string): Promise<FileRepository> {
    return new FileRepository(new WorldRepository(worldPath));
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
      this.#worldRepo.worldPath,
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
    const wp = this.#worldRepo.worldPath;
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
            .readdirSync(this.#worldRepo.worldPath, {
              withFileTypes: true,
            })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
      for (const dirName of dirs) {
        const filePath = path.join(
          this.#worldRepo.worldPath,
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
      const entityDir = path.join(this.#worldRepo.worldPath, f.collection);
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
    const filePath = path.join(
      this.#worldRepo.worldPath,
      entityType,
      `${id}.json`,
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async saveWorld(world: World): Promise<void> {
    return this.#worldRepo.saveWorld(world);
  }

  async loadWorld(): Promise<World> {
    return this.#worldRepo.loadWorld(this);
  }

  /**
   * Search up filesystem tree for .nameforma/ directory
   * @param {string} startPath - Starting directory
   * @returns {string|null} - Path to .nameforma/ or null if not found
   */

  /** @deprecated
   * Load or create World from path
   * Reads .nameforma/world.json if exists, otherwise creates new World only if create option is true
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static async worldFromPath(worldPath: string): Promise<World> {
    const worldRepo = new WorldRepository(worldPath);
    return worldRepo.worldFromPath(new FileRepository(worldRepo));
  }

  /**
   * Create new World at path. Throws Error if world exists.
   * Creates .nameforma/world.json
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static async createWorld(worldPath: string): Promise<World> {
    const worldRepo = new WorldRepository(worldPath);
    return worldRepo.createWorld(new FileRepository(worldRepo));
  }

  /**
   * Load World from path and throws if it does not exist
   * Reads .nameforma/world.json
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static async loadWorld(worldPath: string): Promise<World> {
    const worldRepo = new WorldRepository(worldPath);
    return worldRepo.loadWorld(new FileRepository(worldRepo));
  }

  #save(entityType: string, entity: any): void {
    const entityDir = path.join(this.#worldRepo.worldPath, entityType);
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
}
