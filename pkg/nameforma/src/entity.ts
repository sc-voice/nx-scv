import UUID64 from './uuid64.js';
import { Forma, type Constructor } from './forma.js';
import {
  FuzzyNamespace,
  type IReadOnlyNamespace,
  type IMutableNamespace,
} from './fuzzy-namespace.js';
import { IRegistry } from './registry.js';
import { EntityRegistry } from './entity-registry.js';

/**
 * Entity - Abstract base class for persistent entities in World
 * Extends Forma with namespace management for child Forma objects (actions, references, etc.)
 */
export abstract class Entity extends Forma implements IRegistry, IEntity {
  declare collection: string;
  #namespace?: FuzzyNamespace;

  /**
   * Entity ids are mutually independent and unrelated to one another.
   * In contrast, when an Entity itself contains non-Entity Formas,
   * the non-Entity Forma ids are always related to the id
   * of their parent Entity by the UUID64 signature.
   * Linking parent/child id signatures provides a pragmatic way
   * to locate the parent of a non-Entity Forma in any namespace that
   * includes that parent. Parent collisions are highly unlikely and are
   * resolvable by examining the colliding entities.
   *
   * @param parent - Parent entity or null
   * @param ItemClass - Child item class to check
   * @returns Parent ID if child should be related to parent, undefined otherwise
   */
  static parentIdFor(
    parent: Entity | null,
    ItemClass: typeof Forma,
  ): UUID64 | undefined {
    if (parent && !(ItemClass.prototype instanceof Entity)) {
      return parent.id;
    }
    return undefined;
  }

  constructor(cfg: any = {}) {
    const msg = 'entity.ctor';
    super(cfg);
    // Make collection enumerable for projections and Object.entries().
    // Setter is no-op: Object.assign() fails on read-only getters; this allows compatibility.
    Object.defineProperty(this, 'collection', {
      get: () => (this.constructor as any).collection,
      set: () => {}, // Required for Object.assign(); collection is immutable
      enumerable: true,
      configurable: true,
    });
  }

  clearNamespace() {
    this.#namespace = new FuzzyNamespace();
  }

  override copyFrom(that: Entity): void {
    super.copyFrom(that);
    this.#namespace = that.#namespace;
  }

  /** IRegistry implementation: subclass must initialize namespace */
  get namespace(): IReadOnlyNamespace {
    if (!this.#namespace) {
      const subclass = this.constructor.name;
      throw new Error(`uninitialized ${subclass}`);
    }
    return this.#namespace;
  }

  /**
   * Get the mutable namespace for subclass use.
   * Lazy initialization: creates namespace and populates on first access
   */
  get mutableNamespace(): IMutableNamespace {
    if (!this.#namespace) {
      const subclass = this.constructor.name;
      throw new Error(`uninitialized ${subclass}`);
    }
    return this.#namespace;
  }

  /**
   * Add a Forma to this entity's namespace
   */
  protected addToNamespace(forma: Forma): void {
    this.mutableNamespace.addForma(forma);
  }

  fromJson(data: any): Entity {
    return (this.constructor as any).fromJson(data);
  }
}

/**
 * Contract for entity types with persistence support.
 */
export interface IEntity {
  collection: string;
  fromJson(data: any): Entity;
}

/** Generic object type for untyped data. */
export type TObject = Record<string, unknown>;

/**
 * MongoDB-style query operators for filtering entities.
 * @template TValue Type of values being compared
 */
export interface FilterOperators<TValue> {
  $eq?: TValue;
  $ne?: TValue;
  $gt?: TValue;
  $gte?: TValue;
  $lt?: TValue;
  $lte?: TValue;
  $in?: TValue[];
  $nin?: TValue[];
  $exists?: boolean;
  $regex?: string;
  $options?: string;
  $mod?: [number, number];
  $all?: TValue[];
  $size?: number;
  $type?: string;
  $where?: (val: any) => boolean;
  $elemMatch?: Record<string, any>;
  $and?: Record<string, any>[];
  $or?: Record<string, any>[];
  $nor?: Record<string, any>[];
  $not?: Record<string, any>;
}

/**
 * MongoDB-style filter for querying entities.
 * @template T Object type being filtered
 */
export type Filter<T extends TObject> = {
  id?: string | FilterOperators<string>;
  collection?: string | FilterOperators<string>;
  updatedAt?: Date | FilterOperators<Date>;
  [key: string]: unknown;
};

/**
 * Async iterable cursor for querying entities from a repository.
 * Follows MongoDB Cursor API for consistency across File and MongoDB backends.
 * Supports method chaining for query composition.
 *
 * @example
 * // Iterate with limiting
 * for await (const item of cursor.limit(10)) {
 *   console.log(item);
 * }
 *
 * @example
 * // Fetch all results
 * const items = await cursor.toArray();
 *
 * @template T - Entity type this cursor iterates over
 */
export interface ICursor<T> extends AsyncIterable<T> {
  /**
   * Materialize all results into an array. Do not use
   * with unlimited streams.
   * @returns Promise resolving to array of all results
   */
  toArray(): Promise<T[]>;

  /**
   * Limit results to first N items.
   * @param n Maximum number of items to return
   * @returns New cursor with limit applied (chainable)
   */
  limit(n: number): ICursor<T>;
}

/**
 * Entity-specific cursor extending base cursor with projection support.
 * @template ET Entity type this cursor iterates over
 */
export interface IEntityCursor<ET extends IEntity> extends ICursor<ET> {
  /**
   * Limit results to first N entities (chainable).
   */
  limit(n: number): IEntityCursor<ET>;

  /**
   * Project fields to include/exclude from results.
   * Supports nested paths like "actions.status".
   * @param projection MongoDB-style projection: {fieldName: 1} to include, 0 to exclude
   * @returns New cursor with projection applied (chainable)
   * @example
   * .project({ id: 1, name: 1 })  // include only id, name
   * .project({ summary: 0 })       // exclude summary
   * .project({ "actions.status": 1, name: 1 })  // nested paths
   */
  project(projection: Record<string, 0 | 1>): ICursor<any>;
}

/**
 * Repository for entity persistence and query operations.
 * Abstracts storage backend (file, MongoDB) behind a consistent interface.
 */
export interface IEntityRepository {
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
   * @param pojo World state object to save
   */
  saveWorld(pojo: Record<string, any>): Promise<void>;

  /**
   * Load world state from storage.
   * @returns Promise resolving to world state object
   */
  loadWorld(): Promise<Record<string, any>>;
}

/**
 * Verify class implements Entity contract
 */
export function validateEntity(EntityClass: any): EntityClass is IEntity {
  if (!EntityClass.collection) {
    throw new Error(
      `${EntityClass.name} missing static collection property`,
    );
  }
  if (!EntityClass.avroSchema) {
    throw new Error(
      `${EntityClass.name} missing static avroSchema property`,
    );
  }
  if (typeof EntityClass.fromJson !== 'function') {
    throw new Error(`${EntityClass.name} missing static fromJson method`);
  }
  return true;
}
