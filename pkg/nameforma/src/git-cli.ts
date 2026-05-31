/**
 * Git CLI abstraction for executing git commands.
 * Provides an interface (IGitCLI) that can be mocked for testing,
 * allowing production code to use real git operations while tests
 * can inject mock implementations.
 */

import { execSync } from 'child_process';

/**
 * Interface for git operations. Allows decoupling from direct execSync calls.
 */
export interface IGitCLI {
  readonly cwd?: string;
  configGet(key: string): string;
  log(args: string): string;
  mergeBase(ref1: string, ref2: string): string;
}

/**
 * Real implementation of IGitCLI that executes git commands via execSync.
 * Each instance is bound to a specific working directory (cwd).
 *
 * @example
 * const git = new GitCLI('/path/to/repo');
 * const email = git.configGet('user.email');
 * const headCommit = git.log('-1 --format=%H');
 */
export class GitCLI implements IGitCLI {
  readonly cwd?: string;

  constructor(cwd?: string) {
    this.cwd = cwd;
  }

  /** Get git config value for given key
   * @param key Config key (e.g., 'user.email', 'user.name')
   * @returns Config value as string
   * @example
   * const git = new GitCLI();
   * const email = git.configGet('user.email');
   * const name = git.configGet('user.name');
   */
  configGet(key: string): string {
    return execSync(`git config ${key}`, {
      encoding: 'utf-8',
      ...(this.cwd ? { cwd: this.cwd } : {}),
    }).trim();
  }

  /** Execute git log with given arguments and return output
   * @param args Git log arguments (e.g., '-1', '-n 5 --oneline')
   * @returns Git log output as string
   * @example
   * const git = new GitCLI();
   * const lastCommit = git.log('-1 --format=%H');
   * const recentCommits = git.log('-10 --oneline');
   */
  log(args: string): string {
    return execSync(`git log ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(this.cwd ? { cwd: this.cwd } : {}),
    }).trim();
  }

  /** Find merge base (common ancestor) of two git refs
   * @param ref1 First git ref (branch, tag, or commit)
   * @param ref2 Second git ref (branch, tag, or commit)
   * @returns Commit hash of merge base
   * @example
   * const git = new GitCLI();
   * const ancestor = git.mergeBase('main', 'feature-branch');
   * const sinceMain = git.mergeBase('HEAD', 'origin/main');
   */
  mergeBase(ref1: string, ref2: string): string {
    return execSync(`git merge-base ${ref1} ${ref2}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(this.cwd ? { cwd: this.cwd } : {}),
    }).trim();
  }
}

export const defaultGitCLI: IGitCLI = new GitCLI();
