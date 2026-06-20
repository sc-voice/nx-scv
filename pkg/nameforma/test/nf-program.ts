import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
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

  beforeEach(() => {
    tempDirObj = createTempDir('nfprogram-init-test');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });
    world = World.fromPath(tempWorldPath);
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

  it('resolveWorld finds world by path', () => {
    const resolved = NfProgram.resolveWorld(tempWorldPath);
    expect(resolved).toBeInstanceOf(World);
  });
});


describe('NfProgram.setFieldValue', () => {
  let tempDirObj: any;
  let tempWorldPath: string;
  let world: World;
  let program: NfProgram;

  beforeEach(() => {
    tempDirObj = createTempDir('nf-program-test');

    // Copy sample .nameforma to temp directory
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    tempWorldPath = path.join(tempDirObj.tempDir, '.nameforma');

    // Recursively copy sample data
    fs.cpSync(samplePath, tempWorldPath, { recursive: true });

    world = World.fromPath(tempWorldPath);
    program = new NfProgram(new Command());
    program.initialize(world);
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('setFieldValue on top-level task', () => {
    // Load existing task from sample data
    const task = world.loadFuzzy(Task, '0PxVmryB00tGyAPrFKqetW');
    expect(task).toBeTruthy();

    // Set field value
    const updated = program.setFieldValue(task!.id.base64, 'summary', 'Updated summary');
    expect(updated.summary).toBe('Updated summary');

    // Verify persistence
    const reloaded = World.fromPath(tempWorldPath);
    const task2 = reloaded.loadFuzzy(Task, '0PxVmryB00tGyAPrFKqetW');
    expect(task2?.summary).toBe('Updated summary');
  });

  it('setFieldValue on nested action', () => {
    // Load task and focus it
    const task = world.loadFuzzy(Task, '0PxVmryB00tGyAPrFKqetW');
    expect(task).toBeTruthy();
    world.focusManager.focus(task!.id);

    // Set action field value
    const actionId = '0PxVwGSx00tGyAPrFKqetW';
    const updated = program.setFieldValue(actionId, 'summary', 'Updated action summary');
    expect(updated.summary).toBe('Updated action summary');

    // Persist and verify
    world.save();
    const reloaded = World.fromPath(tempWorldPath);
    const task2 = reloaded.loadFuzzy(Task, '0PxVmryB00tGyAPrFKqetW');
    const action = task2?.rawActions[0];
    expect(action?.summary).toBe('Updated action summary');
  });

  it('error on unknown forma ID', () => {
    expect(() => {
      program.setFieldValue('nonexistent', 'name', 'value');
    }).toThrow(/Not found: nonexistent/);
  });
});
