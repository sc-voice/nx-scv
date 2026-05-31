import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLI } from '../../src/cli/nf-cli.js';
import { World } from '../../src/world.js';
import { Task } from '../../src/task.js';
import { createTempWorld } from './helpers.js';

describe('CLI: set command', () => {
  let cli: CLI;
  let output: string[];
  let errors: string[];
  let originalLog: any;
  let originalError: any;
  let tempWorld: any;

  beforeEach(() => {
    tempWorld = createTempWorld();

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

    cli = new CLI();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('set task name via TASK_ID.name', async () => {
    // Create task
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
    const taskId = idMatch![1];

    output.length = 0;

    // Set name
    await cli.parseArgv([
      'node',
      'test',
      'set',
      '-w',
      tempWorld.worldPath,
      '--',
      `${taskId}.name`,
      'New Name',
    ]);

    expect(output[0]).toMatch(/✓ Updated: name/);
    expect(output[1]).toMatch(/  Original Name/);
    expect(output[2]).toMatch(/→ New Name/);

    // Verify persistence
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task?.name).toBe('New Name');
  });

  it('set task summary via TASK_ID.summary', async () => {
    // Create task
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      'Task Name',
      'Old Summary',
    ]);

    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch![1];

    output.length = 0;

    // Set summary
    await cli.parseArgv([
      'node',
      'test',
      'set',
      '-w',
      tempWorld.worldPath,
      '--',
      `${taskId}.summary`,
      'New Summary',
    ]);

    expect(output[0]).toMatch(/✓ Updated: summary/);

    // Verify persistence
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task?.summary).toBe('New Summary');
  });

  it('error on malformed dotref', async () => {
    await expect(
      cli.parseArgv([
        'node',
        'test',
        'set',
        '-w',
        tempWorld.worldPath,
        'name',
        'Value',
      ]),
    ).rejects.toThrow(/Dotref must be FORMA_ID.FIELD_NAME/);
  });

  it('error on unknown forma ID', async () => {
    await expect(
      cli.parseArgv([
        'node',
        'test',
        'set',
        '-w',
        tempWorld.worldPath,
        'nonexistent.name',
        'Value',
      ]),
    ).rejects.toThrow(/Not found: nonexistent/);
  });

  it('output JSON with --json flag', async () => {
    // Create task
    await cli.parseArgv([
      'node',
      'test',
      'task',
      '-w',
      tempWorld.worldPath,
      'add',
      'Task',
    ]);

    const createOutput = output.join('\n');
    const idMatch = createOutput.match(/Task added: ([A-Za-z0-9_-]+)/);
    const taskId = idMatch![1];

    output.length = 0;

    // Set with JSON output
    await cli.parseArgv([
      'node',
      'test',
      'set',
      '-w',
      tempWorld.worldPath,
      '--json',
      '--',
      `${taskId}.name`,
      'Updated',
    ]);

    const jsonOutput = output.join('\n');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.name).toBe('Updated');
  });
});
