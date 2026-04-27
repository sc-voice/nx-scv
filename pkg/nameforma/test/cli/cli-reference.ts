import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import { execSync } from 'child_process';
import { NameForma } from '../../src/index.js';
import TaskCommand from '../../src/cli/cli-task.js';
import ReferenceCommand from '../../src/cli/cli-reference.js';
import { createTempWorld, createTestCmd } from './helpers.js';
import { World } from '../../src/world.js';

const { Task } = NameForma;

describe('CLI: reference command', () => {
  let program;
  let taskCmd;
  let referenceCmd;
  let testCmd;
  let output;
  let errors;
  let originalLog;
  let originalError;
  let tempWorld;

  beforeEach(() => {
    // Create isolated temp world
    tempWorld = createTempWorld('nameforma-reference-test');

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
    TaskCommand.registerCommand(taskCmd);

    referenceCmd = program.command('reference');
    ReferenceCommand.registerCommand(referenceCmd);

    // Create test command runner
    testCmd = createTestCmd(program, tempWorld.worldPath);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    tempWorld.cleanup();
  });

  it('reference list with no focused task', async () => {
    await testCmd('reference');

    expect(output[0]).toBe('No task is currently focused');
  });

  it('reference add with no focused task', async () => {
    try {
      await testCmd('reference', 'add', 'Test Reference');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/No task is currently focused/);
    }
  });

  it('reference add to focused task', async () => {
    // Create a task
    await testCmd('task', 'add', 'Test Task');

    // Extract task ID from output
    const taskAddOutput = output[0];
    const taskIdMatch = taskAddOutput.match(/✓ Task added: (\S+)/);
    expect(taskIdMatch).toBeTruthy();
    const taskId = taskIdMatch![1];

    // Focus the task
    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add a reference to the focused task
    output = [];
    await testCmd('reference', 'add', 'Test Reference');

    expect(output[0]).toMatch(/✓ Reference added/);
    expect(output[1]).toMatch(/Test Reference/);

    // Verify reference was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.references(world).items).toHaveLength(1);
    expect(task!.references(world).items[0].name).toBe('Test Reference');
  });

  it('reference add with summary', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add reference with summary as positional arg
    output = [];
    await testCmd('reference', 'add', 'Test Reference', 'This is a summary');

    expect(output[0]).toMatch(/✓ Reference added/);

    // Verify summary was saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.references(world).items).toHaveLength(1);
    expect(task!.references(world).items[0].summary).toBe('This is a summary');
  });

  it('reference add with relevance and source', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add reference with relevance and source
    output = [];
    await testCmd(
      'reference',
      'add',
      'GitHub Issue',
      '-r',
      '0.8',
      '--source',
      'https://github.com/issue/123',
    );

    expect(output[0]).toMatch(/✓ Reference added/);

    // Verify relevance and source were saved
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    expect(task!.references(world).items).toHaveLength(1);
    expect(task!.references(world).items[0].relevance).toBe(0.8);
    expect(task!.references(world).items[0].source).toBe(
      'https://github.com/issue/123',
    );
  });

  it('reference add default relevance is 0.5', async () => {
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    output = [];
    await testCmd('reference', 'add', 'Test Reference');

    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task!.references(world).items[0].relevance).toBe(0.5);
  });

  it('reference add with file path auto-sets source', async () => {
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Create a real file in the temp world root for the probe to find
    const { mkdirSync, writeFileSync } = await import('fs');
    mkdirSync(`${tempWorld.tempDir}/src`, { recursive: true });
    writeFileSync(`${tempWorld.tempDir}/src/myfile.ts`, '');

    output = [];
    await testCmd('reference', 'add', 'src/myfile.ts');

    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    const ref = task!.references(world).items[0];
    expect(ref.name).toBe('myfile.ts');
    expect(ref.source).toBe('nf:./src/myfile.ts');
  });

  it('reference add with invalid relevance', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Try to add reference with invalid relevance
    try {
      output = [];
      await testCmd('reference', 'add', 'Test Reference', '-r', '1.5');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/Relevance must be a number between 0 and 1/);
    }
  });

  it('reference list explicit command', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add references
    output = [];
    await testCmd('reference', 'add', 'Reference 1', '-r', '0.5');

    output = [];
    await testCmd('reference', 'add', 'Reference 2', '-r', '0.8');

    // List references
    output = [];
    await testCmd('reference', 'list');

    // Filter out empty strings from output array
    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[0]).toMatch(/References for/);
    expect(nonEmptyOutput[1]).toMatch(/1\. Reference 2/);
    expect(nonEmptyOutput[2]).toMatch(/0\.8/);
    expect(nonEmptyOutput[3]).toMatch(/2\. Reference 1/);
  });

  it('reference show by index', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add a reference
    output = [];
    await testCmd(
      'reference',
      'add',
      'Test Reference',
      'Test summary',
      '-r',
      '0.7',
    );

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Show reference by ID
    output = [];
    await testCmd('reference', 'show', referenceId);

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[1]).toMatch(/1\. Test Reference/);
    expect(nonEmptyOutput[2]).toMatch(/Test summary/);
    expect(nonEmptyOutput[3]).toMatch(/0\.7/);
  });

  it('reference json single reference', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add a reference
    output = [];
    await testCmd(
      'reference',
      'add',
      'Test Reference',
      'Test summary',
      '-r',
      '0.7',
      '--source',
      'https://example.com',
    );

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Get single reference as JSON
    output = [];
    await testCmd('reference', 'json', referenceId);
    const parsed = JSON.parse(output.join('\n'));
    expect(parsed.name).toBe('Test Reference');
    expect(parsed.summary).toBe('Test summary');
    expect(parsed.relevance).toBe(0.7);
    expect(parsed.source).toBe('https://example.com');
  });

  it('reference json all references', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add two references
    output = [];
    await testCmd('reference', 'add', 'Reference A', '-r', '0.5');

    output = [];
    await testCmd('reference', 'add', 'Reference B', '-r', '0.8');

    // Get all references as JSON array
    output = [];
    await testCmd('reference', 'json');
    const parsed = JSON.parse(output.join('\n'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    const names = parsed.map((r: any) => r.name);
    expect(names).toContain('Reference A');
    expect(names).toContain('Reference B');
  });

  it('reference set field value', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add a reference
    output = [];
    await testCmd('reference', 'add', 'Original Name', '-r', '0.5');

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Set name
    output = [];
    await testCmd('reference', 'set', `${referenceId}.name`, 'Updated Name');
    expect(output[0]).toMatch(/✓ Reference updated/);

    // Set summary
    output = [];
    await testCmd('reference', 'set', `${referenceId}.summary`, 'New summary');
    expect(output[0]).toMatch(/✓ Reference updated/);

    // Set relevance
    output = [];
    await testCmd('reference', 'set', `${referenceId}.relevance`, '0.9');
    expect(output[0]).toMatch(/✓ Reference updated/);

    // Set source
    output = [];
    await testCmd('reference', 'set', `${referenceId}.source`, 'https://new-source.com');

    // Verify all updates persisted
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    const ref = task!.references(world).items[0];
    expect(ref.name).toBe('Updated Name');
    expect(ref.summary).toBe('New summary');
    expect(ref.relevance).toBe(0.9);
    expect(ref.source).toBe('https://new-source.com');
  });

  it('reference json with unknown id throws error', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    try {
      output = [];
      await testCmd('reference', 'json', 'unknownId');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/Reference not found: unknownId/);
    }
  });

  it('reference set with invalid relevance', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add a reference
    output = [];
    await testCmd('reference', 'add', 'Test Reference');

    const referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const referenceId = referenceIdMatch![1];

    // Try to set invalid relevance
    try {
      output = [];
      await testCmd('reference', 'set', `${referenceId}.relevance`, '1.5');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toMatch(/Relevance must be a number between 0 and 1/);
    }
  });

  it('reference delete by index', async () => {
    // Create and focus a task
    await testCmd('task', 'add', 'Test Task');

    const taskIdMatch = output[0].match(/✓ Task added: (\S+)/);
    const taskId = taskIdMatch![1];

    output = [];
    { const w = World.fromPath(tempWorld.worldPath); const t = w.loadFuzzy(Task, taskId); w.focusForma(t); w.save(); }

    // Add references
    output = [];
    await testCmd('reference', 'add', 'Reference 1');

    let referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const ref1Id = referenceIdMatch![1];

    output = [];
    await testCmd('reference', 'add', 'Reference 2');

    referenceIdMatch = output[0].match(/✓ Reference added: (\S+)/);
    const ref2Id = referenceIdMatch![1];

    // Delete first reference
    output = [];
    await testCmd('reference', 'delete', ref1Id);

    const nonEmptyOutput = output.filter(line => line.trim());
    expect(nonEmptyOutput[0]).toMatch(/✓ Reference deleted/);
    expect(nonEmptyOutput[1]).toMatch(/Reference 1/);

    // Verify only one reference remains
    const world = World.fromPath(tempWorld.worldPath);
    const task = world.loadFuzzy(Task, taskId);
    expect(task).toBeTruthy();
    if (task) {
      expect(task.references(world).items).toHaveLength(1);
      expect(task.references(world).items[0].name).toBe('Reference 2');
    }
  });

  it('reference --help shows description and examples', () => {
    const output = execSync('npm run cli -- reference --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Manage references linking tasks\/actions to external resources/);
    expect(output).toMatch(/nf reference list/);
    expect(output).toMatch(/nf ref add/);
    expect(output).toMatch(/nf ref json/);
    expect(output).toMatch(/nf ref set/);
    expect(output).toMatch(/nf ref delete/);
  });

  it('reference add --help shows description and examples', () => {
    const output = execSync('npm run cli -- reference add --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Add a reference to the focused task/);
    expect(output).toMatch(/External issue/);
    expect(output).toMatch(/Design doc/);
  });

  it('reference json --help shows description and examples', () => {
    const output = execSync('npm run cli -- reference json --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Output reference\(s\) as JSON/);
    expect(output).toMatch(/nf ref json REF_ID/);
    expect(output).toMatch(/nf ref json/);
  });

  it('reference set --help shows description and examples', () => {
    const output = execSync('npm run cli -- reference set --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toMatch(/Set a reference field/);
    expect(output).toMatch(/nf ref set REF_ID.name/);
    expect(output).toMatch(/nf ref set REF_ID.summary/);
    expect(output).toMatch(/nf ref set REF_ID.relevance/);
    expect(output).toMatch(/nf ref set REF_ID.source/);
  });

});
