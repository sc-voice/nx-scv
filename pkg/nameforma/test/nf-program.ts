import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { FileRepository } from '../src/file-repository.js';
import { World } from '../src/world.js';
import { Task } from '../src/task.js';
import { NfProgram, type ICommand } from '../src/nf-program.js';
import { createTempDir } from './cli/helpers.js';

describe('ICommand', () => {
  it('Command satisfies ICommand', () => {
    const cmd: ICommand = new Command();
    expect(cmd).toBeTruthy();
  });
});

describe('NfProgram construction and initialization', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;

  beforeEach(async () => {
    tempDirObj = createTempDir('nfprogram-init-test');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = await FileRepository.worldFromPath(tempWorldPath);
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('constructs with cmdDelegate only, world not yet set', () => {
    const cmd: ICommand = new Command();
    const p = new NfProgram(cmd);
    expect(p).toBeInstanceOf(NfProgram);
    expect(() => p.world).toThrow(/NfProgram not initialized/);
  });

  it('initialize sets world and config', () => {
    const cmd: ICommand = new Command();
    const p = new NfProgram(cmd);
    p.initialize(world, {
      verbosity: 2,
      testRunner: true,
      debug: true,
      isAgent: true,
    });
    expect(p.world).toBe(world);
    expect(p.verbosity).toBe(2);
    expect(p.testRunner).toBe(true);
    expect(p.debug).toBe(true);
    expect(p.isAgent).toBe(true);
  });

  it('resolveWorld finds world by path', async () => {
    const resolved = await NfProgram.resolveWorld(tempWorldPath);
    expect(resolved).toBeInstanceOf(World);
  });
});

describe('NfProgram.setFieldValue', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let program: NfProgram;

  beforeEach(async () => {
    tempDirObj = createTempDir('nf-program-test');

    // Copy sample .nameforma to temp directory
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');

    // Recursively copy sample data
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });

    world = await FileRepository.worldFromPath(tempWorldPath);
    program = new NfProgram(new Command());
    program.initialize(world);
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('setFieldValue on top-level task', async () => {
    // Load existing task from sample data
    const task = await await world.loadFuzzy(
      Task,
      '0PxVmryB00tGyAPrFKqetW',
    );
    expect(task).toBeTruthy();

    // Set field value
    const updated = await program.setFieldValue(
      task!.id.base64,
      'summary',
      'Updated summary',
    );
    expect(updated.summary).toBe('Updated summary');

    // Verify persistence
    const reloaded = await FileRepository.worldFromPath(tempWorldPath);
    const task2 = await reloaded.loadFuzzy(Task, '0PxVmryB00tGyAPrFKqetW');
    expect(task2?.summary).toBe('Updated summary');
  });

  it('setFieldValue on nested action', async () => {
    // Load task and focus it
    const task = await await world.loadFuzzy(
      Task,
      '0PxVmryB00tGyAPrFKqetW',
    );
    expect(task).toBeTruthy();
    world.focusManager.focus(task!.id);

    // Set action field value
    const actionId = '0PxVwGSx00tGyAPrFKqetW';
    const updated = await program.setFieldValue(
      actionId,
      'summary',
      'Updated action summary',
    );
    expect(updated.summary).toBe('Updated action summary');

    // Persist and verify
    await world.save();
    const reloaded = await FileRepository.worldFromPath(tempWorldPath);
    const task2 = await reloaded.loadFuzzy(Task, '0PxVmryB00tGyAPrFKqetW');
    const action = task2?.rawActions[0];
    expect(action?.summary).toBe('Updated action summary');
  });

  it('error on unknown forma ID', async () => {
    await expect(
      program.setFieldValue('nonexistent', 'name', 'value'),
    ).rejects.toThrow(/Not found: nonexistent/);
  });
});

describe('NfProgram.resolveDotRef', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let program: NfProgram;

  beforeEach(async () => {
    tempDirObj = createTempDir('nf-program-dotref-test');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = await FileRepository.worldFromPath(tempWorldPath);
    program = new NfProgram(new Command());
    program.initialize(world);
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('resolves task dotref and returns field value', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';
    const { forma, fieldName, value } = await program.resolveDotRef(
      `${taskId}.name`,
    );
    expect(fieldName).toBe('name');
    expect(value).toBe(forma.name);
  });

  it('resolves action dotref with focused task', async () => {
    const task = await await world.loadFuzzy(
      Task,
      '0PxVmryB00tGyAPrFKqetW',
    );
    world.focusManager.focus(task!.id);
    const actionId = '0PxVwGSx00tGyAPrFKqetW';
    const { forma, fieldName, value } = await program.resolveDotRef(
      `${actionId}.status`,
    );
    expect(fieldName).toBe('status');
    expect(value).toBe((forma as any).status);
  });

  it('throws on missing dot separator', async () => {
    await expect(program.resolveDotRef('nodothere')).rejects.toThrow(
      /dotRef must be FORMA_ID.FIELD_NAME/,
    );
  });

  it('throws on unknown forma ID', async () => {
    await expect(
      program.resolveDotRef('nonexistent.name'),
    ).rejects.toThrow(/Not found: nonexistent/);
  });
});

