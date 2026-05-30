import { describe, it, expect } from '@sc-voice/vitest';
import { execSync } from 'child_process';
import { User } from '../src/user.js';
import UUID64 from '../src/uuid64.js';

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
