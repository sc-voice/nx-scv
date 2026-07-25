import RGA64Stack from './rga64-stack.js';
import UUID64 from './uuid64.js';
import { Forma } from './forma.js';
import { User } from './user.js';

/** Manages the focus stack of entities. */
export interface IFocusManager {
  /** Push id onto focus stack with user signature. Removes if already present. */
  focus(id: UUID64, user?: any): void;

  /** Remove id from focus stack. Returns removed id or null if not found. */
  unfocus(id?: UUID64): UUID64 | null;

  /** Get most recent id in focus stack, or null if empty. */
  peek(): UUID64 | null;

  /** Get all ids in focus stack (most recent first). */
  ids(): UUID64[];

  /** Get position of id in focus stack (0 = most recent). Returns MAX_SAFE_INTEGER if not found. */
  focusOrder(id: UUID64): number;

  /** Check if a forma is in the focus stack. */
  isFocused(forma: Forma): boolean;

  /** Remove tombstones older than minObservedTime (safe GC for distributed CRDT). */
  compact(minObservedTime: number): boolean;

  /** Number of items in focus stack. */
  get size(): number;

  /** Push id onto local transient focus stack. */
  focusLocal(id: UUID64): void;

  /** Remove id from local transient focus stack. Returns removed id or null if not found. */
  unfocusLocal(id: UUID64): UUID64 | null;

  /** Get most recent id in local focus stack, or null if empty. */
  peekLocal(): UUID64 | null;
}

/** Manages the focus stack using RGA64 replicated list. */
export class FocusManager implements IFocusManager {
  private _rgaFocusStack: RGA64Stack;
  private _focusOrderCache: Map<string, number> | null = null;
  private _localFocus: UUID64[] = [];

  constructor() {
    this._rgaFocusStack = new RGA64Stack({ name: 'Focus Stack' });
  }

  /** Invalidate focusOrder cache when stack mutates. */
  private _invalidateCache(): void {
    this._focusOrderCache = null;
  }

  /** Build or return cached focusOrder map. */
  private _getFocusOrderMap(): Map<string, number> {
    if (this._focusOrderCache) {
      return this._focusOrderCache;
    }

    const map = new Map<string, number>();
    const ids = this.ids();
    for (let i = 0; i < ids.length; i++) {
      map.set(ids[i].base64, i);
    }
    this._focusOrderCache = map;
    return map;
  }

  /** Number of items in focus stack. */
  get size(): number {
    return this._rgaFocusStack.size;
  }

  /** Push id onto focus stack. Removes if already present (deduped by push).  */
  focus(id: UUID64, user: User = User.UNKNOWN): void {
    this._rgaFocusStack.push(id, user);
    this._invalidateCache();
  }

  /** Remove id from focus stack. If id not provided, removes top item. Returns removed id or null. */
  unfocus(id?: UUID64): UUID64 | null {
    const idToRemove = id || this.peek();
    if (!idToRemove) return null;

    const removed = this._rgaFocusStack.remove(idToRemove);
    if (removed) {
      this._invalidateCache();
      return idToRemove;
    }
    return null;
  }

  ids(): UUID64[] {
    return this._rgaFocusStack.values();
  }

  focusOrder(id: UUID64): number {
    const map = this._getFocusOrderMap();
    return map.get(id.base64) ?? Number.MAX_SAFE_INTEGER;
  }

  isFocused(forma: Forma): boolean {
    return this.focusOrder(forma.id) !== Number.MAX_SAFE_INTEGER;
  }

  /** Get most recent id in focus stack, or null if empty. */
  peek(): UUID64 | null {
    const topNode = this._rgaFocusStack.peek();
    return topNode ? topNode.value : null;
  }

  /** Remove tombstones older than minObservedTime (safe GC for distributed CRDT). */
  compact(minObservedTime: number): boolean {
    return this._rgaFocusStack.compact(minObservedTime);
  }

  /** Push id onto local transient focus stack. */
  focusLocal(id: UUID64): void {
    this._localFocus.unshift(id);
  }

  /** Remove id from local transient focus stack. Returns removed id or null if not found. */
  unfocusLocal(id: UUID64): UUID64 | null {
    const index = this._localFocus.findIndex(
      (item) => item.base64 === id.base64,
    );
    if (index !== -1) {
      return this._localFocus.splice(index, 1)[0];
    }
    return null;
  }

  /** Get most recent id in local focus stack, or null if empty. */
  peekLocal(): UUID64 | null {
    return this._localFocus.length > 0 ? this._localFocus[0] : null;
  }

  /** Serialize to JSON. */
  toJSON(): any {
    return {
      rgaFocusStack: this._rgaFocusStack.toJSON(),
    };
  }

  /** Deserialize from JSON with backward compatibility for old focusStack format. */
  static fromJSON(data: any): FocusManager {
    const fm = new FocusManager();

    // Restore rgaFocusStack if present
    if (data.rgaFocusStack && typeof data.rgaFocusStack === 'object') {
      fm._rgaFocusStack = RGA64Stack.fromJSON(data.rgaFocusStack);
    } else if (data.focusStack && Array.isArray(data.focusStack)) {
      // Backward compatibility: sync old focusStack data to new rgaFocusStack
      for (const f of data.focusStack) {
        fm._rgaFocusStack.push(UUID64.fromString(f.formaId));
      }
    }

    fm._invalidateCache();
    return fm;
  }
}
