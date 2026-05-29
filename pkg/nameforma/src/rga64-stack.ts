import UUID64 from './uuid64.js';
import { Forma } from './forma.js';
import RGA64Node from './rga64-node.js';
import { Schema } from './schema.js';
import { User } from './user.js';

/**
 * RGA64Stack - A Replicable Growable Array stack using UUID64 identifiers.
 *
 * Extends Forma to provide CRDT-based collaborative stack semantics:
 * - Multiple users can push/pop concurrently
 * - Nodes with null parent are at top-of-stack
 * - Conflicts resolved by sorting by UUID64.timeId()
 * - Deleted nodes use tombstones
 * - Nodes serialize to/from string format for Git-friendly JSON
 */
export class RGA64Stack extends Forma {
  nodes: RGA64Node[] = [];

  constructor(cfg: any = {}) {
    super(cfg);
    const { nodes = [] } = cfg;
    if (Array.isArray(nodes)) {
      this.nodes = nodes.map((n) =>
        typeof n === 'string' ? RGA64Node.parse(n) : n
      );
    }
  }

  /**
   * Push a value to the top of the stack.
   * Creates a new leaf node with parent pointing to current top.
   * Node id is derived from user's signature for CRDT conflict resolution.
   */
  push(value: UUID64, user: User = User.UNKNOWN): RGA64Node {
    const id = user.generateUUID64();
    const parent = this._top()?.id ?? null;
    const node = new RGA64Node(id, value, parent, false);
    this.nodes.push(node);
    return node;
  }

  /**
   * Find the top of the stack (leaf node).
   * Returns the active node whose id is not referenced as parent by any other active node.
   * Among concurrent leaves (branch conflict), returns the one with highest id.
   */
  private _top(): RGA64Node | undefined {
    const active = this.nodes.filter((n) => !n.deleted);
    if (active.length === 0) return undefined;

    // Find node whose id is not referenced as parent by any other active node
    const parentIds = new Set(
      active
        .filter((n) => n.parent !== null)
        .map((n) => n.parent!.toString())
    );

    const leaves = active.filter((n) => !parentIds.has(n.id.toString()));

    if (leaves.length === 0) {
      // Circular reference or all nodes are orphaned; shouldn't happen in valid CRDT
      return undefined;
    }

    // Among concurrent leaves, return highest id (most recent)
    return leaves.sort((a, b) => b.compare(a))[0];
  }

  /**
   * Pop the top of the stack.
   * Marks the top node (leaf) as deleted.
   * Returns the deleted node or undefined if stack is empty.
   */
  pop(): RGA64Node | undefined {
    const top = this.peek();
    if (!top) return undefined;

    top.delete();
    return top;
  }

  /**
   * Remove a node by value from anywhere in the stack.
   * Searches for a node with matching value and marks it as deleted (tombstone).
   * Returns the deleted node or undefined if not found.
   */
  remove(value: UUID64): RGA64Node | undefined {
    const valueStr = value.toString();
    const node = this.nodes.find((n) => !n.deleted && n.value.toString() === valueStr);
    if (!node) return undefined;

    node.delete();
    return node;
  }

  /**
   * Peek at the top of the stack without removing it.
   * Returns the leaf node (not referenced as parent by any other active node).
   * Returns undefined if stack is empty.
   */
  peek(): RGA64Node | undefined {
    return this._top();
  }

  /**
   * Get all active nodes in the stack, ordered top-to-bottom (leaf first).
   * Traverses from leaf nodes to root via parent links, handling concurrent leaves.
   */
  items(): RGA64Node[] {
    const active = this.nodes.filter((n) => !n.deleted);

    if (!active.length) return [];

    // Find all leaves (nodes not referenced as parent by any active node)
    const parentIds = new Set(
      active
        .filter((n) => n.parent !== null)
        .map((n) => n.parent!.toString())
    );
    const leaves = active.filter((n) => !parentIds.has(n.id.toString()));

    if (leaves.length === 0) return [];

    // Sort leaves by id (most recent first) and traverse each chain
    const sortedLeaves = leaves.sort((a, b) => b.compare(a));
    const result: RGA64Node[] = [];
    const visited = new Set<string>();

    for (const leaf of sortedLeaves) {
      let current: RGA64Node | undefined = leaf;

      while (current && !visited.has(current.id.toString())) {
        visited.add(current.id.toString());
        result.push(current);

        if (current.parent === null) {
          break;
        }

        // Find parent node
        current = active.find(
          (n) => n.id.toString() === current!.parent!.toString()
        );
      }
    }

    return result;
  }

  /**
   * Merge a node from another user's stack.
   * Adds the node if it doesn't exist, updates if it does.
   */
  add(node: RGA64Node): void {
    const nodeIdStr = node.id.toString();
    const existing = this.nodes.find((n) => n.id.toString() === nodeIdStr);
    if (existing) {
      // Update existing node (e.g., deleted flag from tombstone)
      const idx = this.nodes.indexOf(existing);
      this.nodes[idx] = node;
    } else {
      // Add new node
      this.nodes.push(node);
    }
  }

  /**
   * Garbage collect tombstones that are safe to remove.
   * A tombstone is safe to remove if:
   * 1. No active node chains through it as a parent, AND
   * 2. Its timestamp is < minObservedTime (old enough for all users to have seen it)
   *
   * @param minObservedTime Safe GC boundary: tombstones with timestamp >= minObservedTime
   *        are too recent and must be kept; those < minObservedTime are old enough to GC.
   */
  compact(minObservedTime: number): void {
    // Find all parent ids referenced by active nodes
    const activeParentIds = new Set(
      this.nodes
        .filter((n) => !n.deleted && n.parent !== null)
        .map((n) => n.parent!.toString())
    );

    // Remove tombstones that are both structurally unreferenced and old enough
    this.nodes = this.nodes.filter(
      (n) =>
        !n.deleted || // Keep all active nodes
        activeParentIds.has(n.id.toString()) || // Keep tombstones that are load-bearing
        n.id.getTimestamp() >= minObservedTime // Keep tombstones that are too recent
    );
  }

  /**
   * Patch updates name/summary, not the stack itself.
   */
  override patch(cfg: any = {}): void {
    super.patch(cfg);
    if (cfg.nodes) {
      this.nodes = cfg.nodes.map((n: string | RGA64Node) =>
        typeof n === 'string' ? RGA64Node.parse(n) : n
      );
    }
  }

  /**
   * Serialize nodes to array of strings for JSON/Git storage.
   */
  toJSON(): any {
    return {
      id: this.id.toJSON?.() ?? this.id.toString(),
      name: this.name,
      summary: this.summary,
      nodes: this.nodes.map((n) => n.toJSON()),
    };
  }

  /**
   * Deserialize stack from JSON representation.
   */
  static fromJSON(data: any): RGA64Stack {
    const stack = new RGA64Stack({
      id: data.id,
      name: data.name,
      summary: data.summary,
      nodes: data.nodes,
    });
    return stack;
  }

  /**
   * Schema for RGA64Stack.
   */
  static override get avroSchema(): Schema {
    return new Schema({
      name: 'RGA64Stack',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        { name: 'id', type: UUID64.avroSchema.fullName },
        { name: 'name', type: 'string' },
        { name: 'summary', type: 'string' },
        {
          name: 'nodes',
          type: {
            type: 'array',
            items: 'string',
          },
        },
      ],
    });
  }
}

export default RGA64Stack;
