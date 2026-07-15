import path from 'path';
import os from 'os';
import { FileRepository } from './file-repository.js';

export class NfUrl {
  private input: string;
  private base: string;

  constructor(input: string, base: string = '~') {
    if (!['~', '/', '@'].includes(base)) {
      throw new Error(`Invalid base: ${base}. Must be one of: ~, /, @`);
    }
    this.input = input;
    this.base = base;
  }

  get uri(): string {
    // Check if input has an embedded base that differs from given base
    const embedded = this.parseEmbeddedBase(this.input);
    if (embedded && embedded.base !== this.base) {
      // Resolve using embedded base and express using given base
      const absolutePath = this.resolveWithBase(
        embedded.path,
        embedded.base,
      );
      const relPath = this.makePathRelativeToBase(absolutePath, this.base);
      const normalizedPath = relPath.startsWith('/')
        ? relPath
        : '/' + relPath;
      return `nf:${this.base}${normalizedPath}`;
    }

    // No embedded base or same base, use input as-is
    const normalizedInput = this.input.startsWith('/')
      ? this.input
      : '/' + this.input;
    return `nf:${this.base}${normalizedInput}`;
  }

  resolve(): string {
    // Check if input has an embedded base
    const embedded = this.parseEmbeddedBase(this.input);
    if (embedded && embedded.base !== this.base) {
      // Input has a different base, resolve it first then convert
      const absolutePath = this.resolveWithBase(
        embedded.path,
        embedded.base,
      );
      return this.convertPath(absolutePath, this.base);
    }

    // No embedded base or same base, resolve normally
    let basePath: string;
    if (this.base === '~') {
      basePath = os.homedir();
    } else if (this.base === '/') {
      basePath = '/';
    } else if (this.base === '@') {
      basePath = this.findWorldRoot();
    } else {
      throw new Error(`Unknown base: ${this.base}`);
    }

    const normalizedInput = this.input.startsWith('/')
      ? this.input.slice(1)
      : this.input;
    return path.resolve(basePath, normalizedInput);
  }

  private parseEmbeddedBase(
    input: string,
  ): { base: string; path: string } | null {
    // Check for "nf:BASE..." format
    if (input.startsWith('nf:')) {
      const rest = input.slice(3);
      for (const base of ['@', '~', '/']) {
        if (rest.startsWith(base)) {
          return { base, path: rest.slice(base.length) };
        }
      }
    }

    // Check for "BASE..." format (longest first to match @ before /)
    for (const base of ['@', '~', '/']) {
      if (input.startsWith(base)) {
        return { base, path: input.slice(base.length) };
      }
    }

    return null;
  }

  private resolveWithBase(inputPath: string, base: string): string {
    let basePath: string;

    if (base === '~') {
      basePath = os.homedir();
    } else if (base === '/') {
      basePath = '/';
    } else if (base === '@') {
      basePath = this.findWorldRoot();
    } else {
      throw new Error(`Unknown base: ${base}`);
    }

    const normalizedInput = inputPath.startsWith('/')
      ? inputPath.slice(1)
      : inputPath;
    return path.resolve(basePath, normalizedInput);
  }

  private convertPath(absolutePath: string, targetBase: string): string {
    // For resolve(), just return the absolute path
    return absolutePath;
  }

  private makePathRelativeToBase(
    absolutePath: string,
    base: string,
  ): string {
    if (base === '/') {
      return absolutePath;
    }

    if (base === '~') {
      const homeDir = os.homedir();
      if (absolutePath.startsWith(homeDir + '/')) {
        return absolutePath.slice(homeDir.length);
      }
      return absolutePath;
    }

    if (base === '@') {
      const worldRoot = this.findWorldRoot();
      if (absolutePath.startsWith(worldRoot + '/')) {
        return absolutePath.slice(worldRoot.length);
      }
      return absolutePath;
    }

    return absolutePath;
  }

  private findWorldRoot(): string {
    const worldPath = FileRepository.findWorld();
    if (!worldPath) {
      throw new Error('World root (.nameforma) not found');
    }
    return path.dirname(worldPath);
  }

  toString(): string {
    return this.uri;
  }
}
