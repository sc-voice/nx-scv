import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@sc-voice/vitest';
import { execSync } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  FileRepository,
  Task,
  Action,
  Reference,
  Rational,
  World,
} from '@sc-voice/nameforma';
import {
  TaskCommand,
  NfCLI,
  nfTui,
  CliRenderer,
} from '@sc-voice/nameforma/unstable';
import {
  createTempDir,
  createTempWorld,
  readTaskFile,
  listTaskFiles,
  countTasks,
} from './helpers.js';

describe('CLI: task command', () => {
  let cli;
  let output;
  let errors;
  let originalLog;
  let originalError;
  let tempWorld;

  beforeEach(async () => {
    // Create isolated temp world
    tempWorld = await createTempWorld();

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

    // Reset nfTui to use mocked console
    nfTui.setRenderer(new CliRenderer());

    // Create CLI instance
    cli = new NfCLI();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('create task with title', async () => {
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      'Test Task',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/Task added:/);
    expect(countTasks(tempWorld.worldPath)).toBe(1);
  });

  it('list tasks when empty', async () => {
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'list',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toBe('No tasks');
  });

  it('list tasks after creation', async () => {
    // Create a task
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      'Task 1',
    ]);

    output.length = 0;

    // List tasks
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'list',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/Tasks \(\d+\):/);
    expect(output[1]).toMatch(/Task 1/);
  });

  describe('delete command', () => {
    it('delete task with partial fuzzy ID using --force', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'To Delete',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      expect(taskId).not.toBeNull();

      output.length = 0;

      // Delete using partial fuzzy ID (first 8 chars) with --force
      const partialId = taskId?.substring(0, 8);
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
        '--',
        partialId,
      ]);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/Task deleted:/);
      expect(countTasks(tempWorld.worldPath)).toBe(0);
    });

    it('delete task with exact full ID using --force', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Exact Delete',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      expect(taskId).not.toBeNull();

      output.length = 0;

      // Delete using exact full ID with --force
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
        '--',
        taskId,
      ]);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/Task deleted:/);
      expect(countTasks(tempWorld.worldPath)).toBe(0);
    });

    it('delete task then verify not in list', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Task to Verify',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Delete the task with --force
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
        '--',
        taskId,
      ]);

      output.length = 0;

      // List tasks
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'list',
      ]);

      expect(output[0]).toBe('No tasks');
    });

    it('delete task then verify cannot show', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Show After Delete',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Delete the task with --force
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
        '--',
        taskId,
      ]);

      output.length = 0;

      // Try to show deleted task - should fail
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'find',
          '-w',
          tempWorld.worldPath,
          '--',
          taskId,
        ]),
      ).rejects.toThrow(`Not found: ${taskId}`);
    });

    it('delete one of multiple tasks', async () => {
      // Create three tasks
      const taskIds: (string | null)[] = [];

      for (let i = 1; i <= 3; i++) {
        await cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'add',
          `Task ${i}`,
        ]);

        const createOutput = output.join('\n');
        const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
        taskIds.push(idMatch ? idMatch[1] : null);
        output.length = 0;
      }

      expect(countTasks(tempWorld.worldPath)).toBe(3);

      // Delete the second task with --force
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
        '--',
        taskIds[1],
      ]);

      expect(countTasks(tempWorld.worldPath)).toBe(2);

      output.length = 0;

      // List remaining tasks
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'list',
      ]);

      const listOutput = output.join('\n');
      expect(listOutput).toMatch(/Task 1/);
      expect(listOutput).not.toMatch(/Task 2/);
      expect(listOutput).toMatch(/Task 3/);
    });

    it('delete with ambiguous partial ID throws error', async () => {
      // Create two tasks
      const taskIds: (string | null)[] = [];

      for (let i = 1; i <= 2; i++) {
        await cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'add',
          `Ambiguous Task ${i}`,
        ]);

        const createOutput = output.join('\n');
        const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
        taskIds.push(idMatch ? idMatch[1] : null);
        output.length = 0;
      }

      expect(countTasks(tempWorld.worldPath)).toBe(2);

      // Try to delete with very short ID that matches both - should throw ambiguous error (with --force)
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'delete',
          '0',
          '--force',
        ]),
      ).rejects.toThrow(/ambiguous match/);

      // Verify both tasks still exist
      expect(countTasks(tempWorld.worldPath)).toBe(2);
    });

    it('delete task shows correct ID in output', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'ID Output Test',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Delete the task with --force
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
        '--',
        taskId,
      ]);

      // Verify output shows the full task ID, not the search string
      expect(output[0]).toContain(`Task deleted: ${taskId}`);
    });
  });

  it('delete non-existent task returns error', async () => {
    await expect(
      cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        'nonexistent',
        '--force',
      ]),
    ).rejects.toThrow(/Task not found/);
  });

  describe('optional ID with focus fallback', () => {
    it('show task without ID uses focused task', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Focused Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Focus the task by loading world and calling focus
      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      expect(task).not.toBeNull();
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Show without ID - should use focused task
      await cli.parseArgv([
        'node',
        'test',
        'find',
        '-w',
        tempWorld.worldPath,
        'focus',
      ]);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/forma": "Task/);
      expect(output.join('\n')).toMatch(/name": "Focused Task/);
      expect(output.join('\n')).toMatch(/"summary":/);
    });

    it('show without ID returns error when no task focused', async () => {
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'find',
          '-w',
          tempWorld.worldPath,
          'focus',
        ]),
      ).rejects.toThrow(/Not found: focus|Task not found/);
    });

    it('show displays all actions in task', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Task With Actions',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Add actions to the task
      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      expect(task).not.toBeNull();

      // Add some actions
      task!
        .actions(world)
        .addItem(
          new Action({ name: 'First action', summary: 'Do this first' }),
        );
      task!.actions(world).addItem(new Action({ name: 'Second action' }));
      await world.save();

      output.length = 0;

      // Show task - should display all actions
      await cli.parseArgv([
        'node',
        'test',
        'find',
        '-w',
        tempWorld.worldPath,
        '--',
        taskId,
      ]);

      const showOutput = output.join('\n');
      expect(showOutput).toMatch(/forma": "Task/);
      expect(showOutput).toMatch(/name": "Task With Actions/);
      expect(showOutput).toMatch(/rawActions/);
      expect(showOutput).toMatch(/"First action"/);
      expect(showOutput).toMatch(/Do this first/);
      expect(showOutput).toMatch(/"Second action"/);
    });

    it('list tasks displays progress percentage', async () => {
      // Create task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'List Progress Task',
      ]);

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const taskList = world.entityList(Task);
      const task = Array.from(taskList)[0] as any;
      task
        .actions(world)
        .addItem(new Action({ name: 'Action 1', status: 'spec' }));
      await world.save();

      output.length = 0;

      // List tasks - should show progress percentage
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'list',
      ]);

      const listOutput = output.join('\n');
      expect(listOutput).toMatch(/\d+%/);
    });

    it('delete task without ID uses focused task', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Delete Me',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Focus the task
      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Delete without ID using --force - should use focused task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
      ]);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/Task deleted:/);
      expect(countTasks(tempWorld.worldPath)).toBe(0);
    });
  });

  describe('set command', () => {
    it('set name on focused task', async () => {
      // Create and focus a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Original Name',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Set name without taskId
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'set',
        'name',
        'Updated Name',
      ]);

      expect(output[0]).toMatch(/Task updated:/);
      expect(output[1]).toMatch(/Updated Name/);
    });

    it('set summary on focused task', async () => {
      // Create and focus a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Set summary
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'set',
        'summary',
        'New description',
      ]);

      expect(output[0]).toMatch(/Task updated:/);
    });

    it('set field on specific task with taskId', async () => {
      // Create a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Target Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Set using dotRef syntax with taskId
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'set',
        '--',
        `${taskId}.name`,
        'Changed Name',
      ]);

      expect(output[0]).toMatch(/Task updated:/);
      expect(output[1]).toMatch(/Changed Name/);
    });

    it('set rejects empty name', async () => {
      // Create and focus a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Try to set empty name
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'set',
          'name',
          '',
        ]),
      ).rejects.toThrow(/Task name cannot be blank/);
    });

    it('set rejects invalid field', async () => {
      // Create and focus a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Try to set invalid field
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'set',
          'invalid',
          'value',
        ]),
      ).rejects.toThrow(/Invalid field: invalid/);
    });

    it('set strips line breaks from value', async () => {
      // Create and focus a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Set value with line breaks (simulated as separate args which get joined)
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'set',
        'summary',
        'Line 1\nLine 2\nLine 3',
      ]);

      expect(output[0]).toMatch(/Task updated:/);

      // Verify line breaks were stripped
      const world2 = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const updated = await world2.loadFuzzy(Task, taskId!);
      expect(updated?.summary).not.toContain('\n');
      expect(updated?.summary).toMatch(/Line 1.*Line 2.*Line 3/);
    });

    it('set allows multi-word values', async () => {
      // Create and focus a task
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        'Test Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      const world = await FileRepository.worldFromPath(
        tempWorld.worldPath,
      );
      const task = await world.loadFuzzy(Task, taskId!);
      world.focusManager.focus(task!.id);
      await world.save();

      output.length = 0;

      // Set multi-word value
      await cli.parseArgv([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'set',
        'name',
        'This is a multi-word task name',
      ]);

      expect(output[0]).toMatch(/Task updated:/);
      expect(output.join('\n')).toMatch(/This is a multi-word task name/);
    });

    it('set fails without focused task when taskId omitted', async () => {
      // Don't create or focus any task
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'set',
          'name',
          'value',
        ]),
      ).rejects.toThrow(/No task focused|Task not found/);
    });

    it('set fails when taskId not found', async () => {
      await expect(
        cli.parseArgv([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'set',
          'nonexistent.name',
          'value',
        ]),
      ).rejects.toThrow(/Task not found/);
    });
  });

  it('task focus pushes task to top of stack', async () => {
    const world = await FileRepository.worldFromPath(tempWorld.worldPath);
    const task = await world.upsertOne(Task, { name: 'Focus Me' });

    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      task.id.base64,
    ]);

    expect(output[0]).toMatch(/Task focused:/);
    const world2 = await FileRepository.worldFromPath(tempWorld.worldPath);
    expect(world2.focusManager.size).toBe(1);
    expect(world2.focusManager.focusOrder(task.id)).toBe(0);
  });

  it('task focus moves existing entry to top without duplicating', async () => {
    const world = await FileRepository.worldFromPath(tempWorld.worldPath);
    const taskA = await world.upsertOne(Task, { name: 'Task A' });
    const taskB = await world.upsertOne(Task, { name: 'Task B' });

    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      taskA.id.base64,
    ]);
    output.length = 0;
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      taskB.id.base64,
    ]);
    output.length = 0;
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      taskA.id.base64,
    ]);

    const world2 = await FileRepository.worldFromPath(tempWorld.worldPath);
    expect(world2.focusManager.size).toBe(2);
    expect(world2.focusManager.focusOrder(taskA.id)).toBe(0);
  });

  it('task unfocus removes task from focus stack by id', async () => {
    const world = await FileRepository.worldFromPath(tempWorld.worldPath);
    const task = await world.upsertOne(Task, { name: 'Unfocus Me' });

    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      task.id.base64,
    ]);
    output.length = 0;
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'unfocus',
      '--',
      task.id.base64,
    ]);

    expect(output[0]).toMatch(/Task unfocused:/);
    const world2 = await FileRepository.worldFromPath(tempWorld.worldPath);
    expect(world2.focusManager.size).toBe(0);
  });

  it('task unfocus with no id removes top of stack', async () => {
    const world = await FileRepository.worldFromPath(tempWorld.worldPath);
    const taskA = await world.upsertOne(Task, { name: 'Task A' });
    const taskB = await world.upsertOne(Task, { name: 'Task B' });

    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      taskA.id.base64,
    ]);
    output.length = 0;
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'focus',
      '--',
      taskB.id.base64,
    ]);
    output.length = 0;
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'unfocus',
    ]);

    expect(output[0]).toMatch(/Task unfocused:/);
    const world2 = await FileRepository.worldFromPath(tempWorld.worldPath);
    expect(world2.focusManager.size).toBe(1);
    expect(world2.focusManager.focusOrder(taskA.id)).toBe(0);
  });
});

