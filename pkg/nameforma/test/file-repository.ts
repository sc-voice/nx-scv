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
import { FileRepository, Task, UUID64, World } from '@sc-voice/nameforma';

describe('FileRepository', () => {
  let tempDir: string;
  let worldPath: string;
  let repo: FileRepository;

  async function create_t1_t2(worldPath: string) {
    const uuid1 = new UUID64();
    const t1 = await repo.upsertOne(Task, { name: 't1', id: uuid1 });
    await new Promise((r) => setTimeout(r, 10));

    const betweenDate = new Date();
    await new Promise((r) => setTimeout(r, 10));

    const uuid2 = new UUID64();
    const t2 = await repo.upsertOne(Task, { name: 't2', id: uuid2 });
    await new Promise((r) => setTimeout(r, 10));

    const filePath1 = path.join(worldPath, 'task', `${uuid1.base64}.json`);
    const mtime1 = fs.statSync(filePath1).mtimeMs;
    const filePath2 = path.join(worldPath, 'task', `${uuid2.base64}.json`);
    const mtime2 = fs.statSync(filePath2).mtimeMs;

    return { uuid1, uuid2, t1, t2, mtime1, mtime2, betweenDate };
  }

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-repo-'));
    worldPath = path.join(tempDir, '.nameforma');
    fs.mkdirSync(worldPath, { recursive: true });
    repo = await FileRepository.create(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('upsertOne creates entity and persists to disk', async () => {
    const task = await repo.upsertOne(Task, { name: 'test task' });
    expect(task.name).toBe('test task');

    const taskDir = path.join(worldPath, 'task');
    expect(fs.existsSync(taskDir)).toBe(true);

    const files = fs.readdirSync(taskDir);
    expect(files.length).toBe(1);
  });

  it('findOne({id}) retrieves persisted entity', async () => {
    const inserted = await repo.upsertOne(Task, { name: 'test task' });
    const found = await repo.findOne(Task, { id: inserted.id.toString() });

    expect(found).not.toBeNull();
    expect(found?.name).toBe('test task');
  });

  it('findOne({id}) returns null for missing id', async () => {
    const found = await repo.findOne(Task, { id: 'nonexistent' });
    expect(found).toBeNull();
  });

  it('findOne throws on non-{id} filter', async () => {
    await expect(repo.findOne(Task, { name: 'foo' })).rejects.toThrow(
      /only \{id\} filter supported/,
    );
  });

  it('findMany({}) yields all entities of type', async () => {
    const t1 = await repo.upsertOne(Task, { name: 'task1' });
    const t2 = await repo.upsertOne(Task, { name: 'task2' });

    const results: any[] = [];
    for await (const task of repo.findMany(Task, {})) {
      results.push(task);
    }

    expect(results.length).toBe(2);
    expect(results.map((t) => t.name).sort()).toEqual(['task1', 'task2']);
  });

  it('findMany({id}) yields single entity', async () => {
    const t1 = await repo.upsertOne(Task, { name: 'task1' });
    const t2 = await repo.upsertOne(Task, { name: 'task2' });

    const results: any[] = [];
    for await (const task of repo.findMany(Task, {
      id: t1.id.toString(),
    })) {
      results.push(task);
    }

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('task1');
  });

  it('findMany throws on non-{} or {id} filter', async () => {
    const iter = repo.findMany(Task, { name: 'foo' });
    await expect(iter.next()).rejects.toThrow(/unsupported filter/);
  });

  it('delete removes entity from disk', async () => {
    const task = await repo.upsertOne(Task, { name: 'task' });
    await repo.delete('task', task.id.toString());

    const found = await repo.findOne(Task, { id: task.id.toString() });
    expect(found).toBeNull();
  });

  it('delete silently succeeds if entity does not exist', async () => {
    await expect(
      repo.delete('task', 'nonexistent'),
    ).resolves.toBeUndefined();
  });

  it('saveWorld throws', async () => {
    const id = new UUID64();
    const world = new World(worldPath, repo, id);
    await repo.saveWorld(world);
    const world2 = await repo.loadWorld();
    expect(world2.id.base64).toEqual(world.id.base64);
  });

  describe('distinct()', () => {
    let uuid1: UUID64;
    let uuid2: UUID64;
    let t1: Task;
    let t2: Task;

    beforeEach(async () => {
      /*
      uuid1 = new UUID64();
      t1 = await repo.upsertOne(Task, { name: 't1', updateId: uuid1, });

      await new Promise(r => setTimeout(r, 10));
      uuid2 = new UUID64();
      t2 = await repo.upsertOne(Task, { name: 't2', updateId: uuid2, });
      */
    });

    it('throws if neither filter.collection nor filter.id is given', async () => {
      await expect(repo.distinct('id')).rejects.toThrow(
        /filter.collection or filter.id required/,
      );
    });

    it('returns [] when collection directory does not exist', async () => {
      const result = await repo.distinct('id', {
        collection: 'nonexistent',
      });
      expect(result).toEqual([]);
    });

    it('returns distinct ids and deduplicated names', async () => {
      const id1 = new UUID64();
      const task = Task.collection;
      const t1 = await repo.upsertOne(Task, { id: id1, name: 'name1' });
      const t2 = await repo.upsertOne(Task, { name: 'name2' });
      const t3 = await repo.upsertOne(Task, { name: 'name2' });

      const ids = await repo.distinct<string>('id', { collection: task });
      expect(ids).toHaveLength(3);
      expect(ids).toContain(id1.base64);
      expect(ids).toContain(t2.id.toString());
      expect(ids).toContain(t3.id.toString());

      // Access t1 by id
      const ids1a = await repo.distinct<string>('id', {
        id: id1.base64,
        collection: 'task',
      });
      expect(ids1a[0]).toBe(id1.base64);
      const ids1b = await repo.distinct<string>('id', { id: id1.base64 });
      expect(ids1b[0]).toBe(id1.base64);

      const names = await repo.distinct<string>('name', {
        collection: 'task',
      });
      expect(names).toHaveLength(2);
      expect(names).toContain('name1');
      expect(names).toContain('name2');
    });

    it('returns [] for things not there', async () => {
      const idNot = new UUID64().base64;
      const task = Task.collection;
      const t1 = await repo.upsertOne(Task, { name: 'name1' });

      expect(await repo.distinct<string>('id', { id: idNot })).toEqual([]);
      expect(
        await repo.distinct<string>('id', { id: idNot, collection: task }),
      ).toEqual([]);
      expect(
        await repo.distinct<string>('id', {
          id: idNot,
          collection: 'NoTask',
        }),
      ).toEqual([]);
      expect(
        await repo.distinct<string>('id', { collection: 'NoTask' }),
      ).toEqual([]);
    });

    it('returns non-id field for a matched id filter', async () => {
      const t1 = await repo.upsertOne(Task, { name: 'findme' });

      const names = await repo.distinct<string>('name', {
        id: t1.id.toString(),
      });
      expect(names).toEqual(['findme']);
    });

    it('updatedAt filter with betweenDate', async () => {
      const { betweenDate, uuid1, uuid2, t1, t2, mtime1, mtime2 } =
        await create_t1_t2(worldPath);
      const _bTime = betweenDate.getTime();
      const mDate1 = new Date(mtime1);
      const mDate2 = new Date(mtime2);
      const uDate1 = uuid1.toDate();
      const uTime1 = uDate1.getTime();
      const uDate2 = uuid2.toDate();
      const uTime2 = uDate2.getTime();
      console.log({ uTime1, mtime1, _bTime, uTime2, mtime2 });

      const query_gt = {
        collection: 'task',
        updatedAt: { $gt: betweenDate },
      };
      const names_gt = await repo.distinct<string>('name', query_gt);
      expect(names_gt).toEqual(['t2']);

      const query_lt = {
        collection: 'task',
        updatedAt: { $lt: betweenDate },
      };
      const names_lt = await repo.distinct<string>('name', query_lt);
      expect(names_lt).toEqual(['t1']);
    });
  });
});
