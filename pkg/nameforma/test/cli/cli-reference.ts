import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import ReferenceCommand from '../../src/cli/cli-reference.js';
import FocusCommand from '../../src/cli/cli-focus.js';
import { createTempWorld } from './helpers';
import { World } from '../../src/world.js';

const { Task } = NameForma;

describe('CLI: reference command', () => {
  let program;
  let taskCmd;
  let referenceCmd;
  let output;
  let errors;
  let originalLog;
  let originalError;
  let tempWorld;

  beforeEach(() => {
    // Create isolated temp world
    tempWorld = createTempWorld('nameforma-reference-test');

    // Capture console output
    output = [];
    errors = [];

    originalLog = console.log;
    originalError = console.error;

    console.log = (...args) => {
      output.push(args.join(' '));
    };

    console.error = (...args) => {
      errors.push(args.join(' '));
    };

    // Setup commander program
    program = new Command();
    taskCmd = program.command('task');
    TaskCommand.registerCommand(taskCmd);

    const focusCmd = program.command('focus');
    FocusCommand.registerCommand(focusCmd);

    referenceCmd = program.command('reference');
    ReferenceCommand.registerCommand(referenceCmd);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('reference list with no focused task', async () => {
    await program.parseAsync([
      'node',
      'test',
      'reference',
      '-w',
      tempWorld.worldPath,
    ]);

    expect(output[0]).toBe('No task is currently focused');
  });

  it('reference add with no focused task', async () => {
    try {
      await program.parseAsync([
        'node',
        'test',
        'reference',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Reference',
      ]);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/No task is currently focused/);
    }
  });

  it('reference add to focused task', async () => {
    // Create a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Test Task',
    ]);

    // Extract task ID from output
    const taskAddOutput = output[0];
    const taskIdMatch = taskAddOutput.match(/✓ Task added: (\S+)/);
    expect(taskIdMatch).toBeTruthy();
    const taskId = taskIdMatch![1];

    // Focus the task
    output = [];
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      taskId,
    ]);

    // Add a reference to the focused task
    output = [];
    await program.parseAsync([
      'node',
      'test',
      'reference',
      '-w',
      tempWorld.worldPath,
      'add',
      'Test Reference',
    ]);

    expect(output[0]).toMatch(/✓ Reference added/);
    expect(output[1]).toMatch(/Test Reference/);

    // Verify reference was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.references(world).items).toHaveLength(1);
    expect(task!.references(world).items[0].name).toBe('Test Reference');
  });

  it('reference add with summary', async () => {
    // Create and focus a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Test Task',
    ]);

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      taskId,
    ]);

    // Add reference with summary
    output = [];
    await program.parseAsync([
      'node',
      'test',
      'reference',
      '-w',
      tempWorld.worldPath,
      'add',
      'Test Reference',
      '-s',
      'This is a summary',
    ]);

    expect(output[0]).toMatch(/✓ Reference added/);

    // Verify summary was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.references(world).items).toHaveLength(1);
    expect(task!.references(world).items[0].summary).toBe('This is a summary');
  });

  it('reference add with relevance and source', async () => {
    // Create and focus a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Test Task',
    ]);

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      taskId,
    ]);

    // Add reference with relevance and source
    output = [];
    await program.parseAsync([
      'node',
      'test',
      'reference',
      '-w',
      tempWorld.worldPath,
      'add',
      'GitHub Issue',
      '-r',
      '0.8',
      '--source',
      'https://github.com/issue/123',
    ]);

    expect(output[0]).toMatch(/✓ Reference added/);

    // Verify relevance and source were saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.references(world).items).toHaveLength(1);
    expect(task!.references(world).items[0].relevance).toBe(0.8);
    expect(task!.references(world).items[0].source).toBe(
      'https://github.com/issue/123',
    );
  });

  it('reference add with invalid relevance', async () => {
    // Create and focus a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Test Task',
    ]);

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await program.parseAsync([
      'node',
      'test',
      'focus',
      '-w',
      tempWorld.worldPath,
      taskId,
    ]);

    // Try to add reference with invalid relevance
    try {
      output = [];
      await program.parseAsync([
        'node',
        'test',
        'reference',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Reference',
        '-r',
        '1.5',
      ]);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/Relevance must be a number between 0 and 1/);
    }
  });
});
