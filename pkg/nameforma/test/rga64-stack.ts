import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import UUID64 from '../src/uuid64.js';
import { User } from '../src/user.js';
import RGA64Stack from '../src/rga64-stack.js';
import RGA64Node from '../src/rga64-node.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('RGA64Stack', () => {
  const alice = new User(undefined, 'Alice');
  const bob = new User(undefined, 'Bob');
  it('creates a stack with id, name, summary', () => {
    const stack = new RGA64Stack({
      id: new UUID64(),
      name: 'My Stack',
      summary: 'Test stack',
    });

    expect(stack.name).toBe('My Stack');
    expect(stack.summary).toBe('Test stack');
    expect(stack.nodes()).toHaveLength(0);
  });

  it('push adds a node to the stack with parent chain', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();

    const node1 = stack.push(value1, alice);
    expect(stack.size).toBe(1);
    const node2 = stack.push(value2, alice);
    expect(stack.size).toBe(2);

    expect(stack.nodes()).toHaveLength(2);
    expect(node1.value).toBe(value1);
    expect(node2.value).toBe(value2);
    // First node has null parent (root)
    expect(node1.parent).toBeNull();
    // Second node points to first (null = bottom, nodes point up)
    expect(node2.parent).toEqual(node1.id);
    expect(node1.deleted).toBe(false);
    expect(node2.deleted).toBe(false);
  });

  it('peek returns the leaf node', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();

    stack.push(value1);
    stack.push(value2);

    const top = stack.peek();
    expect(top).toBeDefined();
    expect(top?.value).toBe(value2);
  });

  it('peek returns undefined on empty stack', () => {
    const stack = new RGA64Stack();
    expect(stack.peek()).toBeUndefined();
  });

  it('pop marks the top node as deleted', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();

    stack.push(value1);
    expect(stack.size).toBe(1);
    const popped = stack.pop();

    expect(popped).toBeDefined();
    expect(popped?.deleted).toBe(true);
    expect(stack.size).toBe(0);
    expect(stack.peek()).toBeUndefined();
  });

  it('nodes returns all active nodes ordered leaf-to-root', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();
    const value3 = new UUID64();

    stack.push(value1);
    stack.push(value2);
    stack.push(value3);

    const nodes = stack.nodes();
    expect(nodes).toHaveLength(3);
    // Traversal from leaf to root: value3 -> value2 -> value1
    expect(nodes[0].value).toBe(value3);
    expect(nodes[1].value).toBe(value2);
    expect(nodes[2].value).toBe(value1);
  });

  it('remove tombstones a node by value', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();
    const value3 = new UUID64();

    stack.push(value1);
    stack.push(value2);
    stack.push(value3);
    expect(stack.size).toBe(3);

    const removed = stack.remove(value2);
    expect(removed).toBeDefined();
    expect(removed!.value).toBe(value2);
    expect(removed!.deleted).toBe(true);
    expect(stack.size).toBe(2);

    const nodes = stack.nodes();
    expect(nodes).toHaveLength(2);
    expect(nodes[0].value).toBe(value3);
    expect(nodes[1].value).toBe(value1);

    const values = stack.values();
    expect(values).toHaveLength(2);
    expect(values[0]).toBe(value3);
    expect(values[1]).toBe(value1);
  });

  it('remove top node tombstones leaf, leaving bottom node active', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();

    stack.push(value1);
    stack.push(value2);

    let nodesBefore = stack.nodes(false);
    expect(nodesBefore[0].value.base64).toEqual(value1.base64);
    expect(nodesBefore[0].deleted).toEqual(false);
    expect(nodesBefore[1].value.base64).toEqual(value2.base64);
    expect(nodesBefore[1].deleted).toEqual(false);
    expect(nodesBefore.length).toBe(2);

    stack.remove(value2);

    let nodesAfter = stack.nodes(false);
    expect(nodesAfter[0].value.base64).toEqual(value1.base64);
    expect(nodesAfter[0].deleted).toEqual(false);
    expect(nodesAfter[1].value.base64).toEqual(value2.base64);
    expect(nodesAfter[1].deleted).toEqual(true);
    expect(nodesAfter.length).toBe(2);
    expect(stack.nodes().length).toBe(1);
    expect(stack.nodes()[0].value.base64).toBe(value1.base64);
  });

  it('values() returns values from nodes in order', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();
    const value3 = new UUID64();

    stack.push(value1);
    stack.push(value2);
    stack.push(value3);
    const oldValues = stack.values().map((v) => v.base64);
    const oldNodes = stack.nodes(false);
    expect(oldValues).toEqual([
      value3.base64, // Top of stack
      value2.base64,
      value1.base64,
    ]);
    //console.log("oldNodes", oldNodes.map(n=>n.toJSON()));

    stack.push(value2); // Push value2 again
    const newValues = stack.values().map((v) => v.timeId());
    const newNodes = stack.nodes(false);
    //console.log("newNodes", newNodes.map(n=>n.toJSON()));
    expect(newNodes.map((n) => n.id.timeId())).toEqual(
      oldNodes.map((n) => n.id.timeId()),
    );
    expect(newValues).toEqual([
      value2.timeId(), // New top of stack
      value3.timeId(),
      value1.timeId(),
    ]);
  });

  it('add merges a node from another user', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();

    const node1 = new RGA64Node(new UUID64(), value1, null, false);
    const node2 = new RGA64Node(new UUID64(), value2, null, false);

    stack.add(node1);
    stack.add(node2);

    expect(stack.nodes(false)).toHaveLength(2);
    expect(stack.nodes(false)).toHaveLength(2);
  });

  it('add updates existing node (tombstone)', () => {
    const stack = new RGA64Stack();
    const id = new UUID64();
    const value = new UUID64();

    const node = new RGA64Node(id, value, null, false);
    stack.add(node);

    const tombstone = node.copy({ deleted: true });
    stack.add(tombstone);

    expect(stack.nodes(false)).toHaveLength(1);
    expect(stack.nodes(false)[0].deleted).toBe(true);
  });

  it('handles concurrent pushes by multiple users', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();
    const value3 = new UUID64();

    // User1 pushes
    const node1 = stack.push(value1);
    expect(stack.size).toBe(1);
    // User2 pushes concurrently (simulated as separate node)
    const node2 = new RGA64Node(new UUID64(), value2, node1.id, false);
    stack.add(node2);
    expect(stack.size).toBe(2);
    // User1 pushes again
    const node3 = stack.push(value3);
    expect(stack.size).toBe(3);

    // peek() should return the one with highest id (most recent leaf)
    const top = stack.peek();
    expect(top).toBeDefined();

    // items() should show all active nodes in chain
    expect(stack.nodes()).toHaveLength(3);
  });

  it('serializes nodes to JSON as strings', () => {
    const stack = new RGA64Stack({
      id: new UUID64(),
      name: 'Test Stack',
      summary: 'Serialization test',
    });

    const value1 = new UUID64();
    const value2 = new UUID64();
    stack.push(value1);
    stack.push(value2);

    const json = stack.toJSON();
    expect(json.name).toBe('Test Stack');
    expect(json.summary).toBe('Serialization test');
    expect(Array.isArray(json.nodes)).toBe(true);
    expect(json.nodes).toHaveLength(2);
    expect(typeof json.nodes[0]).toBe('string');
  });

  it('deserializes stack from JSON', () => {
    const stack1 = new RGA64Stack({
      id: new UUID64(),
      name: 'Original Stack',
      summary: 'Test',
    });

    const value = new UUID64();
    stack1.push(value);
    expect(stack1.size).toBe(1);

    const json = stack1.toJSON();
    const stack2 = RGA64Stack.fromJSON(json);

    expect(stack2.name).toBe('Original Stack');
    expect(stack2.summary).toBe('Test');
    expect(stack2.nodes(false)).toHaveLength(1);
    expect(stack2.nodes(false)[0].value.toString()).toBe(value.toString());
    expect(stack2.size).toBe(1);
  });

  it('round-trips nodes through JSON', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const node1 = stack.push(value1);

    const json = stack.toJSON();
    const nodeStr = json.nodes[0];
    const parsed = RGA64Node.parse(nodeStr);

    expect(parsed.id.toString()).toBe(node1.id.toString());
    expect(parsed.value.toString()).toBe(value1.toString());
    expect(parsed.parent).toBeNull();
    expect(parsed.deleted).toBe(false);
  });

  it('should keep tombstones that are TOO RECENT (unconfirmed)', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();

    stack.push(value1);
    const node2 = stack.push(value2);
    stack.pop(); // node2 is now a tombstone

    const tombstoneTime = node2.id.getTimestamp();
    // Set threshold to be BEFORE the tombstone was created (so it's "recent" relative to threshold)
    const oldThreshold = tombstoneTime - 10000;

    stack.compact(oldThreshold);

    // It should still be there because timestamp >= minObservedTime
    expect(stack.nodes(false)).toHaveLength(2);
  });

  it('should remove tombstones that are OLD ENOUGH', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();

    stack.push(value1);
    const node2 = stack.push(value2);
    stack.pop(); // node2 is now a tombstone

    const tombstoneTime = node2.id.getTimestamp();
    // Set threshold to be AFTER the tombstone was created (so it's "old" relative to threshold)
    const futureThreshold = tombstoneTime + 10000;

    stack.compact(futureThreshold);

    // It should be removed because timestamp < minObservedTime
    expect(stack.nodes()).toHaveLength(1);
    expect(stack.nodes(false)[0].deleted).toBe(false);
  });

  it('compact keeps tombstones that are load-bearing', () => {
    const stack = new RGA64Stack();
    const value1 = new UUID64();
    const value2 = new UUID64();
    const value3 = new UUID64();

    const node1 = stack.push(value1);
    const node2 = stack.push(value2);
    stack.pop(); // Tombstone node2
    expect(stack.nodes(false)).toHaveLength(2);

    // Manually add node3 with parent pointing to node2 (the tombstone)
    const node3 = new RGA64Node(new UUID64(), value3, node2.id, false);
    stack.add(node3);
    expect(stack.nodes(false)).toHaveLength(3);

    // Even with old minTime, tombstone node2 is kept (node3 depends on it)
    const pastTime = Date.now() - 1000000;
    stack.compact(pastTime);
    expect(stack.nodes(false)).toHaveLength(3);
    expect(
      stack
        .nodes(false)
        .find((n) => n.id.toString() === node2.id.toString())?.deleted,
    ).toBe(true);
  });

  it('compact on empty stack does not error', () => {
    const stack = new RGA64Stack();
    expect(() => {
      stack.compact(Date.now());
    }).not.toThrow();
    expect(stack.nodes()).toHaveLength(0);
  });

  it('peek() agrees with values()[0] (reproduces real-world focus-stack divergence)', () => {
    const worldJsonPath = path.join(
      __dirname,
      'data/single-focus/.nameforma/world.json',
    );
    const worldJson = JSON.parse(fs.readFileSync(worldJsonPath, 'utf-8'));
    const stack = RGA64Stack.fromJSON(
      worldJson.focusManager.rgaFocusStack,
    );

    const peeked = stack.peek();
    const topValue = stack.values()[0];

    expect(peeked?.value.base64).toBe(topValue?.base64);
  });
});
