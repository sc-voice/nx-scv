import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { execSync } from 'child_process';
import { Command } from 'commander';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/commands/task.js';
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
    TaskCommand.register(taskCmd);
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
      'create',
      '-t',
      'Test Task',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task created:/);
    expect(countTasks(tempWorld.worldPath)).toBe(1);
  });

  it('create task with progress', async () => {
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'create',
      '-t',
      'My Task',
      '-p',
      '2/5',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task created:/);
    expect(output[1]).toMatch(/2\/5/);
    expect(countTasks(tempWorld.worldPath)).toBe(1);
  });

  it('create task with duration', async () => {
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'create',
      '-t',
      'Timed Task',
      '-d',
      '5/60',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task created:/);
    expect(output[1]).toMatch(/5\/60/);
    expect(countTasks(tempWorld.worldPath)).toBe(1);
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
      'create',
      '-t',
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
      'create',
      '-t',
      'Show Me',
      '-n',
      'test-task',
    ]);

    // Extract task ID from output
    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task created: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch ? idMatch[1] : null;

    expect(taskId).not.toBeNull();

    output.length = 0;

    // Show the task
    await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'show', taskId]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/Task:/);
    expect(output.join('\n')).toMatch(/name: test-task/);
    expect(output.join('\n')).toMatch(/title: Show Me/);
  });

  it('update task title', async () => {
    // Create a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'create',
      '-t',
      'Original Title',
    ]);

    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task created: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch ? idMatch[1] : null;

    expect(taskId).not.toBeNull();

    output.length = 0;

    // Update the task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'update',
      taskId,
      '-t',
      'Updated Title',
    ]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task updated:/);
    expect(output[1]).toMatch(/Updated Title/);
  });

  it('update task progress', async () => {
    // Create a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'create',
      '-t',
      'Progress Task',
      '-p',
      '0/4',
    ]);

    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task created: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch ? idMatch[1] : null;

    expect(taskId).not.toBeNull();

    output.length = 0;

    // Update progress
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'update',
      taskId,
      '-p',
      '3/4',
    ]);

    expect(output[1]).toMatch(/3\/4/);
  });

  it('delete task', async () => {
    // Create a task
    await program.parseAsync([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'create',
      '-t',
      'To Delete',
    ]);

    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task created: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch ? idMatch[1] : null;

    expect(taskId).not.toBeNull();

    output.length = 0;

    // Delete the task
    await program.parseAsync(['node', 'test', 'task', '-w', tempWorld.worldPath, 'delete', taskId]);

    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toMatch(/✓ Task deleted:/);
    expect(countTasks(tempWorld.worldPath)).toBe(0);
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
        '-t',
        'New Title',
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
      ])
    ).rejects.toThrow(/Task not found/);
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
});
