import UUID64 from './uuid64.js';
import type { UUID64String } from './uuid64.js';

/**
 * RGA64Node - A node in a Replicable Growable Array using UUID64 identifiers.
 *
 * String format: ID_UUID64.VALUE_UUID64.PARENT_UUID64.DELETED_FLAG
 * - id: unique node identifier (UUID64)
 * - value: payload reference (UUID64)
 * - parent: parent node id (UUID64) or "^" for top-of-stack
 * - deleted: "@" for active, "-" for deleted (tombstone)
 */
export class RGA64Node {
  readonly id: UUID64;
  readonly value: UUID64;
  readonly parent: UUID64 | null;
  readonly deleted: boolean;

  constructor(
    id: UUID64,
    value: UUID64,
    parent: UUID64 | null = null,
    deleted: boolean = false
  ) {
    this.id = id;
    this.value = value;
    this.parent = parent;
    this.deleted = deleted;
  }

  /**
   * Parse an RGA64Node from its string representation.
   * Format: ID_UUID64.VALUE_UUID64.PARENT_UUID64.DELETED_FLAG
   * where PARENT_UUID64 is "^" for nil, and DELETED_FLAG is "@" or "-"
   */
  static parse(str: string): RGA64Node {
    const parts = str.split('.');
    if (parts.length !== 4) {
      throw new Error(
        `Invalid RGA64Node format: expected 4 parts separated by '.', got ${parts.length}`
      );
    }

    const [idStr, valueStr, parentStr, deletedStr] = parts;

    try {
      const id = UUID64.fromString(idStr);
      const value = UUID64.fromString(valueStr);
      const parent = parentStr === '^' ? null : UUID64.fromString(parentStr);
      const deleted = deletedStr === '-';

      return new RGA64Node(id, value, parent, deleted);
    } catch (e) {
      throw new Error(
        `Failed to parse RGA64Node: ${String(e)}. Input: "${str}"`
      );
    }
  }

  /**
   * Stringify this node to its string representation.
   * Format: ID_UUID64.VALUE_UUID64.PARENT_UUID64.DELETED_FLAG
   */
  toString(): string {
    const idStr = this.id.toString();
    const valueStr = this.value.toString();
    const parentStr = this.parent === null ? '^' : this.parent.toString();
    const deletedStr = this.deleted ? '-' : '@';

    return `${idStr}.${valueStr}.${parentStr}.${deletedStr}`;
  }

  /**
   * JSON serialization returns the string representation.
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * Create a copy of this node with optional field overrides.
   */
  copy(overrides?: {
    id?: UUID64;
    value?: UUID64;
    parent?: UUID64 | null;
    deleted?: boolean;
  }): RGA64Node {
    return new RGA64Node(
      overrides?.id ?? this.id,
      overrides?.value ?? this.value,
      overrides?.parent !== undefined ? overrides.parent : this.parent,
      overrides?.deleted ?? this.deleted
    );
  }

  /**
   * Compare this node with another for RGA ordering.
   * Null parent (top-of-stack) sorts first, then by ID.
   * Returns negative if this < other, positive if this > other, 0 if equal.
   */
  compare(other: RGA64Node): number {
    // Null parent (root/bottom) comes last
    if (this.parent === null && other.parent !== null) return 1;
    if (this.parent !== null && other.parent === null) return -1;
    // Then sort by ID
    return this.id.compare(other.id);
  }
}

export default RGA64Node;
