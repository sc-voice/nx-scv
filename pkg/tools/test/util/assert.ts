import { describe, it, expect } from '@sc-voice/vitest';
import { JS } from '../../index.mjs';
const { Assert } = JS;

describe('assert', () => {
  it('ok', () => {
    expect(Assert.ok('hello')).toBe('hello');
    expect(Assert.ok(true)).toBe(true);
    expect(Assert.ok(1 + 2)).toBe(3);
    expect(Assert.ok({ a: 1 })).toEqual({ a: 1 });
    let f = () => 'f';
    expect(Assert.ok(f)).toBe(f);
    let list = [];
    expect(Assert.ok(list)).toBe(list);

    let eCaught;
    try {
      Assert.ok(undefined, 'undefined?');
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toBe('undefined?');
    try {
      Assert.ok(null, 'null?');
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toBe('null?');
    try {
      Assert.ok(false, 'false?');
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toBe('false?');
    try {
      Assert.ok(0, '0?');
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toBe('0?');
    try {
      Assert.ok(Number('NaN'), 'NaN?');
    } catch (e) {
      eCaught = e;
    }
    expect(eCaught.message).toBe('NaN?');
  });
});
