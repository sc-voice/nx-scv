import type { Filter, IEntity, IEntityCursor, TObject } from './entity.js';
import type { EntityRegistry } from './entity-registry.js';
import type { World } from './world.js';

/**
 * Repository for entity persistence and query operations.
 * Abstracts storage backend (file, MongoDB) behind a consistent interface.
 */
export interface IRepository {
  readonly projectUrl: URL;
  readonly entityRegistry: EntityRegistry;

  /**
   * Create or update a single entity.
   * @param EntityClass Entity type to create/update
   * @param cfg Configuration object for entity
   * @returns Promise resolving to created/updated entity
   */
  upsertOne<T extends IEntity>(
    EntityClass: T,
    cfg: TObject,
  ): Promise<ReturnType<T['fromJson']>>;

  /**
   * Find a single entity matching filter.
   * @param EntityClass Entity type to query
   * @param filter MongoDB-style filter object
   * @returns Promise resolving to entity or null if not found
   */
  findOne<T extends IEntity>(
    EntityClass: T,
    filter: Filter<TObject>,
  ): Promise<ReturnType<T['fromJson']> | null>;

  /**
   * Query entities of a specific type.
   * @param EntityClass Entity type to query
   * @param filter Optional MongoDB-style filter (collection auto-derived from EntityClass)
   * @returns Cursor for lazy iteration and composition
   */
  findMany<T extends IEntity>(
    EntityClass: T,
    filter?: Omit<Filter<TObject>, 'collection'>,
  ): IEntityCursor<T>;

  /**
   * Query all entities across all collections.
   * @param filter MongoDB-style filter object
   * @returns Cursor for lazy iteration and composition
   */
  findAll(filter: Filter<TObject>): IEntityCursor<IEntity>;

  /**
   * Get distinct values for a field across entities.
   * @param field Field name to get distinct values for
   * @param filter Optional MongoDB-style filter to narrow results
   * @returns Promise resolving to array of distinct values
   */
  distinct<R>(field: string, filter?: Filter<TObject>): Promise<R[]>;

  /**
   * Delete an entity by type and id.
   * @param entityType Type name of entity (e.g. 'task')
   * @param id Entity id
   */
  delete(entityType: string, id: string): Promise<void>;

  /**
   * Persist world state to storage.
   * @param world World to save
   */
  saveWorld(world: World): Promise<void>;

  /**
   * Load world state from storage.
   * @returns Promise resolving to the loaded World
   */
  loadWorld(): Promise<World>;
}
