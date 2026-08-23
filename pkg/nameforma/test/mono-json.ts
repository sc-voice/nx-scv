import { describe, it, expect } from '@sc-voice/vitest';
import {
  PlainTheme,
  MonoJSONBuilder,
  SimpleType,
} from '@sc-voice/nameforma/unstable';

const theme = new PlainTheme();

describe('mono-json', () => {
  describe('MonoJSONBuilder constructor', () => {
    it('uses default options', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.arrayDelimiter).toBe(',');
      expect(builder.overflowKey).toBe('…');
      expect(builder.maxKeys).toBe(5);
      expect(builder.maxOverflow).toBe(3);
      expect(builder.nArrayElements).toBe(0);
    });

    it('accepts custom ctor', () => {
      const builder = new MonoJSONBuilder({
        arrayDelimiter: '; ',
        overflowKey: '+',
        maxKeys: 7,
        maxOverflow: 5,
      });
      expect(builder.arrayDelimiter).toBe('; ');
      expect(builder.overflowKey).toBe('+');
      expect(builder.maxKeys).toBe(7);
      expect(builder.maxOverflow).toBe(5);
    });

    it('theme applies nfBoundary to overflowDelimiter', () => {
      const builder = new MonoJSONBuilder({ overflowDelimiter: '|' });
      // Theme wraps the delimiter, so it should be different from plain '|'
      expect(typeof builder.overflowDelimiter).toBe('string');
      expect(builder.overflowDelimiter).toBeDefined();
    });

    it('theme is stored', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.theme).toBeDefined();
      expect(builder.theme).toHaveProperty('nfBoundary');
    });
  });

  describe('MonoJSONBuilder.asSimpleType', () => {
    it('null returns null', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType(null)).toBe(null);
    });

    it('undefined returns undefined', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType(undefined)).toBeUndefined();
    });

    it('string returns string', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType('hello')).toBe('hello');
      expect(builder.asSimpleType('123')).toBe('123');
      expect(builder.asSimpleType('')).toBe('');
    });

    it('number returns number', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType(42)).toBe(42);
      expect(builder.asSimpleType(3.14)).toBe(3.14);
      expect(builder.asSimpleType(0)).toBe(0);
      expect(builder.asSimpleType(-5)).toBe(-5);
    });

    it('boolean returns boolean', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType(true)).toBe(true);
      expect(builder.asSimpleType(false)).toBe(false);
    });

    it('Date returns Date object', () => {
      const builder = new MonoJSONBuilder({});
      const date = new Date('2024-01-15T12:00:00Z');
      const result = builder.asSimpleType(date);
      expect(result).toBe(date);
      expect(result instanceof Date).toBe(true);
    });

    it('empty array returns empty string', () => {
      const builder = new MonoJSONBuilder({ arrayDelimiter: ',' });
      expect(builder.asSimpleType([])).toBe('');
    });

    it('array of primitives joins with default delimiter', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType([1, 2, 3])).toBe('1,2,3');
      expect(builder.asSimpleType(['a', 'b', 'c'])).toBe('a,b,c');
    });

    it('array respects custom arrayDelimiter', () => {
      const builder = new MonoJSONBuilder({ arrayDelimiter: '; ' });
      expect(builder.asSimpleType([1, 2, 3])).toBe('1; 2; 3');
      expect(builder.asSimpleType(['x', 'y', 'z'])).toBe('x; y; z');
    });

    it('array with mixed types', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType([1, 'two', true, null])).toBe(
        '1,two,true,',
      );
    });

    it('nested arrays flatten with multiple delimiters', () => {
      const builder = new MonoJSONBuilder({ arrayDelimiter: ',' });
      // Inner arrays are also joined
      const result = builder.asSimpleType([
        [1, 2],
        [3, 4],
      ]);
      expect(result).toBe('1,2,3,4');
    });

    it('array containing Dates joins Date toString()', () => {
      const builder = new MonoJSONBuilder({});
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-02T00:00:00Z');
      const result = builder.asSimpleType([date1, date2]);
      const expected = `${date1.toString()},${date2.toString()}`;
      expect(result).toBe(expected);
    });

    it('plain object converts to JSON string', () => {
      const builder = new MonoJSONBuilder({});
      const obj = { a: 1, b: 'test', 'x-y': 'XY' };
      const result = builder.asSimpleType(obj);
      expect(result).toBe('{a:1,b:"test","x-y":"XY"}');
    });

    it('nested object converts to JSON string', () => {
      const builder = new MonoJSONBuilder({});
      const obj = { a: 1, b: { c: 'X' } };
      const result = builder.asSimpleType(obj);
      expect(result).toBe('{a:1,b:{c:"X"}}');
    });

    it('Symbol is stringified', () => {
      const builder = new MonoJSONBuilder({});
      const sym = Symbol('test');
      // Symbol.for converts to JSON as undefined
      const result = builder.asSimpleType({ sym });
      expect(typeof result).toBe('string');
      expect(result).toContain('{');
    });

    it('returns SimpleType union', () => {
      const builder = new MonoJSONBuilder({});
      // Verify that the return type is SimpleType
      const results: SimpleType[] = [
        builder.asSimpleType('string'),
        builder.asSimpleType(42),
        builder.asSimpleType(true),
        builder.asSimpleType(null),
        builder.asSimpleType(undefined),
        builder.asSimpleType(new Date()),
        builder.asSimpleType([1, 2, 3]),
        builder.asSimpleType({}),
      ];
      expect(results.length).toBe(8);
    });
  });

  describe('MonoJSONBuilder.set', () => {
    it('handles maxKeys:1 with overflow', () => {
      const builder = new MonoJSONBuilder({
        theme,
        maxKeys: 1,
        maxOverflow: 2,
      });
      const result0 = builder.build();
      expect(result0).toEqual({});

      // No overflow
      builder.set('a', 1);
      const result1 = builder.build();
      expect(result1).toEqual({ a: 1 });

      // Overflow 1
      builder.set('b', 2);
      const result2 = builder.build();
      expect(result2).toEqual({ '…': 'a:1|b:2' });

      // Overflow 2
      builder.set('c', 3);
      const result3 = builder.build();
      expect(result3).toEqual({ '…': 'a:1|b:2|c:3' });

      // Clipped overflow
      builder.set('d', 4);
      const result4 = builder.build();
      expect(result4).toEqual({ '…': 'a:1|b:2|c:3' });
    });
    it('handles maxKeys:2 with overflow', () => {
      const builder = new MonoJSONBuilder({
        theme,
        maxKeys: 2,
        maxOverflow: 2,
      });
      const result0 = builder.build();
      expect(result0).toEqual({});

      // No overflow
      builder.set('a', 1);
      const result1 = builder.build();
      expect(result1).toEqual({ a: 1 });

      // No overflow
      builder.set('b', 2);
      const result2 = builder.build();
      expect(result2).toEqual({ a: 1, b: 2 });

      // Overflow 1
      builder.set('c', 3);
      const result3 = builder.build();
      expect(result3).toEqual({ a: 1, '…': 'b:2|c:3' });

      // Overflow 1
      builder.set('d', 4);
      const result4 = builder.build();
      expect(result4).toEqual({ a: 1, '…': 'b:2|c:3|d:4' });

      // Clipped overflow
      builder.set('e', 5);
      const result5 = builder.build();
      expect(result5).toEqual({ a: 1, '…': 'b:2|c:3|d:4' });
    });
    it('converts values using asSimpleType', () => {
      const builder = new MonoJSONBuilder({ maxKeys: 10 });
      const date = new Date('2024-01-15T12:00:00Z');
      builder.set('num', 42);
      builder.set('bool', true);
      builder.set('arr', [1, 2, 3]);
      builder.set('date', date);
      builder.set('null', null);
      builder.set('undef', undefined);
      builder.set('obj', { a: 1, b: 2, c: 3 });
      const result = builder.build();

      // array fields show length
      expect(result).toEqual({
        num: 42,
        bool: true,
        date,
        null: null,
        undef: undefined,
        'arr[3]': '1,2,3',
        obj: '{a:1,b:2,c:3}',
      });
      expect(builder.nArrayElements).toBe(3);
    });
    it('build() returns copy not reference', () => {
      const builder = new MonoJSONBuilder({});
      builder.set('key', 'value');
      const result1 = builder.build();
      const result2 = builder.build();
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
    it('nArrayElements counts array elements, ignores non-arrays', () => {
      const builder = new MonoJSONBuilder({ maxKeys: 10 });
      builder.set('num', 42);
      builder.set('arr1', [1, 2, 3]);
      expect(builder.nArrayElements).toBe(3);
      builder.set('str', 'hello');
      builder.set('arr2', [4, [5, 6]]);
      expect(builder.nArrayElements).toBe(5);
    });
  });

  describe('MonoJSONBuilder.fromSource', () => {
    it('auto-populates and allows decoration', () => {
      const builder = new MonoJSONBuilder({ maxKeys: 3 });

      const result1 = builder
        .fromSource({ name: 'test1', count: 42 })
        .set('extra', 'field1')
        .build();
      expect(result1).toEqual({
        name: 'test1',
        count: 42,
        extra: 'field1',
      });

      // A builder retains its configuration and can be re-used
      const result2 = builder
        .fromSource({ name: 'test2' })
        .set('extra', 'field2')
        .build();
      expect(result2).toEqual({ name: 'test2', extra: 'field2' });
    });
  });
});
