import { describe, it, expect, beforeEach } from 'vitest';
import { NfUrl } from '../src/nf-url.js';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

describe('NfUrl', () => {
  describe('constructor', () => {
    it('accepts valid bases: ~, /, @', () => {
      expect(() => new NfUrl('path', '~')).not.toThrow();
      expect(() => new NfUrl('path', '/')).not.toThrow();
      expect(() => new NfUrl('path', '@')).not.toThrow();
    });

    it('rejects invalid base', () => {
      expect(() => new NfUrl('path', 'invalid')).toThrow(
        'Invalid base: invalid',
      );
    });

    it('defaults base to ~', () => {
      const url = new NfUrl('path');
      expect(url.uri).toBe('nf:~/path');
    });
  });

  describe('uri', () => {
    it('formats uri as nf:BASE/path', () => {
      expect(new NfUrl('src/file.ts', '~').uri).toBe('nf:~/src/file.ts');
      expect(new NfUrl('/absolute/path', '/').uri).toBe(
        'nf://absolute/path',
      );
      expect(new NfUrl('src/file.ts', '@').uri).toBe('nf:@/src/file.ts');
    });
  });

  describe('resolve', () => {
    it('resolves ~ to home directory', () => {
      const url = new NfUrl('myfile.txt', '~');
      expect(url.resolve()).toBe(path.join(os.homedir(), 'myfile.txt'));
    });

    it('resolves / to filesystem root', () => {
      const url = new NfUrl('etc/hosts', '/');
      expect(url.resolve()).toBe('/etc/hosts');
    });

    it('resolves @ to world root (parent of .nameforma)', () => {
      const url = new NfUrl('test/nf-url.ts', '@');
      const resolved = url.resolve();
      expect(resolved).toBe(__filename);
    });
  });

  describe('toString', () => {
    it('returns uri', () => {
      const url = new NfUrl('path/file.ts', '~');
      expect(url.toString()).toBe('nf:~/path/file.ts');
    });
  });

  describe('embedded base conversion', () => {
    it('converts @path to ~path', () => {
      const url = new NfUrl('@test/nf-url.ts', '~');
      expect(url.uri).toMatch(/nf:~.*\/pkg\/nameforma\/test\/nf-url\.ts/);
      expect(url.resolve()).toBe(__filename);
    });

    it('converts @path to /path', () => {
      const url = new NfUrl('@test/nf-url.ts', '/');
      const resolved = url.resolve();
      expect(resolved).toMatch(/test\/nf-url\.ts$/);
    });

    it('converts ~/path to @path', () => {
      const homeDir = os.homedir();
      const devPath = path.join(
        homeDir,
        'dev/nx-nameforma/pkg/nameforma/test/nf-url.ts',
      );
      const url = new NfUrl(
        '~dev/nx-nameforma/pkg/nameforma/test/nf-url.ts',
        '@',
      );
      expect(url.resolve()).toBe(devPath);
    });

    it('handles nf: prefix in input', () => {
      const url = new NfUrl('nf:@src/nf-url.ts', '~');
      expect(url.uri).toMatch(/nf:~.*\/pkg\/nameforma\/src\/nf-url\.ts/);
    });
  });
});
