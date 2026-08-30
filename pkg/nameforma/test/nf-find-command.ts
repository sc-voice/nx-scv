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
import {
  ZENO_1_ROW_TERSE,
  ZENO_8_ROWS,
  ZENO_MAX_ROWS,
  zenoStep,
} from '@sc-voice/nameforma/unstable';

const FIND = ['node', 'test', 'find'];

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

    await rootCmd.parseAsync([...FIND, '-j', taskId]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].id).toBe(taskId);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBe('Task1-Summary');
    expect(json[0].rawActions).toBeTruthy();
    expect(json[0].rawReferences).toBeTruthy();
  });

  it('find with inclusion projection returns only selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      '{name:1,summary:1}',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBe('Task1-Summary');
    expect(json[0].id).toBeUndefined();
    expect(json[0].rawActions).toBeUndefined();
  });

  it('find with exclusion projection excludes selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      '{rawActions:0,rawReferences:0}',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].id).toBe(taskId);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBe('Task1-Summary');
    expect(json[0].rawActions).toBeUndefined();
    expect(json[0].rawReferences).toBeUndefined();
  });

  it('find with projection option supports HJSON field syntax', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      '{name:1, summary:1}',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBe('Task1-Summary');
    expect(json[0].id).toBeUndefined();
    expect(json[0].rawActions).toBeUndefined();
  });

  it('find throws on invalid forma ID', async () => {
    await expect(
      rootCmd.parseAsync([...FIND, 'nonexistent']),
    ).rejects.toThrow(/Not found: nonexistent/);
  });

  it('find throws on invalid HJSON projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      rootCmd.parseAsync([...FIND, '-p', '{{{', taskId]),
    ).rejects.toThrow();
  });

  it('find rejects mixed inclusion/exclusion projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      rootCmd.parseAsync([...FIND, '-p', '{name:1,summary:0}', taskId]),
    ).rejects.toThrow(/Mixed projection not supported/);
  });

  it('find with dotted inclusion projection includes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      'name:1, rawActions.name:1, rawActions.status:1',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBeUndefined();
    expect(json[0].rawActions).toEqual('[…2]');
  });

  it('find with dotted exclusion projection excludes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      'rawActions.statusNote:0',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].rawActions).toBeTruthy();
    expect(json[0].rawActions).toEqual('[…2]');
  });

  it('find with multiple dotted paths', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      'id:1, rawActions.id:1',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].id).toBe(taskId);
    expect(json[0].name).toBeUndefined();
    expect(json[0].rawActions).toEqual('[…2]');
  });

  it('find with only dotted projection excludes other fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      'rawActions.id:1',
      taskId,
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    const r0 = json[0];
    expect(Object.prototype.hasOwnProperty.call(r0, 'rawActions')).toBe(
      true,
    );
    expect(Object.prototype.hasOwnProperty.call(r0, 'rawReferences')).toBe(
      false,
    );
    expect(Object.prototype.hasOwnProperty.call(r0, 'name')).toBe(false);
    expect(r0.rawActions).toBe('[…2]');
    expect(
      Object.prototype.hasOwnProperty.call(r0.rawActions[0], 'name'),
    ).toBe(false);
  });

  it('find with sift filter query returns array of matches', async () => {
    output = [];
    await rootCmd.parseAsync([...FIND, '-j', '{name:"Task1-Name"}']);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].name).toBe('Task1-Name');
  });

  it('find with sift filter query with no matches returns empty array', async () => {
    output = [];
    await rootCmd.parseAsync([...FIND, '-j', '{name:"NoTask"}']);

    expect(output.length).toBe(1);
    expect(output[0].trim()).toEqual('');
  });

  it('find with sift filter query and projection applies projection', async () => {
    output = [];
    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      '{name:1, summary:1}',
      '{name:"Task1-Name"}',
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBe('Task1-Summary');
    expect(json[0].id).toBeUndefined();
  });

  it('find with bare HJSON sift filter (no braces) returns array', async () => {
    output = [];
    await rootCmd.parseAsync([...FIND, '-j', 'name:"Task1-Name"']);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].name).toBe('Task1-Name');
  });

  it('find with sift filter query and dotted projection applies nested projection', async () => {
    output = [];
    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '-p',
      'rawActions.id:1',
      '{name:"Task1-Name"}',
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toBeGreaterThan(0);
    // Nested projection should include rawActions but exclude other fields
    expect(
      Object.prototype.hasOwnProperty.call(json[0], 'rawActions'),
    ).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(json[0], 'name')).toBe(
      false,
    );
    // rawActions should only have id field
    if (json[0].rawActions.length > 0) {
      expect(json[0].rawActions).toEqual('[…2]');
      expect(
        Object.prototype.hasOwnProperty.call(
          json[0].rawActions[0],
          'status',
        ),
      ).toBe(false);
    }
  });

  it('find deduplicates duplicate queries', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([...FIND, '-j', taskId, taskId]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].id).toBe(taskId);
  });

  it('find with --limit returns only specified number of results', async () => {
    await rootCmd.parseAsync([...FIND, '-j', '--rows', '1', 'task']);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
  });

  it('find with --limit across multiple queries respects global limit', async () => {
    await rootCmd.parseAsync([
      ...FIND,
      '-j',
      '--rows',
      '2',
      'task',
      'task',
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toBeLessThanOrEqual(2);
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
    await rootCmd.parseAsync([...FIND, '-j', 'focused']);
    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toBe(3);
    expect(json[0].id).toBe(task3.id.base64);
    expect(json[1].id).toBe(task2.id.base64);
    expect(json[2].id).toBe(task1Id);
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
    await rootCmd.parseAsync([...FIND, '-j', '--rows', '2', 'focused']);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json[0].id).toBe(task3.id.base64);
    expect(json[1].id).toBe(task2.id.base64);
  });

  it('find focused returns empty when nothing focused', async () => {
    // Ensure focus stack is empty
    while (world.focusManager.peek() !== null) {
      world.focusManager.unfocus();
    }

    output = [];
    await rootCmd.parseAsync([...FIND, '--json', 'focused']);

    expect(output.length).toEqual(1);
    expect(output[0].trim()).toEqual('');
  });
});

