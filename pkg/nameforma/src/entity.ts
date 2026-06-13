import { Forma } from './forma.js';
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
  #namespace?: FuzzyNamespace;

  constructor(cfg: any = {}) {
    const msg = 'entity.ctor';
    super(cfg);
  }

  /**
   * IRegistry implementation: return the read-only namespace managed by this entity
   * Lazy initialization: creates namespace and populates on first access
   */
  get namespace(): IReadOnlyNamespace {
    if (!this.#namespace) {
      this.#namespace = new FuzzyNamespace();
      this.populateNamespace();
    }
    return this.#namespace;
  }

  /**
   * Populate namespace with child Forma objects.
   * Subclasses override to add their specific collections (actions, references, etc.)
   */
  protected abstract populateNamespace(): void;

  /**
   * Get the mutable namespace for subclass use (e.g., FormaList operations)
   * Lazy initialization: creates namespace and populates on first access
   */
  get mutableNamespace(): IMutableNamespace {
    if (!this.#namespace) {
      this.#namespace = new FuzzyNamespace();
      this.populateNamespace();
    }
    return this.#namespace;
  }

  /**
   * Add a Forma to this entity's namespace
   */
  protected addToNamespace(forma: Forma): void {
    this.mutableNamespace.addForma(forma);
  }
}

export interface EntityConstructor {
  entity: string;
  avroSchema: any;
  fromJson(data: any): Entity;
}

/**
 * Verify class implements Entity contract
 */
export function validateEntity(
  EntityClass: any,
): EntityClass is EntityConstructor {
  if (!EntityClass.entity) {
    throw new Error(`${EntityClass.name} missing static entity property`);
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
