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

describe('NfProgram.registerUpdateCommand', () => {
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

    // Call registerUpdateCommand's action handler directly via mutate
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

describe('NfProgram.registerFindCommand', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let cmdDelegate: Command;
  let program: NfProgram;
  let output: string[];
  let errors: string[];

  beforeEach(async () => {
    tempDirObj = createTempDir('nf-program-find-test');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = await FileRepository.worldFromPath(tempWorldPath);

    output = [];
    errors = [];

    cmdDelegate = new Command();
    program = new NfProgram(cmdDelegate);
    program.initialize(world);

    // Configure output to capture writes
    program.cmdDelegate.configureOutput({
      writeOut: (str: string) => output.push(str),
      writeErr: (str: string) => errors.push(str),
    });

    program.registerFindCommand();
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('find without projection returns all fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync(['node', 'test', 'find', taskId]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.id).toBe(taskId);
    expect(result.name).toBe('Task1-Name');
    expect(result.summary).toBe('Task1-Summary');
    expect(result.rawActions).toBeTruthy();
    expect(result.rawReferences).toBeTruthy();
  });

  it('find with inclusion projection returns only selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{name:1,summary:1}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.name).toBe('Task1-Name');
    expect(result.summary).toBe('Task1-Summary');
    expect(result.id).toBeUndefined();
    expect(result.rawActions).toBeUndefined();
  });

  it('find with exclusion projection excludes selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{rawActions:0,rawReferences:0}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.id).toBe(taskId);
    expect(result.name).toBe('Task1-Name');
    expect(result.summary).toBe('Task1-Summary');
    expect(result.rawActions).toBeUndefined();
    expect(result.rawReferences).toBeUndefined();
  });

  it('find merges multiple projection arguments', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{name:1}',
      '{summary:1}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.name).toBe('Task1-Name');
    expect(result.summary).toBe('Task1-Summary');
    expect(result.id).toBeUndefined();
    expect(result.rawActions).toBeUndefined();
  });

  it('find throws on invalid forma ID', async () => {
    await expect(
      program.cmdDelegate.parseAsync([
        'node',
        'test',
        'find',
        'nonexistent',
      ]),
    ).rejects.toThrow(/Not found: nonexistent/);
  });

  it('find throws on invalid HJSON projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      program.cmdDelegate.parseAsync([
        'node',
        'test',
        'find',
        taskId,
        '{{{',
      ]),
    ).rejects.toThrow();
  });

  it('find rejects mixed inclusion/exclusion projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      program.cmdDelegate.parseAsync([
        'node',
        'test',
        'find',
        taskId,
        '{name:1,summary:0}',
      ]),
    ).rejects.toThrow(/Mixed projection not supported/);
  });

  it('find with dotted inclusion projection includes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{"name":1,"rawActions.name":1,"rawActions.status":1}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.name).toBe('Task1-Name');
    expect(result.summary).toBeUndefined();
    expect(result.rawActions).toBeTruthy();
    expect(Array.isArray(result.rawActions)).toBe(true);
    expect(result.rawActions[0].name).toBe('Action1-name');
    expect(result.rawActions[0].status).toBe('req');
    expect(result.rawActions[0].summary).toBeUndefined();
  });

  it('find with dotted exclusion projection excludes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{"rawActions.statusNote":0}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.name).toBe('Task1-Name');
    expect(result.rawActions).toBeTruthy();
    expect(result.rawActions[0].name).toBe('Action1-name');
    expect(result.rawActions[0].status).toBe('req');
    expect(
      Object.prototype.hasOwnProperty.call(
        result.rawActions[0],
        'statusNote',
      ),
    ).toBe(false);
  });

  it('find with multiple dotted paths', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{"id":1,"rawActions.id":1}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(result.id).toBe(taskId);
    expect(result.name).toBeUndefined();
    expect(result.rawActions[0].id).toBe('0PxVwGSx00tGyAPrFKqetW');
    expect(result.rawActions[0].name).toBeUndefined();
  });

  it('find with only dotted projection excludes other fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await program.cmdDelegate.parseAsync([
      'node',
      'test',
      'find',
      taskId,
      '{"rawActions.id":1}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const result = JSON.parse(output[0]);
    expect(
      Object.prototype.hasOwnProperty.call(result, 'rawActions'),
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(result, 'rawReferences'),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'name')).toBe(
      false,
    );
    expect(result.rawActions[0].id).toBe('0PxVwGSx00tGyAPrFKqetW');
    expect(
      Object.prototype.hasOwnProperty.call(result.rawActions[0], 'name'),
    ).toBe(false);
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
      'summary:"New Summary"',
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
