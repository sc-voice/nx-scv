import { IEntity } from './entity.js';
import { validateEntity } from './entity.js';

/**
 * Registry for managing entity classes in a World
 * Stores entity class definitions keyed by collection name
 */
export class EntityRegistry {
  readonly #registry = new Map<string, IEntity>();

  /**
   * Register an entity class with this registry
   * Derives entity name from EntityClass.collection static property
   * @param EntityClass - Entity class with collection, avroSchema, and fromJson
   * @throws {Error} - If entity missing required static properties
   */
  registerEntity(EntityClass: IEntity): void {
    validateEntity(EntityClass);
    const collection = EntityClass.collection;
    this.#registry.set(collection, EntityClass);
  }

  /**
   * Get all registered entity collection names
   * @returns Array of entity collection names
   */
  getEntityNames(): string[] {
    return Array.from(this.#registry.keys());
  }

  /**
   * Get entity constructor by collection name
   * @param name - Entity collection name
   * @returns Entity constructor or null if not registered
   */
  entityClassOfName(name: string): IEntity | null {
    return this.#registry.get(name) || null;
  }
}
