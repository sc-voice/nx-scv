import { describe, it, expect } from 'vitest';
import { User } from '../src/user.js';
import UUID64 from '../src/uuid64.js';
import { MockGitCLI } from './git-cli.js';

describe('User', () => {
  const mockGit = new MockGitCLI();
  mockGit.setConfig('user.email', 'test@example.com');
  mockGit.setConfig('user.name', 'Test User');
  const expectedEmail = 'test@example.com';
  const expectedName = 'Test User';

  describe('constructor', () => {
    it('requires at least email or name', () => {
      expect(() => new User()).toThrow('User requires at least email or name');
    });

    it('allows email only', () => {
      const user = new User('test@example.com');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('');
    });

    it('allows name only', () => {
      const user = new User(undefined, 'Test User');
      expect(user.email).toBe('');
      expect(user.name).toBe('Test User');
    });
  });

  describe('fromGit', () => {
    it('reads git config', () => {
      const user = User.fromGit(process.cwd(), mockGit);
      expect(user.email).toBe(expectedEmail);
      expect(user.name).toBe(expectedName);
    });

    it('signature returns 12-char base64 string', () => {
      const user = User.fromGit(process.cwd(), mockGit);
      const sig = user.signature();
      expect(sig).toHaveLength(12);
      expect(/^[A-Za-z0-9+/_-]+$/).toBeTruthy();
    });

    it('generateUUID64 returns valid UUID64', () => {
      const user = User.fromGit(process.cwd(), mockGit);
      const uuid = user.generateUUID64();
      expect(uuid).toBeInstanceOf(UUID64);
      expect(UUID64.validate(uuid.base64)).toBe(true);
    });

    it('signature is stable for same user', () => {
      const user = User.fromGit(process.cwd(), mockGit);
      const sig1 = user.signature();
      const sig2 = user.signature();
      expect(sig1).toBe(sig2);
    });
  });

  describe('signature computation from name', () => {
    it('Claude', () => {
      const user = new User(undefined, 'Claude');
      expect(user.signature()).toBe('1XLN3vwCldNW');
    });

    it('Alice Toklas', () => {
      const user = new User(undefined, 'Alice Toklas');
      expect(user.signature()).toBe('qmFlx--ATkNW');
    });

    it('Alice B Toklas', () => {
      const user = new User(undefined, 'Alice B Toklas');
      expect(user.signature()).toBe('qhXzIUwABTNW');
    });

    it('Aia', () => {
      const user = new User(undefined, 'Aia');
      expect(user.signature()).toBe('kEAhv-wAiaNW');
    });

    it('Madonna', () => {
      const user = new User(undefined, 'Madonna');
      expect(user.signature()).toBe('6Puv6AAMdnNW');
    });

    it('Madona (different spelling)', () => {
      const user = new User(undefined, 'Madona');
      expect(user.signature()).toBe('0lboTyKMdnNW');
    });

    it('Bob Ao', () => {
      const user = new User(undefined, 'Bob Ao');
      expect(user.signature()).toBe('4nubk9OBAoNW');
    });

    it('Pi', () => {
      const user = new User(undefined, 'Pi');
      expect(user.signature()).toBe('JOUK7MWPi_NW');
    });

    it('alice (consistent across calls)', () => {
      const user1 = new User(undefined, 'alice');
      const user2 = new User(undefined, 'alice');
      expect(user1.signature()).toBe('AzW6oNyalcNW');
      expect(user2.signature()).toBe('AzW6oNyalcNW');
    });
  });

  describe('signature computation from email', () => {
    it('generateUUID64 creates different UUIDs with same signature', () => {
      const user = new User('alice@example.com', 'Alice');
      const uuid1 = user.generateUUID64();
      const uuid2 = user.generateUUID64();
      expect(uuid1.base64).not.toBe(uuid2.base64);
      expect(uuid1.getSignature()).toBe(uuid2.getSignature());
    });

    it('different users have different signatures', () => {
      const alice = new User('alice@example.com');
      const bob = new User('bob@example.com');
      expect(alice.signature()).not.toBe(bob.signature());
    });

    it('signature is consistent for same email', () => {
      const user1 = new User('alice@example.com', 'Alice');
      const user2 = new User('alice@example.com', 'Alice Smith');
      expect(user1.signature()).toBe(user2.signature());
    });

    it('email takes precedence over name for signature', () => {
      const user1 = new User('alice@example.com', 'Alice');
      const user2 = new User('alice@example.com', 'Bob');
      expect(user1.signature()).toBe(user2.signature());
    });

    it('i.alice@example.com and ialice@example.com are identical (sanitized)', () => {
      const user1 = new User('i.alice@example.com');
      const user2 = new User('ialice@example.com');
      expect(user1.signature()).toBe('tzB9Ic-ilcNW');
      expect(user2.signature()).toBe('tzB9Ic-ilcNW');
      expect(user1.signature()).toBe(user2.signature());
      expect(UUID64.validate(user1.generateUUID64().base64)).toBe(true);
    });
  });
});
