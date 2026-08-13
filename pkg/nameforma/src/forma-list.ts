import UUID64 from './uuid64.js';
import { Identifiable, type FuzzyId } from './identifiable.js';
import { Forma } from './forma.js';
import { Entity } from './entity.js';
import { type IMutableNamespace } from './fuzzy-namespace.js';

/**
 * FormaListEvent<T> - Discriminated union of FormaList mutation events
 * Used to notify external systems (e.g., World persistence) of list changes
 *
 * entity is the in-memory object to be persisted:
 * - If item is an entity: entity = item
 * - If item is not an entity but parent is: entity = parent
 * - If neither is an entity: entity = undefined
 */
export type FormaListEvent<T extends Forma> =
  | { type: 'add'; item: T; cfg: any; entity?: Entity }
  | { type: 'patch'; item: T; cfg: any; entity?: Entity }
  | { type: 'delete'; item: T; entity?: Entity }
  | {
      type: 'move';
      item: T;
      options: { before?: FuzzyId | null; after?: FuzzyId | null };
      entity?: Entity;
    };

/**
 * IEventBus - Event emission interface for FormaList listeners
 */
export interface IEventBus {
  emit(event: string, payload: any): void;
  on(event: string, listener: (payload: any) => void): void;
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
 * - Generic type T must extend Forma (have id and patch methods)
 *
 * ## Construction
 * - new FormaList(items: T[], ItemClass: typeof Forma, cfg?: { parent?, emitter?, keyField?, namespace? })
 * - items array is mutated in-place (passed by reference)
 * - ItemClass constructor must accept cfg parameter with id property
 *
 * ## API
 * - addItem(cfg): T - Create and add new item using ItemClass factory
 * - deleteItem(id): T | undefined - Delete by ID, return deleted item or undefined
 * - getItem(id): T | undefined - Retrieve by ID
 * - patchItem(id, cfg): T - Update existing item (throws if not found)
 * - moveItem(id, {before?, after?}): T - Reorder item (throws if IDs not found)
 * - itemListId(item): string - Get unique ID within this list or namespace
 * - size: number - Get list size
 * - [Symbol.iterator]: Iterable support for spread syntax and for...of loops
 *
 * Note: FormaList is not Avro serializable (mutator helpers are runtime-only)
 */
export class FormaList<T extends Forma> {
  static readonly MIN_LIST_ITEM_ID_LENGTH = 5;

  readonly items: T[];
  readonly #ItemClass: typeof Forma;
  readonly parent: Entity | null;
  readonly keyField: string;
  #cachedPrefixLen: number | null = null;
  #cachedSuffixLen: number | null = null;
  #emitter?: IEventBus;
  _namespace?: IMutableNamespace;

  constructor(
    items: T[],
    ItemClass: typeof Forma,
    cfg?: {
      parent?: Entity;
      emitter?: IEventBus;
      keyField?: string;
      namespace?: IMutableNamespace;
    },
  ) {
    this.items = items;
    this.#ItemClass = ItemClass;
    this.parent = cfg?.parent ?? null;
    this.keyField = cfg?.keyField ?? 'id';
    this.#emitter = cfg?.emitter;
    this._namespace = cfg?.namespace;
  }

  /**
   * Compute entity to be persisted for an event based on item classification
   * @param item - The item being mutated
   * @returns { entity? } - The in-memory entity to be persisted
   */
  #computeEntityInfo(item: T): { entity?: Entity } {
    if (item instanceof Entity) {
      // Item itself is an entity
      return { entity: item as unknown as Entity };
    } else if (this.parent instanceof Entity) {
      // Item is not an entity, use parent entity
      return { entity: this.parent };
    }
    return {};
  }

  /**
   * Get the ItemClass for this list
   * @returns Forma constructor
   */
  get itemClass(): typeof Forma {
    return this.#ItemClass;
  }