describe('NfProgram.registerPatchCommand', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let program: NfProgram;

  beforeEach(async () => {
    tempDirObj = createTempDir('nf-program-patch-test');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = await FileRepository.worldFromPath(tempWorldPath);
    program = new NfProgram(new Command());
    program.initialize(world);
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('patch with implicit $set via bare fields mutates and persists', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';
    const task = await world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    const oldName = task!.name;

    // Call registerPatchCommand's action handler directly via mutate
    const json = { id: task!.id.base64, name: 'Updated via Patch' };
    const { Mutator } = await import('../src/mutator.js');
    const mutator = Mutator.fromJson(json);
    const delta = await world.mutate(taskId, mutator.commands);

    // Verify delta contains old value
    expect(delta.name).toBe(oldName);

    // Verify mutation persisted
    const reloaded = await FileRepository.worldFromPath(tempWorldPath);
    const reloadedTask = await reloaded.loadFuzzy(Task, taskId);
    expect(reloadedTask?.name).toBe('Updated via Patch');
  });

  it('patch with explicit $set operator produces same result', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';
    const task = await world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    const oldSummary = task!.summary;

    const json = {
      id: task!.id.base64,
      $set: { summary: 'Explicit Set Summary' },
    };
    const { Mutator } = await import('../src/mutator.js');
    const mutator = Mutator.fromJson(json);
    const delta = await world.mutate(taskId, mutator.commands);

    // Verify delta reflects old value
    expect(delta.summary).toBe(oldSummary);

    // Verify persistence
    const reloaded = await FileRepository.worldFromPath(tempWorldPath);
    const reloadedTask = await reloaded.loadFuzzy(Task, taskId);
    expect(reloadedTask?.summary).toBe('Explicit Set Summary');
  });

  it('error on unknown forma ID', async () => {
    const { Mutator } = await import('../src/mutator.js');
    const mutator = Mutator.fromJson({
      id: 'nonexistent-id',
      name: 'x',
    });
    await expect(
      world.mutate('nonexistent', mutator.commands),
    ).rejects.toThrow(/fuzzyId not found/);
  });
});

describe('NfCLI patch command', () => {
  let cli: any;
  let output: string[];
  let errors: string[];
  let originalLog: any;
  let originalError: any;
  let tempWorld: any;

  beforeEach(async () => {
    const { NfCLI } = await import('../src/cli/nf-cli.js');
    const helpers = await import('./cli/helpers.js');
    tempWorld = await helpers.createTempWorld();

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

    cli = new NfCLI();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('patch command mutates and outputs changes', async () => {
    // Create task first
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

    // Patch task
    await cli.parseArgv([
      'node',
      'test',
      'patch',
      '-w',
      tempWorld.worldPath,
      '--',
      taskId,
      "name: 'Updated Name'",
    ]);

    const outputStr = output.join('\n');
    expect(outputStr).toContain(taskId);
    expect(outputStr).toContain('Updated Name');

    // Verify persistence
    const reloaded = await FileRepository.worldFromPath(
      tempWorld.worldPath,
    );
    const reloadedTask = await reloaded.loadFuzzy(Task, taskId);
    expect(reloadedTask?.name).toBe('Updated Name');
  });

  it('patch with $set operator works', async () => {
    // Create task first
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

    // Patch with $set operator
    await cli.parseArgv([
      'node',
      'test',
      'patch',
      '-w',
      tempWorld.worldPath,
      '--',
      taskId,
      '$set: { summary: "New Summary" }',
    ]);

    const outputStr = output.join('\n');
    expect(outputStr).toContain('New Summary');

    // Verify persistence
    const reloaded = await FileRepository.worldFromPath(
      tempWorld.worldPath,
    );
    const reloadedTask = await reloaded.loadFuzzy(Task, taskId);
    expect(reloadedTask?.summary).toBe('New Summary');
  });

  it('patch with disjoint JSON works', async () => {
    // Create task first
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

    // Patch with $set operator
    await cli.parseArgv([
      'node',
      'test',
      'patch',
      '-w',
      tempWorld.worldPath,
      '--',
      taskId,
      'summary:',
      'New Summary',
    ]);

    const outputStr = output.join('\n');
    expect(outputStr).toContain('New Summary');

    // Verify persistence
    const reloaded = await FileRepository.worldFromPath(
      tempWorld.worldPath,
    );
    const reloadedTask = await reloaded.loadFuzzy(Task, taskId);
    expect(reloadedTask?.summary).toBe('New Summary');
  });

  it('patch with --json outputs JSON', async () => {
    // Create task first
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

    // Patch with JSON output
    await cli.parseArgv([
      'node',
      'test',
      'patch',
      '-w',
      tempWorld.worldPath,
      '--json',
      '--',
      taskId,
      'summary: "JSON Test"',
    ]);

    const jsonOutput = output.join('\n');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.summary).toBe('JSON Test');
  });

  it('patch errors on invalid forma ID', async () => {
    await expect(
      cli.parseArgv([
        'node',
        'test',
        'patch',
        '-w',
        tempWorld.worldPath,
        '--',
        'nonexistent',
        'name: x',
      ]),
    ).rejects.toThrow(/Not found|nonexistent/);
  });

  it('patch errors on invalid HJSON', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      cli.parseArgv([
        'node',
        'test',
        'patch',
        '-w',
        tempWorld.worldPath,
        '--',
        taskId,
        'invalid hjson {{',
      ]),
    ).rejects.toThrow();
  });
});
