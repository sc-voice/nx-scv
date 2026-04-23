import { describe, it, expect } from '@sc-voice/vitest';
import { Readable, Writable } from 'stream';
import { confirm, confirmDelete } from '../../src/cli/confirm.js';

describe('CLI: confirm helpers', () => {
  describe('confirm()', () => {
    it('returns true when user types "yes"', async () => {
      const input = new Readable();
      const output = new Writable({ write: () => {} });

      // Simulate user typing "yes"
      input.push('yes\n');
      input.push(null);

      const result = await confirm('Delete? (yes/no) ', { input, output });

      expect(result).toBe(true);
    });

    it('returns true when user types "YES" (case insensitive)', async () => {
      const input = new Readable();
      const output = new Writable({ write: () => {} });

      input.push('YES\n');
      input.push(null);

      const result = await confirm('Delete? (yes/no) ', { input, output });

      expect(result).toBe(true);
    });

    it('returns false when user types "no"', async () => {
      const input = new Readable();
      const output = new Writable({ write: () => {} });

      input.push('no\n');
      input.push(null);

      const result = await confirm('Delete? (yes/no) ', { input, output });

      expect(result).toBe(false);
    });

    it('returns false when user types any non-"yes" response', async () => {
      const input = new Readable();
      const output = new Writable({ write: () => {} });

      input.push('maybe\n');
      input.push(null);

      const result = await confirm('Delete? (yes/no) ', { input, output });

      expect(result).toBe(false);
    });
  });

  describe('confirmDelete()', () => {
    it('displays entity id, name, and summary', async () => {
      const input = new Readable();
      const outputLines: string[] = [];
      const output = new Writable({
        write(chunk: string, encoding: string, callback: Function) {
          outputLines.push(chunk);
          callback();
        },
      });

      input.push('yes\n');
      input.push(null);

      const entity = {
        id: 'task-123',
        name: 'Test Task',
        summary: 'Test summary',
      };

      await confirmDelete(entity, { input, output });

      const outputText = outputLines.join('');
      expect(outputText).toContain('>>> Entity:  task-123');
      expect(outputText).toContain('>>> name:    Test Task');
      expect(outputText).toContain('>>> summary: Test summary');
    });

    it('displays entity without summary if not present', async () => {
      const input = new Readable();
      const outputLines: string[] = [];
      const output = new Writable({
        write(chunk: string, encoding: string, callback: Function) {
          outputLines.push(chunk);
          callback();
        },
      });

      input.push('yes\n');
      input.push(null);

      const entity = {
        id: 'task-456',
        name: 'Another Task',
      };

      await confirmDelete(entity, { input, output });

      const outputText = outputLines.join('');
      expect(outputText).toContain('>>> Entity:  task-456');
      expect(outputText).toContain('>>> name:    Another Task');
      expect(outputText).not.toContain('>>> summary:');
    });

    it('returns true when user confirms deletion', async () => {
      const input = new Readable();
      const output = new Writable({ write: () => {} });

      input.push('yes\n');
      input.push(null);

      const entity = {
        id: 'task-789',
        name: 'Delete Me',
      };

      const result = await confirmDelete(entity, { input, output });

      expect(result).toBe(true);
    });

    it('returns false when user rejects deletion', async () => {
      const input = new Readable();
      const output = new Writable({ write: () => {} });

      input.push('no\n');
      input.push(null);

      const entity = {
        id: 'task-999',
        name: 'Keep Me',
      };

      const result = await confirmDelete(entity, { input, output });

      expect(result).toBe(false);
    });
  });
});
