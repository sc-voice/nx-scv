import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import HashCommand from '../../src/cli/cli-hash.js';

describe('HashCommand.hashFile', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'nf-hash-'));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('encodes SHA-256 of known content as OPB64 (sha256("abc"))', async () => {
    const file = path.join(dir, 'abc.txt');
    writeFileSync(file, 'abc');
    expect(await HashCommand.hashFile(file)).toBe(
      'kdWMluy1p-f1GK3UNQuY8x03OQEM5tgSj13_OV805Qq',
    );
  });

  it('hashes empty files', async () => {
    const file = path.join(dir, 'empty.txt');
    writeFileSync(file, '');
    // sha256("") = e3b0c442...b855
    expect(await HashCommand.hashFile(file)).toHaveLength(43);
  });

  it('rejects when the file does not exist', async () => {
    await expect(
      HashCommand.hashFile(path.join(dir, 'missing.txt')),
    ).rejects.toThrow(/ENOENT/);
  });
});
