import UUID64 from './uuid64.js';
import { Identifiable, type FuzzyId } from './identifiable.js';

/**
 * IFormaItem - Instance shape for items managed by FormaList
 * Items must be Identifiable (have immutable UUID64 id)
 */
export interface IFormaItem extends Identifiable {
  // Instance properties inherited from Identifiable
  // Subclasses can add additional properties
}

/**
 * IFormaItemClass - Constructor shape for item classes
 * Constructor accepts optional cfg parameter with id property
 */
export interface IFormaItemClass {
  new (cfg?: any): IFormaItem;
}

/**
 * FormaList - Mutation helper for Forma subclass arrays
 *
 * FormaList is a mutator (like a method helper), not a data structure.
 * It wraps an existing array reference and provides controlled CRUD methods
 * to mutate that array. FormaList operates on arrays passed by reference.
 *
 * ## Design Principles
 * - Mutator helper, not a data structure (mutates external array)
 * - Wraps existing array reference (does not own the array)
 * - All mutations go through controlled CRUD methods only
 * - Items created via direct constructor call with cfg parameter including id property
 * - parentId: UUID64 is optional; child item ids must be related if parentId provided
 * - Generic type T must extend IFormaItem (have Identifiable id property)
 *
 * ## Construction
 * - new FormaList(items: T[], ItemClass: IFormaItemClass, parentId?: UUID64)
 * - items array is mutated in-place (passed by reference)
 * - ItemClass constructor must accept cfg parameter with id property
 *
 * ## API
 * - addItem(cfg): T - Create and add new item using ItemClass factory
 * - deleteItem(id): T | undefined - Delete by ID, return deleted item or undefined
 * - getItem(id): T | undefined - Retrieve by ID
 * - patchItem(id, cfg): T - Update existing item (throws if not found)
 * - moveItem(id, {before?, after?}): T - Reorder item (throws if IDs not found)
 * - size: number - Get list size
 * - [Symbol.iterator]: Iterable support for spread syntax and for...of loops
 *
 * Note: FormaList is not Avro serializable (mutator helpers are runtime-only)
 */
export class FormaList<T extends IFormaItem> {
  readonly items: T[];
  readonly #ItemClass: IFormaItemClass;
  readonly parentId?: UUID64;

  constructor(items: T[], ItemClass: IFormaItemClass, parentId?: UUID64) {
    this.items = items;
    this.#ItemClass = ItemClass;
    this.parentId = parentId;
  }

  /**
   * Add new item to list, optionally enforcing parentId relation
   * @param cfg - Item configuration (optional, merged with auto-generated id if parentId provided)
   * @returns New item
   */
  addItem(cfg: any = {}): T {
    const msg = "FormaList.addItem:";

    if (this.parentId) {
      if (cfg.id == null) {
        cfg.id = UUID64.createRelatedId(this.parentId);
      }
      if (!this.parentId.isRelated(cfg.id)) {
        throw new Error(`${msg} cannot add unrelated item:${cfg.id}`);
      }
    }

    const item = new (this.#ItemClass as any)(cfg) as T;
    this.items.push(item);
    return item;
  }

  /**
   * Delete item by ID
   * @param id - Item ID to delete (full UUID64, partial, or fuzzy match)
   * @returns Deleted item
   * @throws If no item found or multiple items match (ambiguous)
   */
  deleteItem(id: FuzzyId): T {
    const itemToDelete = this.getItem(id);
    const index = this.items.indexOf(itemToDelete);
    this.items.splice(index, 1);
    return itemToDelete;
  }

  /**
   * Get item by ID
   * @param id - Item ID (full UUID64, partial, or fuzzy match)
   * @returns Item if exactly one match found
   * @throws If no item found or multiple items match (ambiguous)
   */
  getItem(id: FuzzyId): T {
    const filter = Identifiable.idFilter(id);
    const matches = this.#filterItems(item => filter(this.#itemId(item)));

    if (matches.length === 0) {
      throw new Error(`getItem: no item found for "${id}"`);
    }
    if (matches.length > 1) {
      const ids = matches.map(item => this.#itemId(item)).join(', ');
      throw new Error(`getItem: ambiguous match for "${id}": found ${matches.length} items [${ids}]`);
    }
    return matches[0];
  }

  /**
   * Patch (partially update) existing item
   * @param id - Item ID (full UUID64, partial, or fuzzy match)
   * @param cfg - Partial config to apply
   * @returns Updated item
   * @throws If item not found
   */
  patchItem(id: FuzzyId, cfg: any): T {
    const item = this.getItem(id);
    if (!item) {
      throw new Error(`Item not found: ${id}`);
    }
    // Apply partial update - merge cfg into item
    Object.assign(item, cfg);
    return item;
  }

  /**
   * Move item to new position using anchor references
   * @param id - Item ID to move (full UUID64, partial, or fuzzy match)
   * @param options - {before?: FuzzyId, after?: FuzzyId}
   *   - before: null → insert at start; FuzzyId → insert before that item
   *   - after: null → append at end; FuzzyId → insert after that item
   *   - neither → append at end
   * @returns Moved item
   * @throws If item ID or anchor ID not found
   */
  moveItem(id: FuzzyId, options: { before?: FuzzyId | null; after?: FuzzyId | null } = {}): T {
    const index = this.#findIndex(id);
    if (index === -1) {
      throw new Error(`Item not found: ${id}`);
    }

    const item = this.items[index];

    // Remove from current position
    this.items.splice(index, 1);

    // Determine insert position
    let insertIndex = this.items.length; // Default: append

    if (options.before !== undefined) {
      if (options.before === null) {
        insertIndex = 0; // Insert at start
      } else {
        const beforeIndex = this.#findIndex(options.before);
        if (beforeIndex === -1) {
          throw new Error(`Anchor not found: ${options.before}`);
        }
        insertIndex = beforeIndex;
      }
    } else if (options.after !== undefined) {
      if (options.after === null) {
        insertIndex = this.items.length; // Append at end
      } else {
        const afterIndex = this.#findIndex(options.after);
        if (afterIndex === -1) {
          throw new Error(`Anchor not found: ${options.after}`);
        }
        insertIndex = afterIndex + 1;
      }
    }

    // Insert at new position
    this.items.splice(insertIndex, 0, item);
    return item;
  }

  /**
   * Get list size
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * Enable iterable support (spread syntax, for...of loops)
   */
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  // Private helpers

  /**
   * Find index of item by fuzzy ID match
   * @param id - Item ID (full UUID64, partial, or fuzzy match)
   * @returns Index or -1 if not found
   */
  #findIndex(id: FuzzyId): number {
    const filter = Identifiable.idFilter(id);
    return this.items.findIndex(item => filter(this.#itemId(item)));
  }

  /**
   * Filter items by predicate
   * @param predicate - Filter function to apply to items
   * @returns Filtered items
   */
  #filterItems(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  /**
   * Extract ID from item (assumes item has .id property with .base64)
   * @param item - Item to get ID from
   * @returns ID string
   */
  #itemId(item: T): string {
    return (item as any).id?.base64 || '';
  }
}
