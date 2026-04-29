import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CLI, REPL, resolveWorld } from '../../src/cli/nf-cli.js';
import { World } from '../../src/world.js';
import { nfTui, TestReplRenderer } from '../../src/cli/nf-tui.js';

let tmpDir: string;
let world: World;

let worldPath: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nameforma-test-'));
  worldPath = path.join(tmpDir, '.nameforma');
  world = World.fromPath(worldPath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function exec(...args: string[]) {
  return CLI.exec(['-w', worldPath, ...args]);
}

beforeEach(() => {
  nfTui.clearAll();
});

describe('CLI.exec()', () => {
  it('should list tasks (empty world)', async () => {
    await exec('task', 'list');
    const out = nfTui.getChannel('stdout');
    expect(out.some(line => line.includes('No tasks'))).toBe(true);
  });

  it('should add a task and report it', async () => {
    await exec('task', 'add', 'Test task');
    const out = nfTui.getChannel('stdout');
    expect(out.some(line => line.includes('Test task'))).toBe(true);
  });

  it('should create new CLI instance per call', async () => {
    await exec('task', 'list');
    nfTui.clearAll();
    await exec('id', '-g', '3');
    const out = nfTui.getChannel('stdout');
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('World.logCommand()', () => {
  beforeEach(() => {
    world.logCommand('test cmd 1', 'human');
  });

  it('should add entry to history', () => {
    world.logCommand('test cmd 2', 'agent');
    const history = world.history;
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].command).toBe('test cmd 2');
    expect(history[0].user).toBe('agent');
  });

  it('should trim to max 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      world.logCommand(`cmd ${i}`, 'human');
    }
    expect(world.history.length).toBeLessThanOrEqual(10);
  });

  it('should persist to world.json', () => {
    const worldPath = path.join(tmpDir, '.nameforma');
    const world1 = World.fromPath(worldPath);
    world1.logCommand('persist test', 'human');

    const world2 = World.fromPath(worldPath);
    const found = world2.history.some(h => h.command === 'persist test');
    expect(found).toBe(true);
  });
});

describe('nf binary', () => {
  it('should start without crashing', async () => {
    nfTui.clearAll();
    const renderer = new TestReplRenderer();
    renderer.feedLine('/quit');
    const testWorld = resolveWorld(worldPath);
    const repl = new REPL(testWorld, renderer);
    await repl.start();
    console.log(`[scrollLines]: ${JSON.stringify(renderer.scrollLines)}`);
    console.log(`[errorLines]: ${JSON.stringify(renderer.errorLines)}`);
    console.log(`[nfTui stdout]: ${JSON.stringify(nfTui.getChannel('stdout'))}`);
    console.log(`[nfTui watch]: ${JSON.stringify(nfTui.getChannel('watch'))}`);
    console.log(`[nfTui stderr]: ${JSON.stringify(nfTui.getChannel('stderr'))}`);
    expect(renderer.errorLines).toHaveLength(0);
  });
});