describe('NfFindCommand._validateParameters', () => {
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

  it('_validateParameters with empty options returns defaults', () => {
    const valid = nfFindCommand._validateParameters(['test'], {});
    expect(valid.projection).toEqual({});
    expect(valid.addZid).toBe(false);

    // TUI screen dimensions are normally determined from process.stdout.
    // During tests, process.stdout is not available, so 24x80 are used by default.
    expect(valid.tuiRows).toEqual(24);
    expect(valid.tuiColumns).toEqual(80);

    expect(valid.json).toBe(false);
    expect(valid.monoTable).toBe(true);
    expect(valid.addZid).toBe(false);
    expect(valid.rowZeno).toBe(ZENO_MAX_ROWS);
    expect(valid.rows).toBe(valid.tuiRows - 1);
    expect(valid.linesPerRow).toBe(1);
    expect(valid.maxKeys).toBe(0);
  });

  it('_validateParameters adjusts linesPerRow given rows', () => {
    const tuiRows = 24; // adjust to available display rows

    const v2 = nfFindCommand._validateParameters(['test'], {
      rows: 2,
      tuiRows,
    });
    expect(v2.rows).toBe(2);
    expect(v2.linesPerRow).toBe(
      Math.max(1, Math.floor((tuiRows - 1) / 2)),
    );
    expect(v2.maxKeys).toBe(0);

    const v5 = nfFindCommand._validateParameters(['test'], {
      rows: 5,
      tuiRows,
    });
    expect(v5.rows).toBe(5);
    expect(v5.linesPerRow).toBe(
      4, // Math.max(1, Math.floor((tuiRows - 1) / 5))
    );
    expect(v5.maxKeys).toBe(0);
  });

  it('_validateParameters adjusts rows given linesPerRow', () => {
    const tuiRows = 24; // adjust to available display rows

    const v1 = nfFindCommand._validateParameters(['test'], {
      tuiRows,
    });
    expect(v1.addZid).toBe(false);
    expect(v1.linesPerRow).toBe(1);
    expect(v1.maxKeys).toBe(0);
    expect(v1.rows).toBe(23); // max(1, floor((24 - 1) / 1)));

    const v2 = nfFindCommand._validateParameters(['test'], {
      linesPerRow: 2,
      tuiRows,
    });
    expect(v2.addZid).toBe(false);
    expect(v2.linesPerRow).toBe(2);
    expect(v2.maxKeys).toBe(0);
    expect(v2.rows).toBe(11); // max(1, floor((24 - 1) / 2)));

    const v2Zeno = nfFindCommand._validateParameters(['test'], {
      linesPerRow: 2,
      tuiRows,
      rowZeno: ZENO_8_ROWS, // affects maxKeys
    });
    expect(v2Zeno.addZid).toBe(false);
    expect(v2Zeno.rowZeno).toBe(ZENO_8_ROWS);
    expect(v2Zeno.linesPerRow).toBe(2);
    expect(v2Zeno.maxKeys).toBe(0);
    expect(v2Zeno.rows).toBe(11); // max(1, floor((tuiRows - 1) / 2)));

    const v5 = nfFindCommand._validateParameters(['test'], {
      linesPerRow: 5,
      tuiRows,
    });
    expect(v5.linesPerRow).toBe(5);
    expect(v5.maxKeys).toBe(0);
    expect(v5.rows).toBe(Math.max(1, Math.floor((tuiRows - 1) / 5)));
  });

  it('_validateParameters parses projection with inclusion values', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      project: '{name:1, summary:1}',
    });
    expect(parsed.projection).toEqual({ name: 1, summary: 1 });
  });

  it('_validateParameters parses projection with exclusion values', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      project: '{rawActions:0, rawReferences:0}',
    });
    expect(parsed.projection).toEqual({ rawActions: 0, rawReferences: 0 });
  });

  it('_validateParameters throws on mixed projection (0 and 1)', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], {
        project: '{name:1, summary:0}',
      });
    }).toThrow(/Mixed projection not supported/);
  });

  it('_validateParameters throws on non-positive linesPerRow', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], { linesPerRow: '0' });
    }).toThrow(/Expected positive integer/);

    expect(() => {
      nfFindCommand._validateParameters(['test'], { linesPerRow: '-5' });
    }).toThrow(/Expected positive integer/);
  });

  it('_validateParameters throws on invalid rows (non-integer)', () => {
    expect(() => {
      nfFindCommand._validateParameters(['test'], { rows: 'abc' });
    }).toThrow(/Invalid rows/);
  });

  it('_validateParameters sets addZid flag', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      zid: true,
    });
    expect(parsed.addZid).toBe(true);
  });

  it('_validateParameters: addZid forces fuzzyColumn to id', () => {
    const parsed = nfFindCommand._validateParameters(['test'], {
      zid: true,
      fuzzyId: 'customColumn',
    });
    expect(parsed.addZid).toBe(true);
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

  it('find focus resolves currently-focused entity', async () => {
    const focusedTaskId = '0P_48Nru00l9bnpQmdmx7W'; // sample data

    await rootCmd.parseAsync([...FIND, '--json', 'focus']);

    expect(output.length).toBe(1);
    const outJSON = JSON.parse(output[0]);
    expect(outJSON.id).toBe(focusedTaskId);
  });
});
