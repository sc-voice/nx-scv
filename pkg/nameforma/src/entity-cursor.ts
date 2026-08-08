import type { ICursor, IEntityCursor, IEntity } from './entity.js';

/**
 * Base class for entity cursors with shared projection logic.
 * Implementations handle filtering and iteration; this class handles projection.
 * Uses Template Method pattern: concrete methods enforce invariants, delegate to abstract raw* methods.
 */
export abstract class EntityCursor<T extends IEntity>
  implements IEntityCursor<T>
{
  protected _projection?: Record<string, 0 | 1>;
  protected _nYield = 0;
  protected _limit: number = 0;

  get projection(): Record<string, 0 | 1> | undefined {
    return this._projection;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for await (const item of this.rawIterator()) {
      this._nYield++;
      yield item;
      if (this._limit && this._nYield >= this._limit) break;
    }
  }

  /** Subclasses implement the actual iteration logic */
  protected abstract rawIterator(): AsyncGenerator<T>;

  async toArray(): Promise<T[]> {
    const results: T[] = [];
    for await (const item of this) {
      results.push(item);
    }
    return results;
  }

  /** Enforce limit before iteration starts */
  limit(n: number): IEntityCursor<T> {
    if (this._nYield > 0) {
      throw new Error(
        `limit() must be called before iteration (${this._nYield} items already yielded)`,
      );
    }
    this._limit = n;
    return this;
  }

  /** Enforce projection before iteration starts */
  project(projection: Record<string, 0 | 1>): ProjectionCursor<any> {
    if (this._nYield > 0) {
      throw new Error(
        `project() must be called before iteration (${this._nYield} items already yielded)`,
      );
    }
    return new ProjectionCursor(this, projection);
  }

  /**
   * Apply MongoDB-style projection to an object, supporting dotted paths.
   * Handles both inclusion (flag=1) and exclusion (flag=0) projections.
   */
  static applyProjection(
    obj: any,
    projection: Record<string, 0 | 1>,
  ): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (!Object.keys(projection).length) {
      return obj;
    }

    const globalOptIn = Object.values(projection).some((v) => v === 1);
    const byRoot: Record<
      string,
      { flag?: 0 | 1; paths: Array<{ path: string; flag: 0 | 1 }> }
    > = {};

    for (const [path, flag] of Object.entries(projection)) {
      const parts = path.split('.');
      const root = parts[0];

      if (!byRoot[root]) {
        byRoot[root] = { paths: [] };
      }

      if (parts.length === 1) {
        byRoot[root].flag = flag;
      } else {
        byRoot[root].paths.push({
          path: parts.slice(1).join('.'),
          flag,
        });
      }
    }

    const result: any = {};

    for (const [k, v] of Object.entries(obj)) {
      const rootProj = byRoot[k];

      if (!rootProj && globalOptIn) {
        continue;
      } else if (rootProj?.flag === 0) {
        continue;
      } else if (rootProj?.flag === 1) {
        result[k] = v;
      } else if (rootProj && rootProj.paths.length > 0) {
        const nestedProj: Record<string, 0 | 1> = {};
        for (const { path, flag } of rootProj.paths) {
          nestedProj[path] = flag;
        }
        if (Array.isArray(v)) {
          result[k] = v.map((item) =>
            EntityCursor.applyProjection(item, nestedProj),
          );
        } else {
          result[k] = EntityCursor.applyProjection(v, nestedProj);
        }
      } else {
        result[k] = v;
      }
    }

    return result;
  }
}

/** Wrapper cursor that applies projection to items from inner cursor */
export class ProjectionCursor<T> implements ICursor<T> {
  #inner: ICursor<any>;
  #projection: Record<string, 0 | 1>;

  constructor(inner: ICursor<any>, projection: Record<string, 0 | 1>) {
    this.#inner = inner;
    this.#projection = projection;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for await (const item of this.#inner) {
      yield EntityCursor.applyProjection(item, this.#projection) as T;
    }
  }

  async toArray(): Promise<T[]> {
    const results: T[] = [];
    for await (const item of this) {
      results.push(item);
    }
    return results;
  }

  limit(n: number): ProjectionCursor<T> {
    return new ProjectionCursor(this.#inner.limit(n), this.#projection);
  }
}

/** Utility class for testing may also be useful elsewhere */
export class ArrayEntityCursor<T extends IEntity>
  extends EntityCursor<T>
  implements IEntityCursor<T>
{
  items: T[];

  constructor(items: T[]) {
    super();
    this.items = items;
  }

  protected async *rawIterator(): AsyncGenerator<T> {
    for (const item of this.items) {
      yield item;
    }
  }
}
