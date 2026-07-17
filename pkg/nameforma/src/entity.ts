import UUID64 from './uuid64.js';
import { Forma, type Constructor } from './forma.js';
import {
  FuzzyNamespace,
  type IReadOnlyNamespace,
  type IMutableNamespace,
} from './fuzzy-namespace.js';
import { IRegistry } from './registry.js';

/**
 * Entity - Abstract base class for persistent entities in World
 * Extends Forma with namespace management for child Forma objects (actions, references, etc.)
 */
export abstract class Entity extends Forma implements IRegistry {
  protected _namespace?: FuzzyNamespace;

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
  }

  /** IRegistry implementation: subclass must initialize namespace */
  get namespace(): IReadOnlyNamespace {
    if (!this._namespace) {
      const subclass = this.constructor.name;
      throw new Error(`${subclass} must initialize _namespace`);
    }
    return this._namespace;
  }

  /**
   * Get the mutable namespace for subclass use.
   * Lazy initialization: creates namespace and populates on first access
   */
  get mutableNamespace(): IMutableNamespace {
    if (!this._namespace) {
      const subclass = this.constructor.name;
      throw new Error(`${subclass} must initialize _namespace`);
    }
    return this._namespace;
  }

  /**
   * Add a Forma to this entity's namespace
   */
  protected addToNamespace(forma: Forma): void {
    this.mutableNamespace.addForma(forma);
  }
}

export interface IEntity {
  collection: string;
  avroSchema: any;
  fromJson(data: any): Entity;
}

export type TObject = Record<string, unknown>;

export interface FilterOperators<TValue> {
  $eq?: TValue;
  $gt?: TValue;
  $gte?: TValue;
  $lt?: TValue;
  $lte?: TValue;
}

export type Filter<T extends TObject> =
  | { id: string; collection?: string }
  | { collection: string; updatedAt?: Date | FilterOperators<Date> };

/**
 * Entities are stored in a repository for a World
 */
export interface IEntityRepository {
  upsertOne<T extends IEntity>(
    EntityClass: T,
    cfg: TObject,
  ): Promise<ReturnType<T['fromJson']>>;
  findOne<T extends IEntity>(
    EntityClass: T,
    filter: Filter<TObject>,
  ): Promise<ReturnType<T['fromJson']> | null>;
  findMany<T extends IEntity>(
    EntityClass: T,
    filter: Filter<TObject>,
  ): AsyncGenerator<ReturnType<T['fromJson']>>;
  distinct<R>(field: string, filter?: Filter<TObject>): Promise<R[]>;

  delete(entityType: string, id: string): Promise<void>;
  saveWorld(pojo: Record<string, any>): Promise<void>;
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
