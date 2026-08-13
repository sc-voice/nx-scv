import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { FileRepository } from '../src/file-repository.js';
import { World } from '../src/world.js';
import { Task } from '../src/task.js';
import { NfProgram } from '../src/nf-program.js';
import { NfFindCommand } from '../src/nf-find-command.js';
import { createTempDir } from './cli/helpers.js';

describe('NfFindCommand.register', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let rootCmd: Command;
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

    rootCmd = new Command();
    program = new NfProgram(rootCmd);
    program.initialize(world);

    // Configure output to capture writes
    rootCmd.configureOutput({
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

    await rootCmd.parseAsync(['node', 'test', 'find', taskId]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.id).toBe(taskId);
    expect(r0.name).toBe('Task1-Name');
    expect(r0.summary).toBe('Task1-Summary');
    expect(r0.rawActions).toBeTruthy();
    expect(r0.rawReferences).toBeTruthy();
  });

  it('find with inclusion projection returns only selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      '{name:1,summary:1}',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.name).toBe('Task1-Name');
    expect(r0.summary).toBe('Task1-Summary');
    expect(r0.id).toBeUndefined();
    expect(r0.rawActions).toBeUndefined();
  });

  it('find with exclusion projection excludes selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      '{rawActions:0,rawReferences:0}',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.id).toBe(taskId);
    expect(r0.name).toBe('Task1-Name');
    expect(r0.summary).toBe('Task1-Summary');
    expect(r0.rawActions).toBeUndefined();
    expect(r0.rawReferences).toBeUndefined();
  });

  it('find with projection option supports HJSON field syntax', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      '{name:1, summary:1}',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.name).toBe('Task1-Name');
    expect(r0.summary).toBe('Task1-Summary');
    expect(r0.id).toBeUndefined();
    expect(r0.rawActions).toBeUndefined();
  });

  it('find throws on invalid forma ID', async () => {
    await expect(
      rootCmd.parseAsync(['node', 'test', 'find', 'nonexistent']),
    ).rejects.toThrow(/Not found: nonexistent/);
  });

  it('find throws on invalid HJSON projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      rootCmd.parseAsync(['node', 'test', 'find', '-p', '{{{', taskId]),
    ).rejects.toThrow();
  });

  it('find rejects mixed inclusion/exclusion projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      rootCmd.parseAsync([
        'node',
        'test',
        'find',
        '-p',
        '{name:1,summary:0}',
        taskId,
      ]),
    ).rejects.toThrow(/Mixed projection not supported/);
  });

  it('find with dotted inclusion projection includes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      'name:1, rawActions.name:1, rawActions.status:1',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.name).toBe('Task1-Name');
    expect(r0.summary).toBeUndefined();
    expect(r0.rawActions).toBeTruthy();
    expect(Array.isArray(r0.rawActions)).toBe(true);
    expect(r0.rawActions[0].name).toBe('Action1-name');
    expect(r0.rawActions[0].status).toBe('req');
    expect(r0.rawActions[0].summary).toBeUndefined();
  });

  it('find with dotted exclusion projection excludes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      'rawActions.statusNote:0',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.name).toBe('Task1-Name');
    expect(r0.rawActions).toBeTruthy();
    expect(r0.rawActions[0].name).toBe('Action1-name');
    expect(r0.rawActions[0].status).toBe('req');
    expect(
      Object.prototype.hasOwnProperty.call(r0.rawActions[0], 'statusNote'),
    ).toBe(false);
  });

  it('find with multiple dotted paths', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      'id:1, rawActions.id:1',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(r0.id).toBe(taskId);
    expect(r0.name).toBeUndefined();
    expect(r0.rawActions[0].id).toBe('0PxVwGSx00tGyAPrFKqetW');
    expect(r0.rawActions[0].name).toBeUndefined();
  });

  it('find with only dotted projection excludes other fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      'rawActions.id:1',
      taskId,
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    const r0 = results[0];
    expect(Object.prototype.hasOwnProperty.call(r0, 'rawActions')).toBe(
      true,
    );
    expect(Object.prototype.hasOwnProperty.call(r0, 'rawReferences')).toBe(
      false,
    );
    expect(Object.prototype.hasOwnProperty.call(r0, 'name')).toBe(false);
    expect(r0.rawActions[0].id).toBe('0PxVwGSx00tGyAPrFKqetW');
    expect(
      Object.prototype.hasOwnProperty.call(r0.rawActions[0], 'name'),
    ).toBe(false);
  });

  it('find with sift filter query returns array of matches', async () => {
    output = [];
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '{name:"Task1-Name"}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Task1-Name');
  });

  it('find with sift filter query with no matches returns empty array', async () => {
    output = [];
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '{name:"NonexistentTask"}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('find with sift filter query and projection applies projection', async () => {
    output = [];
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      '{name:1, summary:1}',
      '{name:"Task1-Name"}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Task1-Name');
    expect(results[0].summary).toBe('Task1-Summary');
    expect(results[0].id).toBeUndefined();
  });

  it('find with bare HJSON sift filter (no braces) returns array', async () => {
    output = [];
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      'name:"Task1-Name"',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Task1-Name');
  });

  it('find with sift filter query and dotted projection applies nested projection', async () => {
    output = [];
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '-p',
      'rawActions.id:1',
      '{name:"Task1-Name"}',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    // Nested projection should include rawActions but exclude other fields
    expect(
      Object.prototype.hasOwnProperty.call(results[0], 'rawActions'),
    ).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(results[0], 'name')).toBe(
      false,
    );
    // rawActions should only have id field
    if (results[0].rawActions.length > 0) {
      expect(results[0].rawActions[0].id).toBeTruthy();
      expect(
        Object.prototype.hasOwnProperty.call(
          results[0].rawActions[0],
          'status',
        ),
      ).toBe(false);
    }
  });

  it('find deduplicates duplicate queries', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync(['node', 'test', 'find', taskId, taskId]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
    expect(results[0].id).toBe(taskId);
  });

  it('find with --limit returns only specified number of results', async () => {
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '--limit',
      '1',
      'task',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(1);
  });

  it('find with --limit across multiple queries respects global limit', async () => {
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '--limit',
      '2',
      'task',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('find focused returns focused entities in stack order (most recent first)', async () => {
    const task1Id = '0PxVmryB00tGyAPrFKqetW';
    const task1 = await world.loadFuzzy(Task, task1Id);
    const task2 = await world.upsertOne(Task, { name: 'Task-2' });
    const task3 = await world.upsertOne(Task, { name: 'Task-3' });

    world.focusManager.focus(task1!.id);
    world.focusManager.focus(task2.id);
    world.focusManager.focus(task3.id);

    output = [];
    await rootCmd.parseAsync(['node', 'test', 'find', 'focused']);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
    expect(results[0].id).toBe(task3.id.base64);
    expect(results[1].id).toBe(task2.id.base64);
    expect(results[2].id).toBe(task1Id);
  });

  it('find focused with limit respects limit and stack order', async () => {
    const task1Id = '0PxVmryB00tGyAPrFKqetW';
    const task1 = await world.loadFuzzy(Task, task1Id);
    const task2 = await world.upsertOne(Task, { name: 'Task-Limit-2' });
    const task3 = await world.upsertOne(Task, { name: 'Task-Limit-3' });

    world.focusManager.focus(task1!.id);
    world.focusManager.focus(task2.id);
    world.focusManager.focus(task3.id);

    output = [];
    await rootCmd.parseAsync([
      'node',
      'test',
      'find',
      '--limit',
      '2',
      'focused',
    ]);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(results.length).toEqual(2);
    expect(results[0].id).toBe(task3.id.base64);
    expect(results[1].id).toBe(task2.id.base64);
  });

  it('find focused returns empty when nothing focused', async () => {
    // Ensure focus stack is empty
    while (world.focusManager.peek() !== null) {
      world.focusManager.unfocus();
    }

    output = [];
    await rootCmd.parseAsync(['node', 'test', 'find', 'focused']);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toEqual(0);
  });

  it('find with --fuzzy-id applies cellValue to transform id column', async () => {
    const task1Id = '0PxVmryB00tGyAPrFKqetW';
    await world.upsertOne(Task, { name: 'Task-FuzzyId-Test' });

    const findCmd = program.findCommand;
    output = [];
    await findCmd.action([task1Id], {
      project: '{id:1,name:1}',
      fuzzyId: 'id',
      tui: true,
      json: false,
    });

    expect(output.length).toBeGreaterThan(0);
    const formatted = output[0];
    expect(formatted).toBeTruthy();
    expect(formatted).toMatch(/[iI]d/);
    expect(formatted).toMatch(/[nN]ame/);
    const fuzzyId = world.mutableNamespace.fuzzyIdOf(task1Id);
    expect(formatted).toContain(fuzzyId);
    expect(formatted).not.toContain(task1Id);
  });

  it('find throws if --fuzzy-id column does not exist in projection', async () => {
    const task1Id = '0PxVmryB00tGyAPrFKqetW';

    const findCmd = program.findCommand;
    expect(
      findCmd.action([task1Id], {
        project: '{id:1,name:1}',
        fuzzyId: 'task',
        tui: true,
        json: false,
      }),
    ).rejects.toThrow(/fuzzyColumn "task" not found/);
  });

  it('find throws helpful error if no queries provided with fuzzy-id', async () => {
    const findCmd = program.findCommand;
    expect(
      findCmd.action([], {
        fuzzyId: 'task',
        project: '{id:1,name:1}',
        tui: true,
        json: false,
      }),
    ).rejects.toThrow(
      /A query is required: is 'task' a column or a query\?/,
    );
  });
});

describe('NfFindCommand.registerCommand with single-focus fixture', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let rootCmd: Command;
  let program: NfProgram;
  let output: string[];
  let errors: string[];

  beforeEach(async () => {
    tempDirObj = createTempDir('nf-program-single-focus-test');
    const samplePath = path.join(
      __dirname,
      'data/single-focus/.nameforma',
    );
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = await FileRepository.worldFromPath(tempWorldPath);

    output = [];
    errors = [];

    rootCmd = new Command();
    program = new NfProgram(rootCmd);
    program.initialize(world);

    rootCmd.configureOutput({
      writeOut: (str: string) => output.push(str),
      writeErr: (str: string) => errors.push(str),
    });

    program.registerFindCommand();
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('find focus resolves the single currently-focused entity (per addHelpText example)', async () => {
    const focusedTaskId = '0P_48Nru00l9bnpQmdmx7W';

    await rootCmd.parseAsync(['node', 'test', 'find', 'focus']);

    expect(output.length).toBeGreaterThan(0);
    const results = JSON.parse(output[0]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(focusedTaskId);
  });
});
