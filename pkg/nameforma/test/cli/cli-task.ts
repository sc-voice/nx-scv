import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { execSync } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import { World } from '../../src/world.js';
import { createTempWorld, readTaskFile, listTaskFiles, countTasks } from './helpers';

const { Task, Rational } = NameForma;

describe('CLI: task command', () => {
  let program;
  let taskCmd;
  let output;
  let errors;
  let originalLog;
  let originalError;
  let tempWorld;

  beforeEach(() => {
    // Create isolated temp world
    tempWorld = createTempWorld();

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
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('create task with title', async () => {
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

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task added:/);
    expect(countTasks(tempWorld.worldPath)).toBe(1);
  });


  it('create task related to another task', async () => {
    // Create primary task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Primary Task',
    ]);

    const primaryOutput = output.join('\n');
    const primaryIdMatch = primaryOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
    const primaryId = primaryIdMatch ? primaryIdMatch[1] : null;
    expect(primaryId).not.toBeNull();

    output.length = 0;

    // Create related task using partial fuzzy ID
    const partialId = primaryId?.substring(0, 8);
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Related Task',
      '--related',
      partialId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task added:/);
    expect(countTasks(tempWorld.worldPath)).toBe(2);

    // Verify related task was created with a different ID but related UUID
    const relatedOutput = output.join('\n');
    const relatedIdMatch = relatedOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
    const relatedId = relatedIdMatch ? relatedIdMatch[1] : null;
    expect(relatedId).not.toBeNull();
    expect(relatedId).not.toBe(primaryId);
  });

  it('list tasks when empty', async () => {
    await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'list']);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toBe('No tasks');
  });

  it('list tasks after creation', async () => {
    // Create a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Task 1',
    ]);

    output.length = 0;

    // List tasks
    await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'list']);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/Tasks \(\d+\):/);
    expect(output[1]).toMatch(/Task 1/);
  });

  it('show task details', async () => {
    // Create a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Show Me',
    ]);

    // Extract task ID from output
    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch ? idMatch[1] : null;

    expect(taskId).not.toBeNull();

    output.length = 0;

    // Show the task
    await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'show', taskId]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/Task:/);
    expect(output.join('\n')).toMatch(/name: Show Me/);
  });

  describe('delete command', () => {
    it('delete task with partial fuzzy ID using --force', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'To Delete',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      expect(taskId).not.toBeNull();

      output.length = 0;

      // Delete using partial fuzzy ID (first 8 chars) with --force
      const partialId = taskId?.substring(0, 8);
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', partialId, '--force']);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/✓ Task deleted:/);
      expect(countTasks(tempWorld.worldPath)).toBe(0);
    });

    it('delete task with exact full ID using --force', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Exact Delete',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      expect(taskId).not.toBeNull();

      output.length = 0;

      // Delete using exact full ID with --force
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', taskId, '--force']);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/✓ Task deleted:/);
      expect(countTasks(tempWorld.worldPath)).toBe(0);
    });

    it('delete task then verify not in list', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Task to Verify',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Delete the task with --force
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', taskId, '--force']);

      output.length = 0;

      // List tasks
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'list']);

      expect(output[0]).toBe('No tasks');
    });

    it('delete task then verify cannot show', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Show After Delete',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Delete the task with --force
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', taskId, '--force']);

      output.length = 0;

      // Try to show deleted task - should fail
      await expect(
        program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'show', taskId])
      ).rejects.toThrow(/Task not found/);
    });

    it('delete one of multiple tasks', async () => {
      // Create three tasks
      const taskIds: (string | null)[] = [];

      for (let i = 1; i <= 3; i++) {
        await program.parseAsync([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'add',
          '-n',
          `Task ${i}`,
        ]);

        const createOutput = output.join('\n');
        const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
        taskIds.push(idMatch ? idMatch[1] : null);
        output.length = 0;
      }

      expect(countTasks(tempWorld.worldPath)).toBe(3);

      // Delete the second task with --force
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', taskIds[1], '--force']);

      expect(countTasks(tempWorld.worldPath)).toBe(2);

      output.length = 0;

      // List remaining tasks
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'list']);

      const listOutput = output.join('\n');
      expect(listOutput).toMatch(/Task 1/);
      expect(listOutput).not.toMatch(/Task 2/);
      expect(listOutput).toMatch(/Task 3/);
    });

    it('delete with ambiguous partial ID throws error', async () => {
      // Create two tasks
      const taskIds: (string | null)[] = [];

      for (let i = 1; i <= 2; i++) {
        await program.parseAsync([
          'node',
          'test',
          'task',
          '-w',
          tempWorld.worldPath,
          'add',
          '-n',
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
        program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', '0', '--force'])
      ).rejects.toThrow(/ambiguous match/);

      // Verify both tasks still exist
      expect(countTasks(tempWorld.worldPath)).toBe(2);
    });

    it('delete task shows correct ID in output', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'ID Output Test',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;

      output.length = 0;

      // Delete the task with --force
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', taskId, '--force']);

      // Verify output shows the full task ID, not the search string
      expect(output[0]).toContain(`✓ Task deleted: ${taskId}`);
    });
  });

  it('show non-existent task returns error', async () => {
    await expect(
      program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'show',
        'nonexistent',
      ])
    ).rejects.toThrow(/Task not found/);
  });

  it('update task with name and summary', async () => {
    // Create a task first
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      '-n',
      'Original Name',
    ]);

    output.length = 0;

    // Get the task ID from list
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'list',
    ]);

    const listOutput = output.join('\n');
    const idMatch = listOutput.match(/([A-Za-z0-9_-]+)\s+Original Name/);
    const taskId = idMatch ? idMatch[1] : null;
    expect(taskId).not.toBeNull();

    output.length = 0;

    // Update name and summary
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'update',
      taskId,
      '-n',
      'Updated Name',
      '-s',
      'New Summary',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task updated:/);
    expect(output[1]).toMatch(/Updated Name/);
  });

  it('update non-existent task returns error', async () => {
    await expect(
      program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'update',
        'nonexistent',
      ])
    ).rejects.toThrow(/Task not found/);
  });

  it('delete non-existent task returns error', async () => {
    await expect(
      program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        'nonexistent',
        '--force',
      ])
    ).rejects.toThrow(/Task not found/);
  });

  describe('optional ID with focus fallback', () => {
    it('show task without ID uses focused task', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Focused Task',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Focus the task by loading world and calling focusForma
      const world = World.fromPath(tempWorld.worldPath);
      const task = world.loadFuzzy(Task, taskId!);
      expect(task).not.toBeNull();
      world.focusForma(task!);
      world.save();

      output.length = 0;

      // Show without ID - should use focused task
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'show']);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/Task:/);
      expect(output.join('\n')).toMatch(/name: Focused Task/);
      expect(output.join('\n')).toMatch(/summary:/);
    });

    it('show without ID returns error when no task focused', async () => {
      await expect(
        program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'show'])
      ).rejects.toThrow(/No task focused|Task not found/);
    });

    it('show displays all actions in task', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Task With Actions',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Add actions to the task
      const world = World.fromPath(tempWorld.worldPath);
      const task = world.loadFuzzy(Task, taskId!);
      expect(task).not.toBeNull();

      // Add some actions
      task!.actions(world).addItem({ name: 'First action', summary: 'Do this first' });
      task!.actions(world).addItem({ name: 'Second action' });
      world.save();

      output.length = 0;

      // Show task - should display all actions
      await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'show', taskId]);

      const showOutput = output.join('\n');
      expect(showOutput).toMatch(/Task:/);
      expect(showOutput).toMatch(/name: Task With Actions/);
      expect(showOutput).toMatch(/actions:/);
      expect(showOutput).toMatch(/\w+:.*todo.*First action/);
      expect(showOutput).toMatch(/Do this first/);
      expect(showOutput).toMatch(/\w+:.*todo.*Second action/);
    });

    it('update task without ID uses focused task', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Update Me',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Focus the task
      const world = World.fromPath(tempWorld.worldPath);
      const task = world.loadFuzzy(Task, taskId!);
      world.focusForma(task!);
      world.save();

      output.length = 0;

      // Update without ID - should use focused task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'update',
        '-n',
        'Updated Name',
      ]);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/✓ Task updated:/);
      expect(output[1]).toMatch(/Updated Name/);
    });

    it('delete task without ID uses focused task', async () => {
      // Create a task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'add',
        '-n',
        'Delete Me',
      ]);

      const createOutput = output.join('\n');
      const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
      const taskId = idMatch ? idMatch[1] : null;
      expect(taskId).not.toBeNull();

      // Focus the task
      const world = World.fromPath(tempWorld.worldPath);
      const task = world.loadFuzzy(Task, taskId!);
      world.focusForma(task!);
      world.save();

      output.length = 0;

      // Delete without ID using --force - should use focused task
      await program.parseAsync([
        'node',
        'test',
        'task',
        '-w',
        tempWorld.worldPath,
        'delete',
        '--force',
      ]);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toMatch(/✓ Task deleted:/);
      expect(countTasks(tempWorld.worldPath)).toBe(0);
    });
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

  it('npm run cli task list shows no tasks when empty', () => {
    const tempWorld = createTempWorld();
    try {
      const output = execSync(`npm run cli -- task -w ${tempWorld.tempDir} list`, {
        cwd: process.cwd(),
        encoding: 'utf8',
      });

      expect(output).toMatch(/No tasks/);
    } finally {
      tempWorld.cleanup();
    }
  });

  it('cli task list without -w uses current directory', () => {
    const tempWorld = createTempWorld();
    try {
      // Create symlink to CLI executable in temp directory
      const cliPath = path.join(process.cwd(), 'dist/cli/nameforma.js');
      const symlinkPath = path.join(tempWorld.tempDir, 'nameforma.js');
      fs.symlinkSync(cliPath, symlinkPath);

      // Run CLI from temp directory without -w option
      const output = execSync('node nameforma.js task list', {
        cwd: tempWorld.tempDir,
        encoding: 'utf8',
      });

      expect(output).toMatch(/No tasks/);
    } finally {
      tempWorld.cleanup();
    }
  });
});
