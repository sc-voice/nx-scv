import fs from 'fs';
import path from 'path';
import UUID64 from './uuid64.js';
import {
  Filter,
  TObject,
  type IEntity,
  IEntityRepository,
} from './entity.js';
import { World } from './world.js';
import { DBG } from './defines.js';
import { Text } from '@sc-voice/tools';
const { ColorConsole } = Text;
const { cc } = ColorConsole;

export class FileRepository implements IEntityRepository {
  #worldPath: string;

  constructor(worldPath: string) {
    const msg = 'FileRepository.ctor';
    if (!worldPath.includes('.nameforma')) {
      throw new Error(`${msg} invalid worldPath: ${worldPath}`);
    }
    this.#worldPath = worldPath;
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

  async *findMany<T extends IEntity>(
    EntityClass: T,
    filter: object,
  ): AsyncGenerator<ReturnType<T['fromJson']>> {
    const keys = Object.keys(filter);
    if (keys.length !== 0 && !(keys.length === 1 && keys[0] === 'id')) {
      throw new Error(
        `FileRepository.findMany: only {} or {id} filter supported, got ${JSON.stringify(filter)}`,
      );
    }
    const entityDir = path.join(
      this.#worldPath,
      (EntityClass as any).collection,
    );
    if (!fs.existsSync(entityDir)) return;
    const id = (filter as any).id;
    const files = fs
      .readdirSync(entityDir)
      .filter((f) => f.endsWith('.json'));
    for (const file of files) {
      if (id && file.slice(0, -5) !== id) continue;
      yield this.#load(EntityClass, path.join(entityDir, file));
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

      if (field === 'id') return f.id;

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
      if (!fs.existsSync(entityDir)) return [];
      const files = fs
        .readdirSync(entityDir)
        .filter((file) => file.endsWith('.json'));

      const updatedAtFilter = this.#parseUpdatedAtFilter(f.updatedAt);

      // If updatedAt filter is present, cannot use id-shortcut (must read files)
      if (updatedAtFilter && field === 'id') {
        const values = new Set<R>();
        for (const file of files) {
          const filePath = path.join(entityDir, file);
          const stats = fs.statSync(filePath);
          const matches = this.#filterUpdatedAt(
            stats.mtimeMs,
            updatedAtFilter,
          );

          if (matches) {
            values.add(file.slice(0, -5) as unknown as R);
          }
        }
        return Array.from(values);
      }

      if (field === 'id' && !updatedAtFilter) {
        return files.map((file) => file.slice(0, -5)) as unknown as R[];
      }

      const values = new Set<R>();
      for (const file of files) {
        const filePath = path.join(entityDir, file);
        const stats = fs.statSync(filePath);

        if (updatedAtFilter) {
          const matches = this.#filterUpdatedAt(
            stats.mtimeMs,
            updatedAtFilter,
          );

          if (matches) {
            values.add(fieldValue(filePath));
          }
        } else {
          const value = fieldValue(filePath);
          if (value !== undefined) {
            values.add(value);
          }
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
    return FileRepository.load(this.#worldPath);
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

  /** @deprecated
   * Load or create World from path
   * Reads .nameforma/world.json if exists, otherwise creates new World only if create option is true
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static worldFromPath(worldPath: string): World {
    const msg = 'world.fromPath';
    const dbg = DBG.WORLD.LOAD;

    const worldFile = path.join(worldPath, 'world.json');

    let world: World | undefined;

    if (fs.existsSync(worldFile)) {
      world = this.load(worldPath);
    } else {
      world = this.create(worldPath);
    }

    // Initialize sync cursor to now
    world.lastSyncTime = Date.now();

    return world;
  }

  /**
   * Create new World at path. Throws Error if world exists.
   * Creates .nameforma/world.json
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static create(worldPath: string): World {
    const msg = 'f12y.create';
    const dbg = DBG.WORLD.CTOR;

    const worldFile = path.join(worldPath, 'world.json');

    let world: World | undefined;

    if (fs.existsSync(worldFile)) {
      throw new Error(`World exists at ${worldPath}`);
    }
    // Create new World only if create flag is true
    const repository = new FileRepository(worldPath);
    world = new World(worldPath, repository);

    // Save world.json with generated id
    const worldData = JSON.stringify(world.toJSON(), null, 2);
    fs.writeFileSync(worldFile, worldData, 'utf8');
    dbg && cc.ok1(msg, `created ${worldFile}`);

    // Initialize sync cursor to now
    world.lastSyncTime = Date.now();

    return world;
  }

  /**
   * Load World from path and throws if it does not exist
   * Reads .nameforma/world.json
   * @param {string} worldPath - Path to .nameforma/ directory
   * @returns {World} - World instance with persistent or new id
   * @throws {Error} - If world not found and create is not true
   */
  static load(worldPath: string): World {
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
      /* await */ repository.saveWorld(world);
      dbg && cc.ok1(msg, `saved`);
    }

    // Initialize sync cursor to now
    world.lastSyncTime = Date.now();

    return world;
  }
}
