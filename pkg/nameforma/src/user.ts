import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import UUID64 from './uuid64.js';

export class User {
  readonly email: string;
  readonly name: string;
  #signature?: string;

  constructor(email?: string, name?: string) {
    if (!email && !name) {
      throw new Error('User requires at least email or name');
    }
    this.email = email || '';
    this.name = name || '';
  }

  private static userAbbreviation(user: string): string {
    const VOWELS = new Set('aeiouAEIOU');
    const trimmed = user.trim();

    if (trimmed.length <= 3) {
      return trimmed.padEnd(3, '_');
    }

    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 3) {
      return words.map((w) => w[0]).join('');
    }

    const first = words[0][0];

    if (words.length === 1) {
      // Single word: first letter + consonants from rest
      const source = words[0].substring(1);
      const result: string[] = [];
      let lastConsonantPos = -1;

      for (let i = 0; i < source.length && result.length < 2; i++) {
        if (!VOWELS.has(source[i])) {
          result.push(source[i]);
          lastConsonantPos = i;
        }
      }

      for (
        let i = lastConsonantPos + 1;
        i < source.length && result.length < 2;
        i++
      ) {
        result.push(source[i]);
      }

      return first + result.join('').padEnd(2, '_');
    }

    // Multiple words: first (first name) + last name (or abbrev if long)
    const lastName = words[words.length - 1];

    if (lastName.length <= 2) {
      // Short last name: use it as-is
      return first + lastName.padEnd(2, '_');
    }

    // Long last name: first letter + one consonant
    const last = lastName[0];
    const source = lastName.substring(1);
    const result: string[] = [];
    let found = 0;

    for (let i = 0; i < source.length && found < 1; i++) {
      if (!VOWELS.has(source[i])) {
        result.push(source[i]);
        found++;
      }
    }

    return first + last + result.join('').padEnd(1, '_');
  }

  private computeSignature(): string {
    const identifier = this.email || this.name;
    const sanitized = identifier.replace(/[^a-zA-Z0-9\s@]/g, '');
    const abbrev = User.userAbbreviation(sanitized);
    const hashBytes = createHash('sha256').update(sanitized).digest();
    const hashOPB64 = UUID64.toOrderPreservingBase64(hashBytes);
    const hashChars = hashOPB64.substring(0, 7);
    return hashChars + abbrev + 'NW';
  }

  static fromGit(gitDir: string): User {
    let current = gitDir;
    while (current !== '/') {
      const gitPath = join(current, '.git');
      if (existsSync(gitPath)) {
        gitDir = current;
        break;
      }
      current = join(current, '..');
    }
    const gitPath = join(gitDir, '.git');
    if (!existsSync(gitPath)) {
      throw new Error(`Not a git repository: ${gitDir}`);
    }

    try {
      const email = execSync('git config user.email', {
        encoding: 'utf-8',
        cwd: gitDir,
      }).trim();

      const name = execSync('git config user.name', {
        encoding: 'utf-8',
        cwd: gitDir,
      }).trim();

      return new User(email, name);
    } catch (err) {
      throw new Error(`Failed to read git config from ${gitDir}`);
    }
  }

  generateUUID64(): UUID64 {
    if (this.#signature == null) {
      this.#signature = this.computeSignature();
    }
    return UUID64.forSignature(this.#signature);
  }

  signature(): string {
    if (this.#signature == null) {
      this.#signature = this.computeSignature();
    }
    return this.#signature;
  }

  static readonly UNKNOWN = new User('UNKNOWN@example.com', 'Unknown');
}
