import { describe, it, expect } from 'vitest';
import { GitCLI, defaultGitCLI } from '../src/git-cli.js';

export class MockGitCLI {
  readonly cwd: string;
  private configMap: Map<string, string> = new Map();
  private logMap: Map<string, string> = new Map();
  private mergeBaseMap: Map<string, string> = new Map();
  private mergeBaseFails = false;

  constructor(cwd: string = '/tmp/do-not-care') {
    this.cwd = cwd;
  }

  setConfig(key: string, value: string) {
    this.configMap.set(key, value);
  }

  setLog(args: string, value: string) {
    this.logMap.set(args, value);
  }

  setMergeBase(ref1: string, ref2: string, value: string) {
    this.mergeBaseMap.set(`${ref1}:${ref2}`, value);
  }

  setMergeBaseFails(fails: boolean) {
    this.mergeBaseFails = fails;
  }

  configGet(key: string): string {
    const value = this.configMap.get(key);
    if (value === undefined) {
      throw new Error(`Unexpected config key: ${key}`);
    }
    return value;
  }

  log(args: string): string {
    const value = this.logMap.get(args);
    if (value === undefined) {
      throw new Error(`Unexpected log args: ${args}`);
    }
    return value;
  }

  mergeBase(ref1: string, ref2: string): string {
    if (this.mergeBaseFails) {
      throw new Error(`merge-base failed: ${ref1} ${ref2}`);
    }
    const value = this.mergeBaseMap.get(`${ref1}:${ref2}`);
    if (value === undefined) {
      throw new Error(`Unexpected merge-base: ${ref1} ${ref2}`);
    }
    return value;
  }
}

describe('GitCLI', () => {
  it('instantiates', () => {
    const git = new GitCLI();
    expect(git).toBeDefined();
  });

  it('defaultGitCLI is defined', () => {
    expect(defaultGitCLI).toBeDefined();
  });
});

describe('MockGitCLI', () => {
  it('can be set up and used for config', () => {
    const mock = new MockGitCLI();
    mock.setConfig('user.name', 'Test User');
    expect(mock.configGet('user.name')).toBe('Test User');
  });

  it('can be set up and used for log', () => {
    const mock = new MockGitCLI();
    mock.setLog('-1 --format=%ai', '2025-05-31 10:00:00 -0700');
    expect(mock.log('-1 --format=%ai')).toBe('2025-05-31 10:00:00 -0700');
  });

  it('can be set up and used for mergeBase', () => {
    const mock = new MockGitCLI();
    mock.setMergeBase('HEAD', 'origin/HEAD', 'abc123');
    expect(mock.mergeBase('HEAD', 'origin/HEAD')).toBe('abc123');
  });

  it('throws on unexpected config', () => {
    const mock = new MockGitCLI();
    expect(() => mock.configGet('unknown')).toThrow('Unexpected config key');
  });

  it('throws on unexpected log', () => {
    const mock = new MockGitCLI();
    expect(() => mock.log('unknown')).toThrow('Unexpected log args');
  });

  it('throws on mergeBase failure when configured', () => {
    const mock = new MockGitCLI();
    mock.setMergeBaseFails(true);
    expect(() => mock.mergeBase('HEAD', 'origin/HEAD')).toThrow(
      'merge-base failed'
    );
  });
});
