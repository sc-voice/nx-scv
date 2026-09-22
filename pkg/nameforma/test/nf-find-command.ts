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
  ZENO_5_ROWS,
  ZENO_8_ROWS,
  ZENO_13_ROWS,
  ZENO_21_ROWS,
  ZENO_MAX_ROWS,
  zenoStep,
} from '@sc-voice/nameforma/unstable';
import { Zeno, type ZenoStep } from '@sc-voice/nameforma';
import { ZenoCoord } from '@sc-voice/nameforma';

const FIND = ['node', 'test', 'find'];
const FIND_K0 = [...FIND, '-k 0'];

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

  it('find without projection returns important fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([...FIND_K0, '-j', taskId]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].id).toBe(taskId);
    expect(json[0].name).toBe('Task1-Name');
    expect(json[0].summary).toBe('Task1-Summary');
  });

  it('find with inclusion projection returns only selected fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND_K0,
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
      ...FIND_K0,
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
      ...FIND_K0,
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
      rootCmd.parseAsync([...FIND_K0, 'nonexistent']),
    ).rejects.toThrow(/Not found: nonexistent/);
  });

  it('find throws on invalid HJSON projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      rootCmd.parseAsync([...FIND_K0, '-p', '{{{', taskId]),
    ).rejects.toThrow();
  });

  it('find rejects mixed inclusion/exclusion projection', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await expect(
      rootCmd.parseAsync([...FIND_K0, '-p', '{name:1,summary:0}', taskId]),
    ).rejects.toThrow(/Mixed projection not supported/);
  });

  it('find with dotted inclusion projection includes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND_K0,
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
    expect(json[0].rawActions).toMatch('[…2]');
  });

  it('find with dotted exclusion projection excludes nested fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND_K0,
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
    expect(json[0].rawActions).toMatch('[…2]');
  });

  it('find with multiple dotted paths', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND_K0,
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
    expect(json[0].rawActions).toMatch('[…2]');
  });

  it('find with only dotted projection excludes other fields', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    await rootCmd.parseAsync([
      ...FIND_K0,
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
    expect(r0.rawActions).toMatch('[…2]');
    expect(
      Object.prototype.hasOwnProperty.call(r0.rawActions[0], 'name'),
    ).toBe(false);
  });

  it('find with sift filter query returns array of matches', async () => {
    output = [];
    await rootCmd.parseAsync([...FIND_K0, '-j', '{name:"Task1-Name"}']);

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
    await rootCmd.parseAsync([...FIND_K0, '-j', '{name:"NoTask"}']);

    expect(output.length).toBe(1);
    expect(output[0].trim()).toEqual('');
  });

  it('find with sift filter query and projection applies projection', async () => {
    output = [];
    await rootCmd.parseAsync([
      ...FIND_K0,
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
    await rootCmd.parseAsync([...FIND_K0, '-j', 'name:"Task1-Name"']);

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
      '-k0',
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
      expect(json[0].rawActions).toMatch('[…2]');
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

    await rootCmd.parseAsync([...FIND_K0, '-j', taskId, taskId]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
    expect(json[0].id).toBe(taskId);
  });

  it('find with --limit returns only specified number of results', async () => {
    await rootCmd.parseAsync([...FIND_K0, '-j', '-r', '1', 'task']);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json.length).toEqual(1);
  });

  it('find with --limit across multiple queries respects global limit', async () => {
    await rootCmd.parseAsync([
      ...FIND_K0,
      '-j',
      '-r',
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
    await rootCmd.parseAsync([...FIND_K0, '-j', 'focused']);
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
    await rootCmd.parseAsync([...FIND_K0, '-j', '-r', '2', 'focused']);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    expect(json[0].id).toBe(task3.id.base64);
    expect(json[1].id).toBe(task2.id.base64);
  });

  it('find collection returns focused entities first, then non-focused', async () => {
    const task1Id = '0PxVmryB00tGyAPrFKqetW';
    const task1 = await world.loadFuzzy(Task, task1Id);
    const task2 = await world.upsertOne(Task, {
      name: 'Unfocused-Task-2',
    });
    const task3 = await world.upsertOne(Task, { name: 'Task-Focused-3' });

    // Focus task3 (most recent), then task1
    world.focusManager.focus(task1!.id);
    world.focusManager.focus(task3.id);

    output = [];
    await rootCmd.parseAsync([
      ...FIND_K0,
      '-j',
      '-p',
      'id:1,name:1',
      'task',
    ]);

    expect(output.length).toBe(1);
    const json = output[0]
      .trim()
      .split('\n')
      .filter((s) => s.trim())
      .map((s) => JSON.parse(s));

    // Focused entities should come first, in focus stack order (task3 then task1)
    expect(json[0].id).toBe(task3.id.base64); // top of focus stack
    expect(json[1].id).toBe(task1Id); // second in focus stack
    // task2 (unfocused) should come after focused tasks
    const task2Index = json.findIndex((j) => j.id === task2.id.base64);
    expect(task2Index).toBeGreaterThan(1);
  });

  it('find focused returns empty when nothing focused', async () => {
    // Ensure focus stack is empty
    while (world.focusManager.peek() !== null) {
      world.focusManager.unfocus();
    }

    output = [];
    await rootCmd.parseAsync([...FIND_K0, '--out-json', 'focused']);

    expect(output.length).toEqual(1);
    expect(output[0].trim()).toEqual('');
  });
});

describe('NfFindCommand._validateOpts', () => {
  let nfFindCommand: NfFindCommand;
  let world: World;
  let rootCmd: Command;
  let program: NfProgram;
  let tempDirObj: any;
  const TQ = ['ignored']; // test queries

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

  it('_parseFloatOption', () => {
    const opts = {
      string: '0.123',
      number: 0.456,
      double: 0.14,
      doubleStr: '.618',
      nan: 'notNumber',
      tooSmall: -1,
      tooBig: 2,
    };
    expect(nfFindCommand._parseFloatOption(opts, 'string')).toBe(0.123);
    expect(nfFindCommand._parseFloatOption(opts, 'number')).toBe(0.456);
    expect(nfFindCommand._parseFloatOption(opts, 'double')).toBe(0.14);
    expect(nfFindCommand._parseFloatOption(opts, 'doubleStr')).toBe(0.618);
    expect(nfFindCommand._parseFloatOption(opts, 'notThere', 0.5)).toBe(
      0.5,
    );

    expect(() => nfFindCommand._parseFloatOption(opts, 'nan')).toThrow(
      /Invalid nan: notNumber/,
    );
    expect(() =>
      nfFindCommand._parseFloatOption(opts, 'tooSmall'),
    ).toThrow(/Invalid tooSmall: -1 < 0/);
    expect(() => nfFindCommand._parseFloatOption(opts, 'tooBig')).toThrow(
      /Invalid tooBig: 2 > 1/,
    );
  });

  it('_parseInt', () => {
    const opts = {
      string: '123',
      number: 456,
      double: 3.14,
      doubleStr: '1.618',
      nan: 'notNumber',
      tooSmall: -1,
    };
    expect(nfFindCommand._parseInt(opts, 'string')).toBe(123);
    expect(nfFindCommand._parseInt(opts, 'number')).toBe(456);
    expect(nfFindCommand._parseInt(opts, 'double')).toBe(3); // truncate
    expect(nfFindCommand._parseInt(opts, 'doubleStr')).toBe(1); // truncate
    expect(() => nfFindCommand._parseInt(opts, 'nan')).toThrow(
      /Invalid nan: notNumber/,
    );
    expect(nfFindCommand._parseInt(opts, 'notThere', 789)).toBe(789);

    expect(() => nfFindCommand._parseInt(opts, 'nan')).toThrow(
      /Invalid nan: notNumber/,
    );
    expect(() => nfFindCommand._parseInt(opts, 'tooSmall')).toThrow(
      /Invalid tooSmall: -1 < 0/,
    );
  });

  it('_validateOpts defaults', () => {
    const valid = nfFindCommand._validateOpts(TQ, {});

    expect(valid.bgKeys).toBe(3);
    expect(valid.bgRowLines).toBe(1);
    expect(valid.detail).toEqual(0);
    expect(valid.fgKeys).toEqual(3);
    expect(valid.fgLines).toEqual(1);
    expect(valid.maxHeaders).toBe(3);
    expect(valid.monoTable).toBe(true);
    expect(valid.outJson).toBe(false);
    expect(valid.projection).toEqual({});
    expect(valid.rawBgKeys).toBe(undefined);
    expect(valid.rowLimit).toBe(valid.tuiHeight);

    // TUI screen dimensions are normally determined from process.stdout.
    // During tests, process.stdout is not available, so 24x80 are used by default.
    expect(valid.tuiHeight).toEqual(24);
    expect(valid.tuiWidth).toEqual(80);
  });

  it('_validateOpts calculates bgKeys', () => {
    const implicit1 = nfFindCommand._validateOpts(TQ, { detail: 0 });
    expect(implicit1.detail).toBe(0);
    expect(implicit1.bgKeys).toBe(3);

    const implicit2 = nfFindCommand._validateOpts(TQ, { detail: 0.5 });
    expect(implicit2.detail).toBe(0.5);
    expect(implicit2.bgKeys).toBe(3);

    const implicit3 = nfFindCommand._validateOpts(TQ, { detail: 1 });
    expect(implicit3.detail).toBe(1);
    expect(implicit3.bgKeys).toBe(3);
  });

  it('_validateOpts calculates bgRowLines', () => {
    // unaffected by: rowLimit, detail
    const rowLimit = 5;
    const detail = 0.5;
    const unaffected = nfFindCommand._validateOpts(TQ, {
      rowLimit,
      detail,
    });
    expect(unaffected.detail).toBe(detail);
    expect(unaffected.rowLimit).toBe(rowLimit);
    expect(unaffected.bgRowLines).toBe(1);

    // implicitly affected by: bgKeys, maxHeaders
    const bgKeys = 7;
    const maxHeaders = 3;
    const implicit = nfFindCommand._validateOpts(TQ, {
      bgKeys,
      maxHeaders,
    });
    expect(implicit.bgKeys).toBe(bgKeys);
    expect(implicit.maxHeaders).toBe(maxHeaders);
    expect(implicit.bgRowLines).toBe(bgKeys - maxHeaders + 1);

    // explicitly affected by: bgRowLines
    const bgRowLines = 3;
    const explicit = nfFindCommand._validateOpts(TQ, { bgRowLines });
    expect(explicit.bgRowLines).toBe(bgRowLines);
  });

  it('_validateOpts calculates rowLimit', () => {
    // Multi-line rows reduce the default # of displayable rows

    // implicitly affected by explicit bgRowLines
    const bgRowLines = 3;
    const implicit1a = nfFindCommand._validateOpts(TQ, { bgRowLines });
    expect(implicit1a.bgRowLines).toBe(bgRowLines);
    expect(implicit1a.rowLimit).toBe(7); // max(1, floor((24 - 1) / 2)));

    // implicitly affected by bgRowLines as F(bgKeys, maxHeaders)
    const bgKeys = 7;
    const maxHeaders = 2;
    const implicit2a = nfFindCommand._validateOpts(TQ, {
      bgKeys,
      maxHeaders,
    });
    expect(implicit2a.bgRowLines).toBe(6);
    expect(implicit2a.rowLimit).toBe(4);

    // implicitly affected by detail (more detail, fewer rows)
    const implicit3a = nfFindCommand._validateOpts(TQ, { detail: 0 });
    expect(implicit3a.detail).toBe(0);
    expect(implicit3a.rowLimit).toBe(24);
    const implicit3b = nfFindCommand._validateOpts(TQ, { detail: 0.25 });
    expect(implicit3b.detail).toBe(0.25);
    expect(implicit3b.rowLimit).toBe(23);
    const implicit3c = nfFindCommand._validateOpts(TQ, { detail: 0.5 });
    expect(implicit3c.detail).toBe(0.5);
    expect(implicit3c.rowLimit).toBe(21);
    const implicit3d = nfFindCommand._validateOpts(TQ, { detail: 0.75 });
    expect(implicit3d.detail).toBe(0.75);
    expect(implicit3d.rowLimit).toBe(15);
    const implicit3e = nfFindCommand._validateOpts(TQ, { detail: 1 });
    expect(implicit3e.detail).toBe(1);
    expect(implicit3e.rowLimit).toBe(1);

    // set value explicitly
    const rowLimit = 3;
    const explicit = nfFindCommand._validateOpts(TQ, { rowLimit });
    expect(explicit.rowLimit).toBe(rowLimit);
  });

  it('_validateOpts parses projection with inclusion values', () => {
    const parsed = nfFindCommand._validateOpts(TQ, {
      project: '{name:1, summary:1}',
    });
    expect(parsed.projection).toEqual({ name: 1, summary: 1 });
  });

  it('_validateOpts parses projection with exclusion values', () => {
    const parsed = nfFindCommand._validateOpts(TQ, {
      project: '{rawActions:0, rawReferences:0}',
    });
    expect(parsed.projection).toEqual({ rawActions: 0, rawReferences: 0 });
  });

  it('_validateOpts throws on mixed projection (0 and 1)', () => {
    expect(() => {
      nfFindCommand._validateOpts(TQ, {
        project: '{name:1, summary:0}',
      });
    }).toThrow(/Mixed projection not supported/);
  });

  it('_validateOpts throws on non-positive bgRowLines', () => {
    expect(() => {
      nfFindCommand._validateOpts(TQ, { bgRowLines: '0' });
    }).toThrow(/Invalid bgRowLines: 0 < 1/);

    expect(() => {
      nfFindCommand._validateOpts(TQ, { bgRowLines: '-5' });
    }).toThrow(/Invalid bgRowLines: -5 < 1/);
  });

  it('_validateOpts throws on invalid rowLimit (non-integer)', () => {
    expect(() => {
      nfFindCommand._validateOpts(TQ, { rowLimit: 'abc' });
    }).toThrow(/Invalid rowLimit/);
  });

  it('_validateOpts normalizes bare field names to inclusion format', () => {
    expect(
      nfFindCommand._validateOpts(TQ, { project: 'id' }).projection,
    ).toEqual({ id: 1 });
    expect(
      nfFindCommand._validateOpts(TQ, {
        project: 'id,name,summary',
      }).projection,
    ).toEqual({ id: 1, name: 1, summary: 1 });
    expect(
      nfFindCommand._validateOpts(TQ, {
        project: '_abc, xyz:1',
      }).projection,
    ).toEqual({ _abc: 1, xyz: 1 });
  });
}); // _validateOpts

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

    await rootCmd.parseAsync([...FIND_K0, '-j', 'focus']);

    expect(output.length).toBe(1);
    const outJSON = JSON.parse(output[0]);
    expect(outJSON.id).toBe(focusedTaskId);
  });
});
