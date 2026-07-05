import { describe, it, expect } from '@sc-voice/vitest';
import { User } from '../src/user.js';
import UUID64 from '../src/uuid64.js';
import RGA64Node from '../src/rga64-node.js';

describe('RGA64Node', () => {
  it('creates a node with id, value, and defaults', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();
    const dbg = 0;

    const node = new RGA64Node(id, value);

    expect(node.id).toBe(id);
    expect(node.value).toBe(value);
    expect(node.parent).toBeNull();
    expect(node.deleted).toBe(false);
    dbg &&
      console.log({
        id: id.base64,
        value: value.base64,
        node: JSON.stringify(node),
      });
  });

  it('creates a node with parent and deleted flag', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();
    const parent = new User(undefined, 'Freddie Mercury').generateUUID64();
    const node = new RGA64Node(id, value, parent, true);
    const dbg = 0;

    expect(node.id).toBe(id);
    expect(node.value).toBe(value);
    expect(node.parent).toBe(parent);
    expect(node.deleted).toBe(true);
    dbg &&
      console.log({
        id: id.base64,
        value: value.base64,
        parent: parent.base64,
        node: JSON.stringify(node),
      });
  });

  it('stringifies a node with null parent (top-of-stack)', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();

    const node = new RGA64Node(id, value, null, false);
    const str = node.toString();

    const parts = str.split('.');
    expect(parts).toHaveLength(4);
    expect(parts[2]).toBe('^');
    expect(parts[3]).toBe('@');
  });

  it('stringifies a node with parent and deleted flag', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();
    const parent = new User(undefined, 'Freddie Mercury').generateUUID64();

    const node = new RGA64Node(id, value, parent, true);
    const str = node.toString();

    const parts = str.split('.');
    expect(parts).toHaveLength(4);
    expect(parts[3]).toBe('-');
  });

  it('parses a stringified node (round-trip)', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();
    const parent = new User(undefined, 'Freddie Mercury').generateUUID64();

    const original = new RGA64Node(id, value, parent, false);
    const str = original.toString();
    const parsed = RGA64Node.parse(str);

    expect(parsed.id.toString()).toBe(original.id.toString());
    expect(parsed.value.toString()).toBe(original.value.toString());
    expect(parsed.parent?.toString()).toBe(original.parent?.toString());
    expect(parsed.deleted).toBe(original.deleted);
  });

  it('parses a node with nil parent (^)', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();

    const node = new RGA64Node(id, value, null, false);
    const str = node.toString();

    expect(str).toContain('^');

    const parsed = RGA64Node.parse(str);
    expect(parsed.parent).toBeNull();
  });

  it('parses active node (@) vs deleted node (-)', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();

    const active = new RGA64Node(id, value, null, false);
    expect(active.toString()).toContain('@');

    const deleted = new RGA64Node(id, value, null, true);
    expect(deleted.toString()).toContain('-');

    expect(RGA64Node.parse(active.toString()).deleted).toBe(false);
    expect(RGA64Node.parse(deleted.toString()).deleted).toBe(true);
  });

  it('copies a node with overrides', () => {
    const id = new User(undefined, 'Alice In Wonderland').generateUUID64();
    const value = new UUID64();
    const parent = new User(undefined, 'Freddie Mercury').generateUUID64();

    const original = new RGA64Node(id, value, parent, false);

    const newValue = new UUID64();
    const copy = original.copy({ value: newValue, deleted: true });

    expect(copy.id).toBe(original.id);
    expect(copy.value).toBe(newValue);
    expect(copy.parent).toBe(original.parent);
    expect(copy.deleted).toBe(true);
  });

  it('throws on invalid format', () => {
    expect(() => RGA64Node.parse('invalid')).toThrow();
    expect(() => RGA64Node.parse('a.b.c')).toThrow();
  });

  it('compare: null parent comes last', () => {
    const rootNode = new RGA64Node(
      new UUID64(),
      new UUID64(),
      null,
      false,
    );
    const childNode = new RGA64Node(
      new UUID64(),
      new UUID64(),
      new UUID64(),
      false,
    );

    expect(rootNode.compare(childNode)).toBeGreaterThan(0);
    expect(childNode.compare(rootNode)).toBeLessThan(0);
  });

  it('compare: sorts by ID when both have null parent', () => {
    const id1 = new UUID64();
    const id2 = new UUID64();
    const node1 = new RGA64Node(id1, new UUID64(), null, false);
    const node2 = new RGA64Node(id2, new UUID64(), null, false);

    const cmp = node1.compare(node2);
    expect(cmp).toBe(id1.compare(id2));
  });

  it('compare: sorts by ID when both have same parent', () => {
    const parent = new UUID64();
    const id1 = new UUID64();
    const id2 = new UUID64();
    const node1 = new RGA64Node(id1, new UUID64(), parent, false);
    const node2 = new RGA64Node(id2, new UUID64(), parent, false);

    const cmp = node1.compare(node2);
    expect(cmp).toBe(id1.compare(id2));
  });

  it('compare: equal nodes return 0', () => {
    const id = new UUID64();
    const value = new UUID64();
    const parent = new UUID64();
    const node1 = new RGA64Node(id, value, parent, false);
    const node2 = new RGA64Node(id, value, parent, false);

    expect(node1.compare(node2)).toBe(0);
  });
});
