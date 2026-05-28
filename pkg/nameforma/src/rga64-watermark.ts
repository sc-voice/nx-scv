import UUID64 from './uuid64.js';

/**
 * RGA64Watermark tracks per-user git commit observations for safe GC in distributed stacks.
 *
 * In a CRDT system backed by git, tombstones can only be safely removed once all
 * collaborators have observed (pulled) the deletion. The minimum observed timestamp
 * across all users is the safe GC boundary.
 */
export class RGA64Watermark {
  watermarks: Record<string, UUID64> = {};

  /**
   * Record that a user has observed a commit.
   * Returns true if the watermark advanced, false if rejected (not strictly greater).
   */
  update(user: string, uuid: UUID64): boolean {
    const current = this.watermarks[user];
    if (current && !uuid.isGreaterThan(current)) return false;
    this.watermarks[user] = uuid;
    return true;
  }

  /**
   * Get the minimum timestamp across all users.
   * Tombstones older than this are safe to GC.
   */
  minObservedTime(): number {
    const values = Object.values(this.watermarks);
    if (values.length === 0) return 0;
    return Math.min(...values.map((u) => u.getTimestamp()));
  }

  /**
   * Serialize for JSON storage.
   */
  toJSON(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.watermarks).map(([k, v]) => [k, v.toJSON()]),
    );
  }

  /**
   * Deserialize from JSON.
   */
  static fromJSON(data: Record<string, string> = {}): RGA64Watermark {
    const wm = new RGA64Watermark();
    wm.watermarks = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, UUID64.fromString(v)]),
    );
    return wm;
  }
}

export default RGA64Watermark;
