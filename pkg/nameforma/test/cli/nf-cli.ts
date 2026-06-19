import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { REPL, resolveWorld } from '../../src/cli/nf-cli.js';
import { World } from '@sc-voice/nameforma';
import { NfCLI, nfTui } from '@sc-voice/nameforma/unstable';
import { TestReplRenderer } from '../../src/cli/nf-tui.js';

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
  return NfCLI.exec(['-w', worldPath, ...args]);
}

beforeEach(() => {
  nfTui.clearAll();
});

describe('CLI.exec()', () => {
  it('should list tasks (empty world)', async () => {
    await exec('task', 'list');
    const out = nfTui.getChannel('stdout');
    expect(out.some((line) => line.includes('No tasks'))).toBe(true);
  });

  it('should add a task and report it', async () => {
    await exec('task', 'add', 'Test task');
    const out = nfTui.getChannel('stdout');
    expect(out.some((line) => line.includes('Test task'))).toBe(true);
  });

  it('should create new CLI instance per call', async () => {
    await exec('task', 'list');
    nfTui.clearAll();
    await exec('id', '-g', '3');
    const out = nfTui.getChannel('stdout');
    expect(out.length).toBeGreaterThan(0);
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
    console.log(
      `[nfTui stdout]: ${JSON.stringify(nfTui.getChannel('stdout'))}`,
    );
    console.log(
      `[nfTui watch]: ${JSON.stringify(nfTui.getChannel('watch'))}`,
    );
    console.log(
      `[nfTui stderr]: ${JSON.stringify(nfTui.getChannel('stderr'))}`,
    );
    expect(renderer.errorLines).toHaveLength(0);
  });
});
