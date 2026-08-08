import { IEntity, IEntityCursor } from './entity.js';
import { EntityCursor } from './entity-cursor.js';

const DEFAULT_LIMIT = 10;

/**
 * EntityScope supports a limited, synchronous "head view" of a
 * potentially unbounded findAll() query. The
 * fromEntityCursor() factory method and is capable
 * of realizing different projections of the initial query.
 */
export class EntityScope {
  readonly entities: IEntity[];
  readonly projected: Record<string, any>[] = [];
  readonly projection: Record<string, 0 | 1> | null = null;
  #index: number = 0;

  private constructor(
    entities: IEntity[],
    projection: Record<string, 0 | 1>,
  ) {
    this.entities = entities;
    this.projection = projection;
    this.projected = this.entities.map((entity) => {
      return EntityCursor.applyProjection(entity, projection);
    });
  }

  /**
   * Create a synchronous "head view" of a query by eagerly draining
   * a limited number of entities from the cursor.
   * @param cursor The cursor to drain.
   * @param limit Retrieval limit
   * @returns A promise that resolves to an EntityScope.
   */
  static async fromEntityCursor(
    cursor: IEntityCursor<IEntity>,
    limit: number = DEFAULT_LIMIT,
    projection: Record<string, 0 | 1> = {},
  ): Promise<EntityScope> {
    const entities: IEntity[] = [];

    if (limit > 0) {
      for await (const entity of cursor.limit(limit)) {
        entities.push(entity);
      }
    }

    return new EntityScope(entities, projection);
  }

  /**
   * Moves the current index to the next item.
   */
  next(): void {
    if (this.#index < this.length - 1) {
      this.#index++;
    }
  }

  /**
   * Moves the current index to the previous item.
   */
  prev(): void {
    if (this.#index > 0) {
      this.#index--;
    }
  }

  /**
   * Returns the total number of entities in this scope.
   */
  get length(): number {
    return this.entities.length;
  }

  /**
   * Get entity at a specific index with bounds enforcement.
   * Defaults to current cursor position if index not specified.
   */
  at(index: number = this.#index): IEntity | null {
    if (index < 0 || index >= this.length) return null;
    return this.entities[index];
  }

  /**
   * Get the current index position.
   */
  get index(): number {
    return this.#index;
  }

  /**
   * Move to a specific index with bounds enforcement.
   */
  moveTo(index: number): void {
    this.#index = Math.max(0, Math.min(index, this.length - 1));
  }
}
