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

  /** Remove tombstones older than minObservedTime (safe GC for distributed CRDT). */
  compact(minObservedTime: number): boolean;

  /** Number of items in focus stack. */
  get size(): number;
}

/** Manages the focus stack using RGA64 replicated list. */
export class FocusManager implements IFocusManager {
  #rgaFocusStack: RGA64Stack;

  constructor() {
    this.#rgaFocusStack = new RGA64Stack({ name: 'Focus Stack' });
  }

  get rgaFocusStack(): RGA64Stack {
    return this.#rgaFocusStack;
  }

  /** Number of items in focus stack. */
  get size(): number {
    return this.#rgaFocusStack.size;
  }

  /** Replace the RGA focus stack (for deserialization). */
  setRgaFocusStack(rgaFocusStack: RGA64Stack): void {
    this.#rgaFocusStack = rgaFocusStack;
  }

  /** Push id onto focus stack. Removes if already present (deduped by push).  */
  focus(id: UUID64, user: User = User.UNKNOWN): void {
    this.#rgaFocusStack.push(id, user);
  }

  /** Remove id from focus stack. If id not provided, removes top item. Returns removed id or null. */
  unfocus(id?: UUID64): UUID64 | null {
    const idToRemove = id || this.peek();
    if (!idToRemove) return null;

    const removed = this.#rgaFocusStack.remove(idToRemove);
    return removed ? idToRemove : null;
  }

  ids(): UUID64[] {
    return this.#rgaFocusStack.values();
  }

  focusOrder(id: UUID64): number {
    const ids = this.ids();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i].equals(id)) {
        return i; // Position from most recent
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  /** Get most recent id in focus stack, or null if empty. */
  peek(): UUID64 | null {
    const topNode = this.#rgaFocusStack.peek();
    return topNode ? topNode.value : null;
  }

  /** Remove tombstones older than minObservedTime (safe GC for distributed CRDT). */
  compact(minObservedTime: number): boolean {
    return this.#rgaFocusStack.compact(minObservedTime);
  }

  /** Serialize to JSON. */
  toJSON(): any {
    return {
      rgaFocusStack: this.#rgaFocusStack.toJSON(),
    };
  }

  /** Deserialize from JSON with backward compatibility for old focusStack format. */
  static fromJSON(data: any): FocusManager {
    const fm = new FocusManager();

    // Restore rgaFocusStack if present
    if (data.rgaFocusStack && typeof data.rgaFocusStack === 'object') {
      fm.setRgaFocusStack(RGA64Stack.fromJSON(data.rgaFocusStack));
    } else if (data.focusStack && Array.isArray(data.focusStack)) {
      // Backward compatibility: sync old focusStack data to new rgaFocusStack
      for (const f of data.focusStack) {
        fm.#rgaFocusStack.push(UUID64.fromString(f.formaId));
      }
    }

    return fm;
  }
}
