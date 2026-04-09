import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { NameForma } from '../../src/index.js';
import { World } from '../../src/world.js';
import TaskCommand from '../../src/cli/cli-task.js';
import FocusCommand from '../../src/cli/cli-focus.js';
import { createTempWorld } from './helpers';

const { Task } = NameForma;

describe('CLI: focus command', () => {
  let program: Command;
  let focusCmd: Command;
  let output: string[];
  let errors: string[];
  let originalLog: any;
  let originalError: any;
  let tempWorld: any;

  beforeEach(() => {
    // Create isolated temp world
    tempWorld = createTempWorld();

    // Capture console output
    output = [];
    errors = [];

    originalLog = console.log;
    originalError = console.error;

    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    console.error = (...args: any[]) => {
      errors.push(args.join(' '));
    };

    // Setup commander program
    program = new Command();
    focusCmd = program.command('focus');
    FocusCommand.registerCommand(focusCmd);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('should focus an entity by ID', async () => {
    // Create a task first
    const world = World.fromPath(tempWorld.worldPath);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'Test Task' });

    // Reset output for focus command
    output = [];

    // Focus the task
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      task.id.base64,
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Focused:/);
    expect(output[0]).toContain(task.id.base64);
  });

  it('should show task name in focus output', async () => {
    // Create a task first
    const world = World.fromPath(tempWorld.worldPath);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'My Task' });

    // Reset output for focus command
    output = [];

    // Focus the task
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      task.id.base64,
    ]);

    expect(output.some((line) => line.includes('My Task'))).toBe(true);
  });

  it('should persist focus in world.json', async () => {
    // Create a task first
    const world = World.fromPath(tempWorld.worldPath);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'Test Task' });

    // Focus the task via CLI
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      task.id.base64,
    ]);

    // Load world and verify focusStack is persisted
    const world2 = World.fromPath(tempWorld.worldPath);
    world2.registerEntity(Task);

    expect(world2.focusStack.size).toBe(1);
    const focusItems = Array.from(world2.focusStack);
    expect(focusItems[0].formaId.base64).toBe(task.id.base64);
    expect(focusItems[0].formaType).toBe('task');
  });

  it('should support fuzzy matching on ID', async () => {
    // Create a task first
    const world = World.fromPath(tempWorld.worldPath);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'Test Task' });

    // Reset output for focus command
    output = [];

    // Focus the task using partial ID
    const partialId = task.id.base64.substring(0, 8);
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      partialId,
    ]);

    expect(output[0]).toMatch(/✓ Focused:/);
  });

  it('should show focus order as 0 (most recent)', async () => {
    // Create a task first
    const world = World.fromPath(tempWorld.worldPath);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'Test Task' });

    // Reset output for focus command
    output = [];

    // Focus the task
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      task.id.base64,
    ]);

    expect(output.some((line) => line.includes('order: 0'))).toBe(true);
  });

  it('should list focus stack when no ID specified', async () => {
    // Create and focus tasks
    const world = World.fromPath(tempWorld.worldPath);
    world.registerEntity(Task);
    const taskList = world.entityList(Task);
    const task1 = taskList.addItem({ name: 'Task 1' });
    const task2 = taskList.addItem({ name: 'Task 2' });

    world.focusForma(task1);
    world.focusForma(task2);
    world.save();

    // Reset output for list command
    output = [];

    // List focus stack (no ID argument)
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/Focus Stack \(\d+\):/);
    const outputText = output.join('\n');
    // Check for task names (shown via FormaList formatting)
    expect(outputText).toContain('Task 2');
    expect(outputText).toContain('Task 1');
  });

  it('should show empty focus stack message', async () => {
    // Create world without focusing anything
    const world = World.fromPath(tempWorld.worldPath);
    world.registerEntity(Task);
    world.save();

    // Reset output for list command
    output = [];

    // List focus stack
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
    ]);

    expect(output[0]).toBe('Focus stack is empty');
  });

  it('should highlight current focus in bright green', async () => {
    // Create and focus tasks
    const world = World.fromPath(tempWorld.worldPath);
    world.registerEntity(Task);
    const taskList = world.entityList(Task);
    const task1 = taskList.addItem({ name: 'Task 1' });
    const task2 = taskList.addItem({ name: 'Task 2' });

    world.focusForma(task1);
    world.focusForma(task2);
    world.save();

    // Reset output for list command
    output = [];

    // List focus stack
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
    ]);

    // Current focus (index 0) should have bright green ANSI code (\x1b[92m)
    const outputText = output.join('\n');
    expect(outputText).toContain('\x1b[92m');  // Bright green ANSI code
    expect(outputText).toContain('\x1b[0m');   // Reset ANSI code

    // Verify the current focus line (first item after header) contains bright green code
    const currentFocusLine = output.find((line, i) => i > 0 && line.includes('\x1b[92m'));
    expect(currentFocusLine).toBeDefined();
    expect(currentFocusLine).toContain('Task 2');  // task2 is most recent
  });

  it('should unfocus an entity with -u flag', async () => {
    // Create and focus a task
    const world = World.fromPath(tempWorld.worldPath);
    world.registerEntity(Task);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'Test Task' });

    world.focusForma(task);
    world.save();

    // Reset output for unfocus command
    output = [];

    // Unfocus the task
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      '-u',
      task.id.base64,
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Unfocused:/);
    expect(output[0]).toContain(task.id.base64);
  });

  it('should persist unfocus in world.json', async () => {
    // Create and focus a task
    const world = World.fromPath(tempWorld.worldPath);
    world.registerEntity(Task);
    const taskList = world.entityList(Task);
    const task = taskList.addItem({ name: 'Test Task' });

    world.focusForma(task);
    world.save();

    // Unfocus the task via CLI
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      '-u',
      task.id.base64,
    ]);

    // Load world and verify focusStack is empty
    const world2 = World.fromPath(tempWorld.worldPath);
    world2.registerEntity(Task);

    expect(world2.focusStack.size).toBe(0);
  });

  it('should remove only specified entity with -u flag', async () => {
    // Create and focus multiple tasks
    const world = World.fromPath(tempWorld.worldPath);
    world.registerEntity(Task);
    const taskList = world.entityList(Task);
    const task1 = taskList.addItem({ name: 'Task 1' });
    const task2 = taskList.addItem({ name: 'Task 2' });

    world.focusForma(task1);
    world.focusForma(task2);
    world.save();

    // Reset output for unfocus command
    output = [];

    // Unfocus only task1
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      '-u',
      task1.id.base64,
    ]);

    // Load world and verify only task2 is focused
    const world2 = World.fromPath(tempWorld.worldPath);
    world2.registerEntity(Task);

    expect(world2.focusStack.size).toBe(1);
    const focusItems = Array.from(world2.focusStack);
    expect(focusItems[0].formaId.base64).toBe(task2.id.base64);
  });
});
