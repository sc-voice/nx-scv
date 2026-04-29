import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import { execSync } from 'child_process';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import ActionCommand from '../../src/cli/cli-action.js';
import { createTempWorld, createTestCmd } from './helpers.js';
import { World } from '../../src/world.js';

const { Task } = NameForma;

describe('CLI: action command', () => {
  let program;
  let taskCmd;
  let actionCmd;
  let testCmd;
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

    // Create test command runner and get getGlobalOpts
    const { testCmd: tc, getGlobalOpts } = createTestCmd(program, tempWorld.worldPath);
    testCmd = tc;

    // Register commands with getGlobalOpts
    taskCmd = program.command('task');
    TaskCommand.registerCommand(taskCmd, getGlobalOpts);

    actionCmd = program.command('action');
    ActionCommand.registerCommand(actionCmd, getGlobalOpts);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('action list with no focused task', async () => {
    await testCmd('action');

    expect(output[0]).toBe('No task is currently focused');
  });

  it('action add with no focused task', async () => {
    try {
      await testCmd('action', 'add', 'Test Action');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/No task is currently focused/);
    }
  });

  it('action add to focused task', async () => {
    // Create a task
    await testCmd('task', 'add', 'Test Task');

    // Extract task ID from output
    const taskAddOutput = output[0];
    const taskIdMatch = taskAddOutput.match(/✓ Task added: (\S+)/);
    expect(taskIdMatch).toBeTruthy();
    const taskId = taskIdMatch![1];

    // Focus the task
    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add an action to the focused task
    output = [];
    await testCmd('action', 'add', 'Test Action');

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
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add action with summary
    output = [];
    await testCmd('action', 'add', 'Test Action', '-s', 'This is a summary');

    expect(output[0]).toMatch(/✓ Action added/);

    // Verify summary was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.actions(world).items).toHaveLength(1);
    expect(task!.actions(world).items[0].summary).toBe('This is a summary');
  });

  it('action list explicit command', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add actions
    output = [];
    await testCmd('action', 'add', 'Action 1');

    output = [];
    await testCmd('action', 'add', 'Action 2');

    // List actions
    output = [];
    await testCmd('action', 'list');

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[0]).toMatch(/Actions for/);
    expect(nonEmptyOutput[1]).toMatch(/○ 1\. Action 1/);
    expect(nonEmptyOutput[2]).toMatch(/○ 2\. Action 2/);
  });

  it('action show by index', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add an action
    output = [];
    await testCmd('action', 'add', 'Test Action', '-s', 'Test summary');

    const actionIdMatch = output[0].match(/✓ Action added: (\S+)/);
    const actionId = actionIdMatch![1];

    // Show action by ID
    output = [];
    await testCmd('action', 'show', actionId);

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[1]).toMatch(/○ 1\. Test Action/);
    expect(nonEmptyOutput[2]).toMatch(/Test summary/);
  });

  it('action set name and summary', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add an action
    output = [];
    await testCmd(
      'action',
      'add',
      'Original Name',
      '-s',
      'Original summary',
    );

    const actionIdMatch = output[0].match(/✓ Action added: (\S+)/);
    const actionId = actionIdMatch![1];

    // Set name using dotref
    output = [];
    await testCmd('action', 'set', `${actionId}.name`, 'Updated Name');

    expect(output[0]).toMatch(/✓ name updated/);

    // Set summary using dotref
    output = [];
    await testCmd('action', 'set', `${actionId}.summary`, 'Updated summary');

    expect(output[0]).toMatch(/✓ summary updated/);

    // Verify the updates
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    const action = task!.actions(world).items[0];
    expect(action.name).toBe('Updated Name');
    expect(action.summary).toBe('Updated summary');
  });

  it('action set preserves other fields', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add an action
    output = [];
    await testCmd(
      'action',
      'add',
      'Original Name',
      '-s',
      'Original summary',
    );

    const actionIdMatch = output[0].match(/✓ Action added: (\S+)/);
    const actionId = actionIdMatch![1];

    // Set only name, summary should remain unchanged
    output = [];
    await testCmd('action', 'set', `${actionId}.name`, 'New Name');

    expect(output[0]).toMatch(/✓ name updated/);

    // Verify the update (only name changed)
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    const action = task!.actions(world).items[0];
    expect(action.name).toBe('New Name');
    expect(action.summary).toBe('Original summary');
  });

  it('action delete by index', async () => {
    const world = World.fromPath(tempWorld.worldPath);

    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add actions
    output = [];
    await testCmd('action', 'add', 'Action 1');
    let actionIdMatch = output[0].match(/✓ Action added: (\S+)/);
    const action1Id = actionIdMatch![1];

    output = [];
    await testCmd('action', 'add', 'Action 2');
    actionIdMatch = output[0].match(/✓ Action added: (\S+)/);
    const action2Id = actionIdMatch![1];

    // Delete first action
    output = [];
    await testCmd('action', 'delete', action1Id);

    let task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.rawActions.length).toBe(1);
    expect(task.rawActions[0].name).toBe('Action 2');

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[0]).toMatch(/✓ Action deleted/);
    expect(nonEmptyOutput[1]).toMatch(/Action 1/);

    // Verify only one action remains
    if (task) {
      expect(task.actions(world).items).toHaveLength(1);
      expect(task.actions(world).items[0].name).toBe('Action 2');
    }
  });

  describe('action get and set (dotref interface)', () => {
    async function setupTaskWithAction() {
      // Create task
      await testCmd('task', 'add', 'Test Task');
      const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
      const taskId = taskIdMatch![1];

      // Focus task
      output = [];
      { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

      // Add action
      output = [];
      await testCmd('action', 'add', 'Test Action');

      // Get action ID from world
      const w = World.fromPath(tempWorld.worldPath);
      const task = w.loadFuzzy(Task, taskId)!;
      const action = task.actions(w).items[0];
      return { taskId, actionId: action.id.base64 };
    }

    it('action get status returns current value', async () => {
      const { actionId } = await setupTaskWithAction();

      output = [];
      await testCmd('action', 'get', `${actionId}.status`);

      expect(output[0]).toMatch(/req/);
    });

    it('action get statusNote returns note', async () => {
      const { actionId } = await setupTaskWithAction();

      output = [];
      await testCmd('action', 'get', `${actionId}.statusNote`);

      expect(output[0]).toBe('');
    });

    it('action get unknown field throws', async () => {
      const { actionId } = await setupTaskWithAction();

      try {
        await testCmd('action', 'get', `${actionId}.unknownField`);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toMatch(/Field not found/);
      }
    });

    it('action set valid transition', async () => {
      const { actionId } = await setupTaskWithAction();

      output = [];
      await testCmd('action', 'set', `${actionId}.status`, 'spec', 'starting spec phase');

      expect(output[0]).toMatch(/req->spec starting spec phase/);
    });

    it('action set updates statusNote', async () => {
      const { actionId, taskId } = await setupTaskWithAction();

      output = [];
      await testCmd('action', 'set', `${actionId}.status`, 'spec', 'my note');

      const w = World.fromPath(tempWorld.worldPath);
      const task = w.loadFuzzy(Task, taskId)!;
      const action = task.actions(w).items[0];
      expect(action.status).toBe('spec');
      expect(action.statusNote).toBe('my note');
    });

    it('action set invalid transition throws', async () => {
      const { actionId } = await setupTaskWithAction();

      // First move to spec
      await testCmd('action', 'set', `${actionId}.status`, 'spec', 'move to spec');

      output = [];
      try {
        // spec → req is not a valid transition
        await testCmd('action', 'set', `${actionId}.status`, 'req', 'invalid backwards transition');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toMatch(/invalid transition/);
      }
    });

    it('action set no focused task throws', async () => {
      try {
        await testCmd('action', 'set', 'someId.status', 'spec', 'note');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toMatch(/No task focused/);
      }
    });
  });

  it('action --help shows description and examples', () => {
    const output = execSync('npm run cli -- action --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Manage actions that can be added, listed, updated, and deleted for tasks/);
    expect(output).toMatch(/nf action list/);
    expect(output).toMatch(/nf action add/);
    expect(output).toMatch(/nf action delete/);
    expect(output).toMatch(/nf action set/);
  });

  it('action add --help shows description and examples', () => {
    const output = execSync('npm run cli -- action add --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Add an action to the focused task/);
    expect(output).toMatch(/Implement feature/);
    expect(output).toMatch(/Write tests/);
  });
});
