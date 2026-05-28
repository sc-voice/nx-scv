import { describe, it, expect } from '@sc-voice/vitest';
import { execSync } from 'child_process';
import { User } from '../src/user.js';
import UUID64 from '../src/uuid64.js';

describe('IdCommand --git-observed', () => {
  it('--git-observed HEAD equals UUID64.forGitObserved(commit hash)', () => {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const uuidHead = UUID64.forGitObserved('HEAD');
    const uuidHash = UUID64.forGitObserved(hash);
    expect(uuidHead.validate()).toBe(true);
    expect(uuidHead.base64).toBe(uuidHash.base64);

    const uuid2 = UUID64.forGitObserved('HEAD');
    expect(uuid2.base64).toBe(uuidHead.base64);
  });
});

describe('IdCommand --user', () => {
  it('--user Alice signature', () => {
    const user = new User(undefined, 'Alice');
    const uuid = user.generateUUID64();
    expect(uuid.validate()).toBe(true);
    expect(uuid.getSignature()).toBe('EyKGOfSAlcNW');
  });

  it('--user alice signature', () => {
    const user = new User(undefined, 'alice');
    const uuid = user.generateUUID64();
    expect(uuid.validate()).toBe(true);
    expect(uuid.getSignature()).toBe('AzW6oNyalcNW');
  });
});
