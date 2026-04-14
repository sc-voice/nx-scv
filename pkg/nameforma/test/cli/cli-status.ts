import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import ActionCommand from '../../src/cli/cli-action.js';
import FocusCommand from '../../src/cli/cli-focus.js';
import StatusCommand from '../../src/cli/cli-status.js';
import { createTempWorld } from './helpers';
import { World } from '../../src/world.js';

const { Task, ActionStatus } = NameForma;

describe('CLI: status command', () => {
  let program;
  let output: string[];
  let originalLog;
  let originalError;
  let tempWorld;

  beforeEach(() => {
    tempWorld = createTempWorld('nameforma-status-test');
    output = [];
    originalLog = console.log;
    originalError = console.error;
    console.log = (...args) => output.push(args.join(' '));
    console.error = (...args) => output.push(args.join(' '));

    program = new Command();
    program.exitOverride();

    const taskCmd = program.command('task');
    TaskCommand.registerCommand(taskCmd);

    const focusCmd = program.command('focus');
    FocusCommand.registerCommand(focusCmd);

    const actionCmd = program.command('action');
    ActionCommand.registerCommand(actionCmd);

    const statusCmd = program.command('status');
    StatusCommand.registerCommand(statusCmd);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  async function setupTaskWithAction() {
    // Create task
    await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'add', '-n', 'Test Task']);
    const taskId = output[0].match(/✓ Task added: (\S+)/)![1];

    // Focus task
    output = [];
    await program.parseAsync(['node', 'test', 'focus', '-w', tempWorld.worldPath, taskId]);

    // Add action
    output = [];
    await program.parseAsync(['node', 'test', 'action', '-w', tempWorld.worldPath, 'add', '-n', 'Test Action']);

    // Get action ID from world
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId)!;
    const action = task.actions(world).items[0];
    return { taskId, actionId: action.id.base64 };
  }

  it('status set valid transition', async () => {
    const { actionId } = await setupTaskWithAction();

    output = [];
    await program.parseAsync([
      'node', 'test', 'status', '-w', tempWorld.worldPath,
      'set', '-a', actionId, 'spec', 'starting spec phase',
    ]);

    expect(output[0]).toMatch(/req->spec starting spec phase/);
  });

  it('status set updates statusNote', async () => {
    const { actionId, taskId } = await setupTaskWithAction();

    output = [];
    await program.parseAsync([
      'node', 'test', 'status', '-w', tempWorld.worldPath,
      'set', '-a', actionId, 'spec', 'my note',
    ]);

    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId)!;
    const action = task.actions(world).items[0];
    expect(action.status).toBe(ActionStatus.spec);
    expect(action.statusNote).toBe('my note');
  });

  it('status set invalid transition throws', async () => {
    const { actionId } = await setupTaskWithAction();

    try {
      await program.parseAsync([
        'node', 'test', 'status', '-w', tempWorld.worldPath,
        'set', '-a', actionId, 'done', 'skip to done',
      ]);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/invalid transition/);
    }
  });

  it('status set no focused task throws', async () => {
    try {
      await program.parseAsync([
        'node', 'test', 'status', '-w', tempWorld.worldPath,
        'set', '-a', 'someId', 'spec', 'note',
      ]);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/No task focused/);
    }
  });
});
