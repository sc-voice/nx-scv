import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { World } from '../src/world.js';
import { Task } from '../src/task.js';
import { NfProgram } from '../src/nf-program.js';
import { createTempDir } from './cli/helpers.js';

describe('NfProgram', () => {
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
    program = new NfProgram(world);
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
