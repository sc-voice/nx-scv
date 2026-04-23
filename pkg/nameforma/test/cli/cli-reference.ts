import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import ReferenceCommand from '../../src/cli/cli-reference.js';
import FocusCommand from '../../src/cli/cli-focus.js';
import { createTempWorld, createTestCmd } from './helpers.js';
import { World } from '../../src/world.js';

const { Task } = NameForma;

describe('CLI: reference command', () => {
  let program;
  let taskCmd;
  let referenceCmd;
  let testCmd;
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

    // Create test command runner
    testCmd = createTestCmd(program, tempWorld.worldPath);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('reference list with no focused task', async () => {
    await testCmd('reference');

    expect(output[0]).toBe('No task is currently focused');
  });

  it('reference add with no focused task', async () => {
    try {
      await testCmd('reference', 'add', 'Test Reference');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/No task is currently focused/);
    }
  });

  it('reference add to focused task', async () => {
    // Create a task
    await testCmd('task', 'add', 'Test Task');

    // Extract task ID from output
    const taskAddOutput = output[0];
    const taskIdMatch = taskAddOutput.match(/✓ Task added: (\S+)/);
    expect(taskIdMatch).toBeTruthy();
    const taskId = taskIdMatch![1];

    // Focus the task
    output = [];
    await testCmd('focus', taskId);

    // Add a reference to the focused task
    output = [];
    await testCmd('reference', 'add', 'Test Reference');

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
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add reference with summary
    output = [];
    await testCmd('reference', 'add', 'Test Reference', '-s', 'This is a summary');

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
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add reference with relevance and source
    output = [];
    await testCmd(
      'reference',
      'add',
      'GitHub Issue',
      '-r',
      '0.8',
      '--source',
      'https://github.com/issue/123',
    );

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
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Try to add reference with invalid relevance
    try {
      output = [];
      await testCmd('reference', 'add', 'Test Reference', '-r', '1.5');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/Relevance must be a number between 0 and 1/);
    }
  });

  it('reference list explicit command', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add references
    output = [];
    await testCmd('reference', 'add', 'Reference 1', '-r', '0.5');

    output = [];
    await testCmd('reference', 'add', 'Reference 2', '-r', '0.8');

    // List references
    output = [];
    await testCmd('reference', 'list');

    // Filter out empty strings from output array
    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[0]).toMatch(/References for/);
    expect(nonEmptyOutput[1]).toMatch(/1\. Reference 2/);
    expect(nonEmptyOutput[2]).toMatch(/0\.8/);
    expect(nonEmptyOutput[3]).toMatch(/2\. Reference 1/);
  });

  it('reference show by index', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add a reference
    output = [];
    await testCmd(
      'reference',
      'add',
      'Test Reference',
      '-s',
      'Test summary',
      '-r',
      '0.7',
    );

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Show reference by ID
    output = [];
    await testCmd('reference', 'show', referenceId);

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[1]).toMatch(/1\. Test Reference/);
    expect(nonEmptyOutput[2]).toMatch(/Test summary/);
    expect(nonEmptyOutput[3]).toMatch(/0\.7/);
  });

  it('reference update by index', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add a reference
    output = [];
    await testCmd(
      'reference',
      'add',
      'Original Name',
      '-s',
      'Original summary',
      '-r',
      '0.5',
    );

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Update reference by ID
    output = [];
    await testCmd(
      'reference',
      'update',
      referenceId,
      '-n',
      'Updated Name',
      '-s',
      'Updated summary',
      '-r',
      '0.9',
    );

    expect(output[0]).toMatch(/✓ Reference updated/);
    expect(output[1]).toMatch(/Updated Name/);

    // Verify the update
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    const ref = task!.references(world).items[0];
    expect(ref.name).toBe('Updated Name');
    expect(ref.summary).toBe('Updated summary');
    expect(ref.relevance).toBe(0.9);
  });

  it('reference update with partial fields', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add a reference
    output = [];
    await testCmd(
      'reference',
      'add',
      'Original Name',
      '-s',
      'Original summary',
      '-r',
      '0.5',
    );

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Update only relevance
    output = [];
    await testCmd('reference', 'update', referenceId, '-r', '0.3');

    expect(output[0]).toMatch(/✓ Reference updated/);

    // Verify the update (only relevance changed)
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    const ref = task!.references(world).items[0];
    expect(ref.name).toBe('Original Name');
    expect(ref.summary).toBe('Original summary');
    expect(ref.relevance).toBe(0.3);
  });

  it('reference delete by index', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    await testCmd('focus', taskId);

    // Add references
    output = [];
    await testCmd('reference', 'add', 'Reference 1');

    let referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const ref1Id = referenceIdMatch![1];

    output = [];
    await testCmd('reference', 'add', 'Reference 2');

    referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const ref2Id = referenceIdMatch![1];

    // Delete first reference
    output = [];
    await testCmd('reference', 'delete', ref1Id);

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[0]).toMatch(/✓ Reference deleted/);
    expect(nonEmptyOutput[1]).toMatch(/Reference 1/);

    // Verify only one reference remains
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    if (task) {
      expect(task.references(world).items).toHaveLength(1);
      expect(task.references(world).items[0].name).toBe('Reference 2');
    }
  });
});
