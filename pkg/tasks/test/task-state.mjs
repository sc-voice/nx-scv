import { describe, it, expect } from '@sc-voice/vitest';
import { TaskState } from '../src/task-state.mjs';

describe('TaskState', () => {
  it('should have correct raw values', () => {
    expect(TaskState.BLOCKED).toBe('blocked');
    expect(TaskState.ACTIVE).toBe('active');
    expect(TaskState.DONE).toBe('done');
    expect(TaskState.PENDING).toBe('pending');
  });
});