  /**
   * Add new item to list
   * @param item - Item instance or POJO config
   * @returns New item
   */
  addItem(item: any): T {
    const $parentId = Entity.parentIdFor(this.parent, this.#ItemClass);
    const typedItem: T =
      item instanceof this.#ItemClass
        ? item
        : new (this.#ItemClass as any)({ ...item, $parentId });

    this.items.push(typedItem);
    this.#invalidateCache();
    this._namespace?.addForma(typedItem);

    if (this.#emitter) {
      const { entity } = this.#computeEntityInfo(typedItem);
      this.#emitter.emit('change', {
        type: 'add',
        item: typedItem,
        cfg: item,
        entity,
      } as FormaListEvent<T>);
    }

    return typedItem;
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
    this.#invalidateCache();
    this._namespace?.removeForma(id);

    if (this.#emitter) {
      const { entity } = this.#computeEntityInfo(itemToDelete);
      this.#emitter.emit('change', {
        type: 'delete',
        item: itemToDelete,
        entity,
      } as FormaListEvent<T>);
    }

    return itemToDelete;
  }

  /**
   * Get item by ID
   * @param id - Item ID (full UUID64, partial, or fuzzy match)
   * @returns Item if exactly one match found
   * @throws If no item found or multiple items match (ambiguous)
   */
  getItem(id: FuzzyId): T {
    const filter1 = Identifiable.idFilter(id, id.length, false);
    let matches = this.#filterItems((item) => filter1(this.#itemId(item)));

    if (matches.length === 0) {
      // Ignore case
      const filter2 = Identifiable.idFilter(id, id.length, true);
      matches = this.#filterItems((item) => filter2(this.#itemId(item)));
    }

    if (matches.length === 0) {
      throw new Error(`getItem: no item found for "${id}"`);
    }
    if (matches.length > 1) {
      const ids = matches.map((item) => this.#itemId(item)).join(', ');
      throw new Error(
        `getItem: ambiguous match for "${id}": found ${matches.length} items [${ids}]`,
      );
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
    // Delegate to item.patch() to enforce field restrictions
    item.patch(cfg);

    if (this.#emitter) {
      const { entity } = this.#computeEntityInfo(item);
      this.#emitter.emit('change', {
        type: 'patch',
        item,
        cfg,
        entity,
      } as FormaListEvent<T>);
    }

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
  moveItem(
    id: FuzzyId,
    options: { before?: FuzzyId | null; after?: FuzzyId | null } = {},
  ): T {
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
    this.#invalidateCache();

    if (this.#emitter) {
      const { entity } = this.#computeEntityInfo(item);
      this.#emitter.emit('change', {
        type: 'move',
        item,
        options,
        entity,
      } as FormaListEvent<T>);
    }

    return item;
  }

  /**
   * Invalidate cached prefix/suffix lengths when list contents change.
   */
  #invalidateCache(): void {
    this.#cachedPrefixLen = null;
    this.#cachedSuffixLen = null;
  }

  /**
   * Compute and cache common prefix/suffix lengths across all list item timeIds.
   * Ensures minimum itemListId length of MIN_LIST_ITEM_ID_LENGTH.
   * Special case: single item uses suffixLen=2 and adjusted prefixLen.
   * Invalidated when list contents change.
   */
  #computePrefixSuffixLengths(): void {
    const timeIds = this.items.map((it) =>
      ((it as any)[this.keyField] as UUID64).timeId(),
    );

    if (timeIds.length === 0) {
      this.#cachedPrefixLen = 0;
      this.#cachedSuffixLen = 0;
      return;
    }

    // Special case: single item in list
    if (timeIds.length === 1) {
      const suffixLen = 2;
      const prefixLen =
        UUID64.TIME_SEQ_CHARS -
        FormaList.MIN_LIST_ITEM_ID_LENGTH -
        suffixLen;
      this.#cachedPrefixLen = prefixLen;
      this.#cachedSuffixLen = suffixLen;
      return;
    }

    // Find common prefix
    let prefixLen = 0;
    for (let i = 0; i < UUID64.TIME_SEQ_CHARS; i++) {
      const char = timeIds[0][i];
      if (timeIds.every((id) => id[i] === char)) {
        prefixLen = i + 1;
      } else {
        break;
      }
    }

    // Find common suffix
    let suffixLen = 0;
    for (let i = 1; i <= UUID64.TIME_SEQ_CHARS - prefixLen; i++) {
      const char = timeIds[0][timeIds[0].length - i];
      if (timeIds.every((id) => id[id.length - i] === char)) {
        suffixLen = i;
      } else {
        break;
      }
    }

    // Ensure minimum itemListId length
    const resultLen = UUID64.TIME_SEQ_CHARS - prefixLen - suffixLen;
    if (resultLen < FormaList.MIN_LIST_ITEM_ID_LENGTH) {
      // Need to reduce prefix or suffix to meet minimum length
      const needed = FormaList.MIN_LIST_ITEM_ID_LENGTH - resultLen;
      if (suffixLen >= needed) {
        suffixLen -= needed;
      } else {
        prefixLen -= needed - suffixLen;
        suffixLen = 0;
      }
    }

    this.#cachedPrefixLen = prefixLen;
    this.#cachedSuffixLen = suffixLen;
  }

  /**
   * Return a unique list item identifier for the given item.
   * If namespace is provided, delegates to namespace.fuzzyIdOf().
   * Otherwise returns the raw timeId.
   */
  itemListId(item: T): string {
    if (this._namespace) {
      return this._namespace.fuzzyIdOf((item as any).id);
    }
    return ((item as any)[this.keyField] as UUID64).timeId();
  }

  /**
   * Sort items by comparator function
   * @param compareFn - Comparator function (a, b) => number
   * @returns This FormaList for chaining
   */
  sort(compareFn: (a: T, b: T) => number): this {
    this.items.sort(compareFn);
    this.#invalidateCache();
    return this;
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
    return this.items.findIndex((item) => filter(this.#itemId(item)));
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
   * Extract key field from item (uses keyField property, default 'id')
   * @param item - Item to get key from
   * @returns Key string (base64 representation)
   */
  #itemId(item: T): string {
    return (item as any)[this.keyField]?.base64 || '';
  }
}
