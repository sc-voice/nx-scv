import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateParams, arg } from '../src/pi/nf-pi/tools/nf-tool.js';
import { FileRepository } from '../src/file-repository.js';
import { Task } from '../src/task.js';

describe('validateParams', () => {
  it('throws error when fuzzy_id is null for update-forma', () => {
    expect(() => {
      validateParams('update-forma', {
        fuzzy_id: null,
        mutations: { status: 'work' },
      });
    }).toThrow('Missing required parameters for update-forma: fuzzy_id');
  });

  it('throws error when mutations is undefined for update-forma', () => {
    expect(() => {
      validateParams('update-forma', {
        fuzzy_id: 'abc123',
      });
    }).toThrow('Missing required parameters for update-forma: mutations');
  });

  it('throws error when multiple params are missing', () => {
    expect(() => {
      validateParams('update-forma', {
        fuzzy_id: null,
        mutations: null,
      });
    }).toThrow(
      'Missing required parameters for update-forma: fuzzy_id, mutations',
    );
  });

  it('passes when all required params are provided', () => {
    expect(() => {
      validateParams('update-forma', {
        fuzzy_id: 'abc123',
        mutations: { status: 'work' },
      });
    }).not.toThrow();
  });

  it('throws error for unknown operation', () => {
    expect(() => {
      validateParams('unknown-op', {});
    }).toThrow('Unknown operation: unknown-op');
  });

  it('throws error when fuzzy_id is string "null"', () => {
    expect(() => {
      validateParams('update-forma', {
        fuzzy_id: 'null',
        mutations: { status: 'work' },
      });
    }).toThrow('Missing required parameters for update-forma: fuzzy_id');
  });
});

describe('arg() shell escaping', () => {
  it('wraps value in single quotes and escapes internal single quotes', () => {
    expect(arg("a 'b' c")).toBe(` 'a "b" c'`);
  });

  it('prevents bash injection with $', () => {
    expect(arg('$HOME')).toBe(" '$HOME'");
  });

  it('rejects command substitution syntax', () => {
    expect(() => {
      arg('$(rm EVIL /)');
    }).toThrow('Command substitution not allowed');
  });

  it('prevents bash injection with backticks', () => {
    expect(arg('`cat /etc/passwd`')).toBe(" '`cat /etc/passwd`'");
  });

  it('returns empty arg for null', () => {
    expect(arg(null)).toBe('');
  });

  it('returns empty arg for undefined', () => {
    expect(arg(undefined)).toBe('');
  });

  it('returns single-quoted empty string for empty string', () => {
    expect(arg('')).toBe(" ''");
  });

  it('preserves spaces and special characters literally', () => {
    expect(arg('hello world & other')).toBe(" 'hello world & other'");
  });

  it('handles multiple single quotes', () => {
    expect(arg("'a' 'b' 'c'")).toBe(` '"a" "b" "c"'`);
  });
});

describe('update-forma mutations apply correctly', () => {
  let tmpDir: string;
  let worldPath: string;
  let world: any;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-tool-test-'));
    worldPath = path.join(tmpDir, '.nameforma');
    const samplePath = path.join(__dirname, 'data/sample-task/.nameforma');
    fs.cpSync(samplePath, worldPath, { recursive: true });
    world = await FileRepository.worldFromPath(worldPath);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('update-forma with simple mutations persists changes', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';
    const task = await world.loadFuzzy(Task, taskId);
    const originalName = task!.name;

    const { Mutator } = await import('../src/mutator.js');
    const mutator = Mutator.fromJson({
      id: task!.id.base64,
      name: 'UpdatedName',
      summary: 'UpdatedSummary',
    });
    await world.mutate(taskId, mutator.commands);

    const reloaded = await world.loadFuzzy(Task, taskId);
    expect(reloaded?.name).toBe('UpdatedName');
    expect(reloaded?.summary).toBe('UpdatedSummary');

    const fresh = await FileRepository.worldFromPath(worldPath);
    const fromDisk = await fresh.loadFuzzy(Task, taskId);
    expect(fromDisk?.name).toBe('UpdatedName');
    expect(fromDisk?.summary).toBe('UpdatedSummary');
  });

  it('update-forma with MongoDB $set operator', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';
    const task = await world.loadFuzzy(Task, taskId);
    const originalSummary = task!.summary;

    const { Mutator } = await import('../src/mutator.js');
    const mutator = Mutator.fromJson({
      id: task!.id.base64,
      $set: { name: 'SetOperatorName' },
    });
    await world.mutate(taskId, mutator.commands);

    const updated = await world.loadFuzzy(Task, taskId);
    expect(updated?.name).toBe('SetOperatorName');

    const fresh = await FileRepository.worldFromPath(worldPath);
    const fromDisk = await fresh.loadFuzzy(Task, taskId);
    expect(fromDisk?.name).toBe('SetOperatorName');
  });

  it('update-forma persists multiple field mutations', async () => {
    const taskId = '0PxVmryB00tGyAPrFKqetW';

    const { Mutator } = await import('../src/mutator.js');
    const mutator = Mutator.fromJson({
      id: '0PxVmryB00tGyAPrFKqetW',
      name: 'FinalName',
      summary: 'FinalSummary',
    });
    await world.mutate(taskId, mutator.commands);

    const fresh = await FileRepository.worldFromPath(worldPath);
    const fromDisk = await fresh.loadFuzzy(Task, taskId);
    expect(fromDisk?.name).toBe('FinalName');
    expect(fromDisk?.summary).toBe('FinalSummary');
  });
});
