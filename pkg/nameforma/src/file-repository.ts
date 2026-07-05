import fs from 'fs';
import path from 'path';
import UUID64 from './uuid64.js';
import { type EntityConstructor } from './entity.js';
import { type IEntityRepository, World } from './world.js';
import { DBG } from './defines.js';
import { Text } from '@sc-voice/tools';
const { ColorConsole } = Text;
const { cc } = ColorConsole;

export class FileRepository implements IEntityRepository {
  #worldPath: string;

  constructor(worldPath: string) {
    this.#worldPath = worldPath;
  }

  async insertOne<T extends EntityConstructor>(
    EntityClass: T,
    cfg: object,
  ): Promise<ReturnType<T['fromJson']>> {
    const instance = new (EntityClass as any)(cfg) as ReturnType<
      T['fromJson']
    >;
    this.#save((EntityClass as any).entity, instance);
    return instance;
  }

  async findOne<T extends EntityConstructor>(
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
      (EntityClass as any).entity,
      `${id}.json`,
    );
    if (!fs.existsSync(filePath)) return null;
    return this.#load(EntityClass, filePath);
  }

  async *findMany<T extends EntityConstructor>(
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
      (EntityClass as any).entity,
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

  async delete(entityType: string, id: string): Promise<void> {
    const filePath = path.join(this.#worldPath, entityType, `${id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async saveWorld(): Promise<void> {
    throw new Error(
      'FileRepository.saveWorld: call World.save() directly',
    );
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

  #load<T extends EntityConstructor>(
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
    const dbg = DBG.WORLD.CTOR;

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
    const dbg = DBG.WORLD.CTOR;

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
      world.save();
      dbg && cc.ok1(msg, `saved`);
    }

    // Initialize sync cursor to now
    world.lastSyncTime = Date.now();

    return world;
  }
}
