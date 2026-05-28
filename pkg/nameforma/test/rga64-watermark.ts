import { describe, it, expect } from '@sc-voice/vitest';
import RGA64Watermark from '../src/rga64-watermark.js';
import UUID64 from '../src/uuid64.js';

describe('RGA64Watermark', () => {
  it('update records a user UUID64 and returns true', () => {
    const wm = new RGA64Watermark();
    const uuid = UUID64.forGitObserved();
    const result = wm.update('alice@example.com', uuid);
    expect(result).toBe(true);
    expect(wm.watermarks['alice@example.com'].equals(uuid)).toBe(true);
  });

  it('minObservedTime returns the minimum timestamp', () => {
    const wm = new RGA64Watermark();
    const uuid1 = UUID64.forGitObserved('HEAD~2');
    const uuid2 = UUID64.forGitObserved('HEAD');
    const uuid3 = UUID64.forGitObserved('HEAD~1');

    wm.update('alice@example.com', uuid2);
    wm.update('bob@example.com', uuid1);
    wm.update('carol@example.com', uuid3);

    const expectedMin = Math.min(
      uuid1.getTimestamp(),
      uuid2.getTimestamp(),
      uuid3.getTimestamp(),
    );
    expect(wm.minObservedTime()).toBe(expectedMin);
  });

  it('minObservedTime returns 0 on empty watermarks', () => {
    const wm = new RGA64Watermark();
    expect(wm.minObservedTime()).toBe(0);
  });

  it('toJSON serializes watermarks to base64 strings', () => {
    const wm = new RGA64Watermark();
    const uuid1 = UUID64.forGitObserved();
    const uuid2 = UUID64.forGitObserved('HEAD~1');
    wm.update('alice@example.com', uuid1);
    wm.update('bob@example.com', uuid2);
    const json = wm.toJSON();
    expect(typeof json['alice@example.com']).toBe('string');
    expect(typeof json['bob@example.com']).toBe('string');
    expect(json['alice@example.com']).toBe(uuid1.base64);
    expect(json['bob@example.com']).toBe(uuid2.base64);
  });

  it('fromJSON deserializes base64 strings to watermarks', () => {
    const uuid1 = UUID64.forGitObserved();
    const uuid2 = UUID64.forGitObserved('HEAD~1');
    const data = {
      'alice@example.com': uuid1.base64,
      'bob@example.com': uuid2.base64,
    };
    const wm = RGA64Watermark.fromJSON(data);
    expect(wm.watermarks['alice@example.com'].equals(uuid1)).toBe(true);
    expect(wm.watermarks['bob@example.com'].equals(uuid2)).toBe(true);
  });

  it('round-trips through JSON', () => {
    const wm1 = new RGA64Watermark();
    const uuid1 = UUID64.forGitObserved('HEAD~1');
    const uuid2 = UUID64.forGitObserved();
    wm1.update('alice@example.com', uuid1);
    wm1.update('bob@example.com', uuid2);

    const json = wm1.toJSON();
    const wm2 = RGA64Watermark.fromJSON(json);

    expect(wm2.watermarks['alice@example.com'].equals(uuid1)).toBe(true);
    expect(wm2.watermarks['bob@example.com'].equals(uuid2)).toBe(true);
    expect(wm2.minObservedTime()).toBe(
      Math.min(uuid1.getTimestamp(), uuid2.getTimestamp()),
    );
  });

  it('fromJSON handles empty data', () => {
    const wm = RGA64Watermark.fromJSON();
    expect(wm.minObservedTime()).toBe(0);
  });

  it('update advances to newer UUID64 and returns true', () => {
    const wm = new RGA64Watermark();
    const uuid1 = UUID64.forGitObserved('HEAD~1');
    const uuid2 = UUID64.forGitObserved();
    const result1 = wm.update('alice@example.com', uuid1);
    const result2 = wm.update('alice@example.com', uuid2);
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(wm.watermarks['alice@example.com'].equals(uuid2)).toBe(true);
  });

  it('update rejects same UUID64 and returns false', () => {
    const wm = new RGA64Watermark();
    const uuid = UUID64.forGitObserved();
    const result1 = wm.update('alice@example.com', uuid);
    const result2 = wm.update('alice@example.com', uuid);
    expect(result1).toBe(true);
    expect(result2).toBe(false);
    expect(wm.watermarks['alice@example.com'].equals(uuid)).toBe(true);
  });

  it('update rejects older UUID64 (monotonicity) and returns false', () => {
    const wm = new RGA64Watermark();
    const uuid1 = UUID64.forGitObserved('HEAD~1');
    const uuid2 = UUID64.forGitObserved();
    const result1 = wm.update('alice@example.com', uuid2);
    const result2 = wm.update('alice@example.com', uuid1);
    expect(result1).toBe(true);
    expect(result2).toBe(false);
    expect(wm.watermarks['alice@example.com'].equals(uuid2)).toBe(true);
  });
});
