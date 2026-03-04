import { describe, it, expect } from '../index.mjs';

describe('function equality tester', () => {
  it('considers arrow functions with same source code equal', () => {
    const fn1 = () => 42;
    const fn2 = () => 42;

    expect(fn1).toEqual(fn2);
  });

  it('considers arrow functions with different source not equal', () => {
    const fn1 = () => 42;
    const fn2 = () => 43;

    try {
      expect(fn1).toEqual(fn2);
      throw new Error('Expected assertion to fail');
    } catch (e) {
      if (e.message === 'Expected assertion to fail') {
        throw e;
      }
      // Expected to throw
    }
  });

  it('compares arrow functions with parameters correctly', () => {
    const add1 = (a, b) => a + b;
    const add2 = (a, b) => a + b;

    expect(add1).toEqual(add2);
  });

  it('compares same function reference', () => {
    const fn = () => 42;
    const fnRef = fn;

    expect(fn).toEqual(fnRef);
  });

  it('function declarations with same body but different names are not equal', () => {
    function f1(a, b) {
      return a * b;
    }
    function f2(a, b) {
      return a * b;
    }

    try {
      expect(f1).toEqual(f2);
      throw new Error('Expected assertion to fail');
    } catch (e) {
      if (e.message === 'Expected assertion to fail') {
        throw e;
      }
      // Expected to throw - function names differ in toString()
    }
  });

  it('handles arrow functions with different formatting', () => {
    const fn1 = (x) => x * 2;
    const fn2 = (x)=>x*2;

    // Note: different formatting means different toString() output
    try {
      expect(fn1).toEqual(fn2);
      throw new Error('Expected assertion to fail');
    } catch (e) {
      if (e.message === 'Expected assertion to fail') {
        throw e;
      }
      // Expected to throw - formatting differences matter
    }
  });
});
