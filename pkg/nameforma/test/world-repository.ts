import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  FileRepository,
  World,
  WorldRepository,
} from '@sc-voice/nameforma';

describe('WorldRepository', () => {
  let tempDir: string;
  let worldPath: string;
  let repo: FileRepository;
  let worldRepo: WorldRepository;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-repo-'));
    worldPath = path.join(tempDir, '.nameforma');
    fs.mkdirSync(worldPath, { recursive: true });
    repo = await FileRepository.create(worldPath);
    worldRepo = new WorldRepository(worldPath);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('constructor throws if worldPath lacks .nameforma', () => {
    expect(() => new WorldRepository(tempDir)).toThrow(
      /invalid worldPath/,
    );
  });

  it('createWorld writes world.json and returns World', async () => {
    const world = await worldRepo.createWorld(repo);
    expect(world).toBeInstanceOf(World);
    expect(fs.existsSync(path.join(worldPath, 'world.json'))).toBe(true);
  });

  it('createWorld throws if world exists', async () => {
    await worldRepo.createWorld(repo);
    await expect(worldRepo.createWorld(repo)).rejects.toThrow(
      /World exists/,
    );
  });

  it('loadWorld returns World with the created id', async () => {
    const created = await worldRepo.createWorld(repo);
    const loaded = await worldRepo.loadWorld(repo);
    expect(loaded).toBeInstanceOf(World);
    expect(loaded.id.base64).toEqual(created.id.base64);
  });

  it('loadWorld throws if world not found', async () => {
    await expect(worldRepo.loadWorld(repo)).rejects.toThrow(
      /World not found/,
    );
  });

  it('worldFromPath creates world when missing', async () => {
    const world = await worldRepo.worldFromPath(repo);
    expect(world).toBeInstanceOf(World);
    expect(fs.existsSync(path.join(worldPath, 'world.json'))).toBe(true);
  });

  it('worldFromPath loads world when present', async () => {
    const created = await worldRepo.createWorld(repo);
    const world = await worldRepo.worldFromPath(repo);
    expect(world.id.base64).toEqual(created.id.base64);
  });
});
