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
      '--rows',
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
      '--rows',
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
      '--rows',
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

  it('find with --zid applies cellValue to transform id column', async () => {
    const task1Id = '0PxVmryB00tGyAPrFKqetW';
    await world.upsertOne(Task, { name: 'Task-ZidTest' });

    const findCmd = program.findCommand;
    output = [];
    await findCmd.action([task1Id], {
      project: '{id:1,name:1}',
      zid: true,
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
});

describe('NfFindCommand._parseOptions', () => {
  let nfFindCommand: NfFindCommand;
  let world: World;
  let rootCmd: Command;
  let program: NfProgram;
  let tempDirObj: any;

  beforeEach(async () => {
    tempDirObj = createTempDir('nf-parseOptions-test');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    const tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = await FileRepository.worldFromPath(tempWorldPath);

    rootCmd = new Command();
    program = new NfProgram(rootCmd);
    program.initialize(world);

    nfFindCommand = program.findCommand;
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('_parseOptions with empty options returns defaults', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {});
    expect(parsed.projection).toEqual({});
    expect(parsed.fuzzyColumn).toBeUndefined();
    expect(parsed.addZid).toBe(false);
    expect(parsed.lines).toBe(7);
    expect(parsed.linesDetail).toBe(0);
    expect(parsed.rows).toBe(10); // CLI_DEFAULT_LIMIT
  });

  it('_parseOptions parses projection with inclusion values', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      project: '{name:1, summary:1}',
    });
    expect(parsed.projection).toEqual({ name: 1, summary: 1 });
  });

  it('_parseOptions parses projection with exclusion values', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      project: '{rawActions:0, rawReferences:0}',
    });
    expect(parsed.projection).toEqual({ rawActions: 0, rawReferences: 0 });
  });

  it('_parseOptions throws on mixed projection (0 and 1)', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], {
        project: '{name:1, summary:0}',
      });
    }).toThrow(/Mixed projection not supported/);
  });

  it('_parseOptions parses lines option', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      lines: '15',
    });
    expect(parsed.lines).toBe(15);
    expect(parsed.linesDetail).toBe(0);
  });

  it('_parseOptions parses lines with detail (lines@detail format)', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      lines: '10@0.5',
    });
    expect(parsed.lines).toBe(10);
    expect(parsed.linesDetail).toBe(0.5);
  });

  it('_parseOptions throws on non-positive lines', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], { lines: '0' });
    }).toThrow(/must be positive integer/);

    expect(() => {
      nfFindCommand._validateParameters(['test'], { lines: '-5' });
    }).toThrow(/must be positive integer/);
  });

  it('_parseOptions throws on invalid lines detail (out of 0-1 range)', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], { lines: '10@1.5' });
    }).toThrow(/must be 0-1/);

    expect(() => {
      nfFindCommand._validateParameters(['test'], { lines: '10@-0.1' });
    }).toThrow(/must be 0-1/);
  });

  it('_parseOptions parses limit option', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      rows: '25',
    });
    expect(parsed.rows).toBe(25);
  });

  it('_parseOptions throws on invalid rows (non-integer)', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], { rows: 'abc' });
    }).toThrow(/Invalid rows/);
  });

  it('_parseOptions sets addZid flag', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      zid: true,
    });
    expect(parsed.addZid).toBe(true);
    expect(parsed.fuzzyColumn).toBe('id');
  });

  it('_parseOptions: addZid forces fuzzyColumn to id', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      zid: true,
      fuzzyId: 'customColumn',
    });
    expect(parsed.addZid).toBe(true);
    expect(parsed.fuzzyColumn).toBe('id');
  });

  it('_parseOptions: fuzzyId without addZid is preserved', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      fuzzyId: 'customColumn',
    });
    expect(parsed.addZid).toBe(false);
    expect(parsed.fuzzyColumn).toBe('customColumn');
  });

  it('_parseOptions combines all options', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      project: '{id:1, name:1}',
      fuzzyId: 'id',
      lines: '20@0.8',
      rows: '50',
    });
    expect(parsed.projection).toEqual({ id: 1, name: 1 });
    expect(parsed.fuzzyColumn).toBe('id');
    expect(parsed.addZid).toBe(false);
    expect(parsed.lines).toBe(20);
    expect(parsed.linesDetail).toBe(0.8);
    expect(parsed.rows).toBe(50);
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
