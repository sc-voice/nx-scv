import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { mkdtempSync, writeFileSync, utimesSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { Command } from 'commander';
import ZuidCommand from '../../src/cli/cli-zuid.js';
import { nfTui } from '../../src/cli/nf-tui.js';
import { ZUID } from '../../src/zuid.js';

describe('ZuidCommand (nf zuid)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  /**
   * Run `nf zuid [args]` in a bare program: no world, so no world lookup.
   * @returns the lines written with nfTui.log and nfTui.error
   */
  async function runZuid(args: string[] = []): Promise<{
    logged: string[];
    errors: string[];
  }> {
    const logged: string[] = [];
    const errors: string[] = [];
    vi.spyOn(nfTui, 'log').mockImplementation((msg: unknown) => {
      logged.push(String(msg));
    });
    vi.spyOn(nfTui, 'error').mockImplementation((msg: unknown) => {
      errors.push(String(msg));
    });
    const program = new Command();
    ZuidCommand.registerCommand(program.command('zuid'), null as any);
    await program.parseAsync(['node', 'nf', 'zuid', ...args]);
    return { logged, errors };
  }

  describe('nf zuid (default)', () => {
    it('prints one 22-character ZUID with no hyphen', async () => {
      const { logged } = await runZuid();
      expect(logged).toHaveLength(1);
      expect(logged[0]).toMatch(/^[0-9A-Za-z_]{22}$/);
    });

    it('prints a ZUID that parses back to a valid UUIDv7', async () => {
      const [text] = (await runZuid()).logged;
      const z = ZUID.fromString(text);
      expect(z.toBuffer()[6] >> 4).toBe(7);
      expect(z.toBuffer()[8] >> 6).toBe(0b10);
    });

    it('prints a time within the current run', async () => {
      const before = Date.now();
      const [text] = (await runZuid()).logged;
      const after = Date.now();
      const { timestamp } = ZUID.fromString(text);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('nf zuid --time <prefix>', () => {
    it('prints the window start as ISO time and its resolution', async () => {
      const z = ZUID.create(Date.UTC(2026, 10, 9, 12, 0, 0, 500));
      const prefix = z.toString().slice(0, 8);
      const { logged } = await runZuid(['--time', prefix]);
      expect(logged).toHaveLength(2);
      expect(logged[0]).toBe(
        new Date(ZUID.timeRangeOf(prefix).start).toISOString(),
      );
      expect(logged[1]).toMatch(/^resolution: \d+\.\d{3}s$/);
    });

    it('the window contains the ZUID it came from', async () => {
      const z = ZUID.create(Date.UTC(2026, 10, 9, 12, 0, 0, 500));
      const text = z.toString();
      const { logged } = await runZuid(['--time', text.slice(0, 6)]);
      const start = Date.parse(logged[0]);
      const seconds = parseFloat(logged[1].replace(/^resolution: /, ''));
      expect(z.timestamp).toBeGreaterThanOrEqual(start);
      expect(z.timestamp).toBeLessThan(start + seconds * 1000);
    });

    it('6 characters report about 15 seconds of resolution', async () => {
      const prefix = ZUID.create().toString().slice(0, 6);
      const { logged } = await runZuid(['--time', prefix]);
      const seconds = parseFloat(logged[1].replace(/^resolution: /, ''));
      expect(seconds).toBeGreaterThanOrEqual(15);
      expect(seconds).toBeLessThanOrEqual(16);
    });

    it('accepts a full ZUID and uses its 11-character time block', async () => {
      const z = ZUID.create(Date.UTC(2026, 10, 9, 12, 0, 0, 500));
      const full = z.toString();
      const { logged } = await runZuid(['--time', full]);
      expect(logged[0]).toBe(
        new Date(ZUID.timeRangeOf(full.slice(0, 11)).start).toISOString(),
      );
      expect(logged[1]).toBe('resolution: 0.001s');
    });

    it('rejects more than one prefix and exits 1', async () => {
      const { logged, errors } = await runZuid(['--time', '07', '0Q']);
      expect(logged).toHaveLength(0);
      expect(errors[0]).toMatch(/Single ZUID prefix expected/);
      expect(process.exitCode).toBe(1);
    });

    it('rejects a prefix given without --time and exits 1', async () => {
      const { logged, errors } = await runZuid(['07']);
      expect(logged).toHaveLength(0);
      expect(errors[0]).toMatch(/require --time/);
      expect(process.exitCode).toBe(1);
    });

    it('uses only the leading OPB64 run of a prefix containing a hyphen', async () => {
      const { logged, errors } = await runZuid(['--time', '0Q71U-sX0']);
      expect(errors).toHaveLength(0);
      expect(logged).toHaveLength(2);
      expect(logged[1]).toMatch(/^resolution: /);
      expect(process.exitCode).not.toBe(1);
    });
  });
});

describe('nf zuid --file-mod <path>', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'nf-zuid-file-mod-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Run `nf zuid [args]` and collect what it writes. */
  async function run(
    args: string[],
  ): Promise<{ logged: string[]; errors: string[] }> {
    const logged: string[] = [];
    const errors: string[] = [];
    vi.spyOn(nfTui, 'log').mockImplementation((msg: unknown) =>
      logged.push(String(msg)),
    );
    vi.spyOn(nfTui, 'error').mockImplementation((msg: unknown) =>
      errors.push(String(msg)),
    );
    const program = new Command();
    ZuidCommand.registerCommand(program.command('zuid'), null as any);
    await program.parseAsync(['node', 'nf', 'zuid', ...args]);
    return { logged, errors };
  }

  it('prints the 11-character time block of the file mtime', async () => {
    const file = path.join(dir, 'mtime.txt');
    writeFileSync(file, 'x');
    const mtime = new Date(Date.UTC(2026, 10, 9, 12, 0, 0, 500));
    utimesSync(file, mtime, mtime);
    const { logged } = await run(['--file-mod', file]);
    expect(logged[0]).toBe(ZUID.create(mtime.getTime(), 0).timeId());
  });

  it('line 2 is a full ZUID: the mtime time with a name signature', async () => {
    const file = path.join(dir, 'package.json');
    writeFileSync(file, 'x');
    const mtime = new Date(Date.UTC(2026, 10, 9, 12, 0, 0, 500));
    utimesSync(file, mtime, mtime);
    const { logged } = await run(['--file-mod', file]);
    expect(logged).toHaveLength(2);
    expect(logged[1]).toBe(logged[0] + 'Apackagejso');
    expect(ZUID.fromString(logged[1]).timestamp).toBe(mtime.getTime());
  });

  it('nameSignature keeps the basename, drops punctuation, clips to 10', () => {
    const sig = ZuidCommand.nameSignature('/some/dir/package.json');
    const text = ZUID.create(0, 0, sig).toString();
    expect(text.slice(11)).toBe('Apackagejso');
  });

  it('nameSignature pads short names with 0', () => {
    const sig = ZuidCommand.nameSignature('a.txt');
    const text = ZUID.create(0, 0, sig).toString();
    expect(text.slice(11)).toBe('Aatxt000000');
  });

  it('is stable: the same file gives the same output every time', async () => {
    const file = path.join(dir, 'stable.txt');
    writeFileSync(file, 'x');
    const first = (await run(['--file-mod', file])).logged;
    const second = (await run(['--file-mod', file])).logged;
    expect(second).toEqual(first);
  });

  it('reports a missing file and exits 1', async () => {
    const { logged, errors } = await run([
      '--file-mod',
      path.join(dir, 'missing'),
    ]);
    expect(logged).toHaveLength(0);
    expect(errors[0]).toMatch(/ENOENT/);
    expect(process.exitCode).toBe(1);
  });
});
