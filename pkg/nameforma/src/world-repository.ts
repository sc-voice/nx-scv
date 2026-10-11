import fs from 'fs';
import path from 'path';
import { type IRepository } from './repository.js';
import { World } from './world.js';
import { DBG } from './defines.js';
import { NfUrl } from './nf-url.js';
import { logger } from './logger.js';

/**
 * The WorldRepository manages nameforma metadata files
 * (e.g., world.json, session.json) within the .nameforma
 * directory of a project. A WorldRepository is not an
 * entity repository, but IRepository implementations
 * can host their data in the project-local WorldRepository folder
 * or remotely according to need. For example, a FileRepository
 * stores entities locally as separate JSON files, while a
 * potential MongoDBRepository could store entities remotely.
 */
export class WorldRepository {
  readonly worldPath: string;

  constructor(worldPath: string) {
    const ctx = 'w13y.ctor';
    if (!worldPath.includes('.nameforma')) {
      throw new Error(`${ctx} invalid worldPath: ${worldPath}`);
    }
    this.worldPath = worldPath;
  }

  /**
   * Persist world state to storage.
   * Creates .nameforma/ directory if missing
   * @param world World (or object with toJSON) to save
   */
  async saveWorld(world: World): Promise<void> {
    const ctx = 'w13y.save';
    const dbg = DBG.WORLD.SAVE;

    if (!fs.existsSync(this.worldPath)) {
      fs.mkdirSync(this.worldPath, { recursive: true });
      dbg && logger.info({ ctx }, `created ${this.worldPath}`);
    }

    const worldFile = path.join(this.worldPath, 'world.json');
    const data = JSON.stringify(world.toJSON(), null, 2);
    fs.writeFileSync(worldFile, data, 'utf8');

    dbg && logger.info({ ctx }, `saved ${worldFile}`);
  }

  /**
   * Load or create World.
   * @returns World with persistent or new id
   */
  async worldFromPath(entityRepo: IRepository) {
    const worldFile = path.join(this.worldPath, 'world.json');
    return fs.existsSync(worldFile)
      ? this.loadWorld(entityRepo)
      : this.createWorld(entityRepo);
  }

  /**
   * Create new World at path. Throws Error if world exists.
   * Name and summary default to package.json values, then path-based defaults.
   * @throws {Error} - If world exists
   */
  async createWorld(entityRepo: IRepository) {
    const ctx = 'w13y.createWorld';
    const dbg = DBG.WORLD.CTOR;

    const worldFile = path.join(this.worldPath, 'world.json');
    if (fs.existsSync(worldFile)) {
      throw new Error(`World exists at ${this.worldPath}`);
    }

    // Compute name and summary defaults for new world
    const worldRoot = path.dirname(this.worldPath);
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
      summary = this.worldPath;
    }

    const world = new World(this.worldPath, entityRepo, { name, summary });
    await world.initialize();
    await this.saveWorld(world);
    dbg && logger.info({ ctx }, `created ${worldFile}`);

    return world;
  }

  /**
   * Load World and throws if it does not exist
   * @throws {Error} - If world not found
   */
  async loadWorld(entityRepo: IRepository) {
    const ctx = 'w13y.load';
    const dbg = DBG.WORLD.LOAD;

    const worldFile = path.join(this.worldPath, 'world.json');
    if (!fs.existsSync(worldFile)) {
      throw new Error(
        `World not found at ${this.worldPath}. Run 'nf init ${this.worldPath}' to create one.`,
      );
    }

    const json = JSON.parse(fs.readFileSync(worldFile, 'utf8'));
    dbg && logger.info({ ctx }, `loaded ${worldFile}`);
    const world = World.fromJson(json, entityRepo, this.worldPath);
    // Synchronize watermark with current git HEAD and persist if advanced
    const watermarkAdvanced = world.syncWatermark();
    const isValid = world.validate();
    if (!isValid || watermarkAdvanced) {
      await this.saveWorld(world);
      dbg && logger.info({ ctx }, `saved`);
    }

    await world.initialize();

    return world;
  }
}
