import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileRepository, Task, UUID64 } from '@sc-voice/nameforma';

describe('FileRepository', () => {
  let tempDir: string;
  let worldPath: string;
  let repo: FileRepository;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-repo-'));
    worldPath = path.join(tempDir, '.nameforma');
    fs.mkdirSync(worldPath, { recursive: true });
    repo = new FileRepository(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('insertOne creates entity and persists to disk', async () => {
    const task = await repo.insertOne(Task, { name: 'test task' });
    expect(task.name).toBe('test task');

    const taskDir = path.join(worldPath, 'task');
    expect(fs.existsSync(taskDir)).toBe(true);

    const files = fs.readdirSync(taskDir);
    expect(files.length).toBe(1);
  });

  it('findOne({id}) retrieves persisted entity', async () => {
    const inserted = await repo.insertOne(Task, { name: 'test task' });
    const found = await repo.findOne(Task, { id: inserted.id.toString() });

    expect(found).not.toBeNull();
    expect(found?.name).toBe('test task');
  });

  it('findOne({id}) returns null for missing id', async () => {
    const found = await repo.findOne(Task, { id: 'nonexistent' });
    expect(found).toBeNull();
  });

  it('findOne throws on non-{id} filter', async () => {
    await expect(
      repo.findOne(Task, { name: 'foo' })
    ).rejects.toThrow(/only \{id\} filter supported/);
  });

  it('findMany({}) yields all entities of type', async () => {
    const t1 = await repo.insertOne(Task, { name: 'task1' });
    const t2 = await repo.insertOne(Task, { name: 'task2' });

    const results: any[] = [];
    for await (const task of repo.findMany(Task, {})) {
      results.push(task);
    }

    expect(results.length).toBe(2);
    expect(results.map(t => t.name).sort()).toEqual(['task1', 'task2']);
  });

  it('findMany({id}) yields single entity', async () => {
    const t1 = await repo.insertOne(Task, { name: 'task1' });
    const t2 = await repo.insertOne(Task, { name: 'task2' });

    const results: any[] = [];
    for await (const task of repo.findMany(Task, { id: t1.id.toString() })) {
      results.push(task);
    }

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('task1');
  });

  it('findMany throws on non-{} or {id} filter', async () => {
    const iter = repo.findMany(Task, { name: 'foo' });
    await expect(iter.next()).rejects.toThrow(/only \{\} or \{id\} filter supported/);
  });

  it('delete removes entity from disk', async () => {
    const task = await repo.insertOne(Task, { name: 'task' });
    await repo.delete('task', task.id.toString());

    const found = await repo.findOne(Task, { id: task.id.toString() });
    expect(found).toBeNull();
  });

  it('delete silently succeeds if entity does not exist', async () => {
    await expect(repo.delete('task', 'nonexistent')).resolves.toBeUndefined();
  });

  it('saveWorld throws', async () => {
    await expect(repo.saveWorld()).rejects.toThrow(/call World.save\(\) directly/);
  });
});