describe('CLI: nameforma package script', () => {
  it('npm run cli help displays usage', () => {
    const output = execSync('npm run cli -- --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/usage|commands|options/i);
    expect(output).toMatch(/task/i);
  });

  it('npm run cli task list shows no tasks when empty', async () => {
    const tempWorld = await createTempWorld();
    try {
      const output = execSync(
        `npm run cli -- task -w ${tempWorld.tempDir} list`,
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );

      expect(output).toMatch(/No tasks/);
      tempWorld.cleanup();
    } finally {
      tempWorld.cleanup();
    }
  });

  it('cli task list without -w uses current directory', () => {
    const { tempDir, cleanup } = createTempDir('NF1427-');
    console.log('tempDir:', tempDir);
    const worldFilePath = path.join(tempDir, '.nameforma', 'world.json');
    try {
      // Create symlink to CLI executable in temp directory
      const cliPath = path.join(process.cwd(), 'dist/cli/nf-cli.js');
      const symlinkPath = path.join(tempDir, 'nf-cli.js');
      fs.symlinkSync(cliPath, symlinkPath);

      // World.json should not exist
      expect(!fs.existsSync(worldFilePath));

      // Run CLI from temp directory without -w option
      const output = execSync(
        'node nf-cli.js init; node nf-cli.js task list',
        {
          cwd: tempDir,
          encoding: 'utf8',
        },
      );

      expect(output).toMatch(/No tasks/);
    } finally {
      cleanup();
    }
  });
});
