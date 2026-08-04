import type { IEntityCursor, IEntity } from './entity.js';

/**
 * Base class for entity cursors with shared projection logic.
 * Implementations handle filtering and iteration; this class handles projection.
 */
export abstract class EntityCursor<T extends IEntity>
  implements IEntityCursor<T>
{
  protected projection?: Record<string, 0 | 1>;

  abstract [Symbol.asyncIterator](): AsyncIterator<T>;

  async toArray(): Promise<T[]> {
    const results: T[] = [];
    for await (const item of this) {
      results.push(item);
    }
    return results;
  }

  limit(n: number): IEntityCursor<T> {
    // Subclasses override this to implement limiting
    throw new Error('limit() must be implemented by subclass');
  }

  project(projection: Record<string, 0 | 1>): IEntityCursor<T> {
    this.projection = projection;
    return this;
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
