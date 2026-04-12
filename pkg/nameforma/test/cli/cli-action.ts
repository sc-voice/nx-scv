import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import ActionCommand from '../../src/cli/cli-action.js';
import FocusCommand from '../../src/cli/cli-focus.js';
import { createTempWorld } from './helpers';
import { World } from '../../src/world.js';

const { Task } = NameForma;

describe('CLI: action command', () => {
  let program;
  let taskCmd;
  let actionCmd;
  let output;
  let errors;
  let originalLog;
  let originalError;
  let tempWorld;

  beforeEach(() => {
    // Create isolated temp world
    tempWorld = createTempWorld('nameforma-action-test');

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

    actionCmd = program.command('action');
    ActionCommand.registerCommand(actionCmd);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('action list with no focused task', async () => {
    await program.parseAsync([
      'node',
      'test',
      'action',
      '-w',
      tempWorld.worldPath,
    ]);

    expect(output[0]).toBe('No task is currently focused');
  });

  it('action add with no focused task', async () => {
    try {
      await program.parseAsync([
        'node',
        'test',
        'action',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Test Action',
      ]);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/No task is currently focused/);
    }
  });

  it('action add to focused task', async () => {
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

    // Add an action to the focused task
    output = [];
    await program.parseAsync([
      'node',
      'test',
      'action',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Test Action',
    ]);

    expect(output[0]).toMatch(/✓ Action added/);
    expect(output[1]).toMatch(/Test Action/);

    // Verify action was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.actions(world).items).toHaveLength(1);
    expect(task!.actions(world).items[0].name).toBe('Test Action');
  });

  it('action add with summary', async () => {
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

    // Add action with summary
    output = [];
    await program.parseAsync([
      'node',
      'test',
      'action',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Test Action',
      '-s',
      'This is a summary',
    ]);

    expect(output[0]).toMatch(/✓ Action added/);

    // Verify summary was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.actions(world).items).toHaveLength(1);
    expect(task!.actions(world).items[0].summary).toBe('This is a summary');
  });
});
