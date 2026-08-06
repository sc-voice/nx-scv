import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@sc-voice/vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Entity, UUID64, Schema } from '@sc-voice/nameforma';

class TestEntity extends Entity {
  static collection = 'testentity';

  static override get avroSchema(): Schema {
    return new Schema({
      name: 'TestEntity',
      namespace: this.AVRO_NAMESPACE,
      type: 'record',
      fields: [{ name: 'id', type: 'string' }],
    });
  }

  static fromJson(data: any) {
    return new TestEntity(data);
  }

  override name: string;

  constructor(cfg: Partial<TestEntity> = {}) {
    super(cfg);
    this.name = cfg.name || '';
  }
}

/**
 * Define contract tests for repository ordering.
 * Call this at the top level of a repository test file to register the test suite.
 * Tests that findAll() and findMany() return results in descending ID order
 * (newest first), regardless of backend implementation.
 *
 * Usage:
 * ```
 * const makeRepo = async (worldPath: string) => FileRepository.create(worldPath);
 * defineRepositoryContractTests('FileRepository', makeRepo);
 * ```
 */
export function defineRepositoryContractTests(
  name: string,
  makeRepo: (worldPath: string) => Promise<any>,
) {
  describe(`${name} contract: descending ID order`, () => {
    let repo: any;
    let tempDir: string;
    let worldPath: string;

    beforeEach(async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-contract-'));
      worldPath = path.join(tempDir, '.nameforma');
      fs.mkdirSync(worldPath, { recursive: true });
      repo = await makeRepo(worldPath);
      repo.entityRegistry.registerEntity(TestEntity);
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('findAll() empty collection', async () => {
      const results = await repo
        .findAll({ collection: 'testentity' })
        .toArray();
      expect(results).toHaveLength(0);
    });

    it('findAll() single entity', async () => {
      await repo.upsertOne(TestEntity, { name: 'entity1' });

      const results = await repo
        .findAll({ collection: 'testentity' })
        .toArray();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('entity1');
    });

    it('findAll() multiple entities descending order', async () => {
      await repo.upsertOne(TestEntity, { name: 'entity1' });
      await repo.upsertOne(TestEntity, { name: 'entity2' });
      await repo.upsertOne(TestEntity, { name: 'entity3' });

      const results = await repo
        .findAll({ collection: 'testentity' })
        .toArray();
      expect(results).toHaveLength(3);

      // Newest first
      expect(results[0].name).toBe('entity3');
      expect(results[1].name).toBe('entity2');
      expect(results[2].name).toBe('entity1');

      // IDs descending lexicographic
      const ids = results.map((e: any) => (e.id as UUID64).base64);
      for (let i = 0; i < ids.length - 1; i++) {
        expect(ids[i] > ids[i + 1]).toBe(true);
      }
    });

    it('findMany() descending order', async () => {
      await repo.upsertOne(TestEntity, { name: 'entity1' });
      await repo.upsertOne(TestEntity, { name: 'entity2' });

      const results = await repo.findMany(TestEntity).toArray();
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('entity2');
      expect(results[1].name).toBe('entity1');
    });

    it('findAll() with filter maintains order', async () => {
      await repo.upsertOne(TestEntity, { name: 'match' });
      await repo.upsertOne(TestEntity, { name: 'skip' });
      await repo.upsertOne(TestEntity, { name: 'match' });

      const results = await repo
        .findAll({ collection: 'testentity', name: 'match' })
        .toArray();
      expect(results).toHaveLength(2);

      const ids = results.map((e: any) => (e.id as UUID64).base64);
      expect(ids[0] > ids[1]).toBe(true);
    });

    it('findAll() limit preserves order', async () => {
      for (let i = 0; i < 3; i++) {
        await repo.upsertOne(TestEntity, { name: `entity${i}` });
      }

      const results = await repo
        .findAll({ collection: 'testentity' })
        .limit(2)
        .toArray();
      expect(results).toHaveLength(2);

      expect(results[0].name).toBe('entity2');
      expect(results[1].name).toBe('entity1');
    });
  });
}
