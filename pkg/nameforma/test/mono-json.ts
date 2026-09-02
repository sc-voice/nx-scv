import { describe, it, expect } from '@sc-voice/vitest';
import {
  FuzzyNamespace,
  MonoJSONBuilder,
  SimpleType,
  NameFormaTheme,
  zenoStep,
  ZENO_2_ROWS,
  ZENO_MAX_ROWS,
} from '@sc-voice/nameforma/unstable';
import { UUID64, Forma, Task, Action } from '@sc-voice/nameforma';

describe('mono-json', () => {
  describe('MonoJSONBuilder constructor', () => {
    it('uses default options', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.arrayDelimiter).toBe(',');
      expect(builder.maxKeys).toBe(0);
      expect(builder.nArrayElements).toBe(0);
      expect(builder.zeno).toBe(ZENO_MAX_ROWS);
      expect(builder.zidSource).toBe('id');
      expect(builder.namespace).toBeUndefined();
    });

    it('accepts custom ctor', () => {
      const namespace = new FuzzyNamespace();
      const builder = new MonoJSONBuilder({
        arrayDelimiter: '; ',
        maxKeys: 7,
        zeno: ZENO_2_ROWS,
        zidSource: 'uuid',
        namespace,
      });
      expect(builder.arrayDelimiter).toBe('; ');
      expect(builder.maxKeys).toBe(7);
      expect(builder.zeno).toBe(ZENO_2_ROWS);
      expect(builder.zidSource).toBe('uuid');
      expect(builder.namespace).toBe(namespace);
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
      expect(builder.asSimpleType([])).toBe('[…0]');
    });

    it('array of primitives joins with default delimiter', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType(['a', 'b', 'c'])).toBe('[…3]');
    });

    it('array with mixed types', () => {
      const builder = new MonoJSONBuilder({});
      expect(builder.asSimpleType([1, 'two', true, null])).toBe('[…4]');
    });

    it('nested arrays flatten with multiple delimiters', () => {
      const builder = new MonoJSONBuilder({ arrayDelimiter: ',' });
      // Inner arrays are also joined
      const result = builder.asSimpleType([
        [1, 2],
        [3, 4],
      ]);
      expect(result).toBe('[…2]');
    });

    it('array containing Dates joins Date toString()', () => {
      const builder = new MonoJSONBuilder({});
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-02T00:00:00Z');
      const result = builder.asSimpleType([date1, date2]);
      expect(result).toBe('[…2]');
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

  describe('MonoJSONBuilder.addKeyValue', () => {
    it('converts values using asSimpleType', () => {
      const builder = new MonoJSONBuilder({ maxKeys: 10 });
      const date = new Date('2024-01-15T12:00:00Z');
      builder.addKeyValue('num', 42);
      builder.addKeyValue('bool', true);
      builder.addKeyValue('arr', [1, 2, 3]);
      builder.addKeyValue('date', date);
      builder.addKeyValue('null', null);
      builder.addKeyValue('undef', undefined);
      builder.addKeyValue('obj', { a: 1, b: 2, c: 3 });
      const result = builder.build();

      // array fields show length
      expect(result).toEqual({
        num: 42,
        bool: true,
        date,
        null: null,
        undef: undefined,
        arr: '[…3]',
        obj: '{a:1,b:2,c:3}',
      });
      expect(builder.nArrayElements).toBe(3);
    });
    it('build() returns copy not reference', () => {
      const builder = new MonoJSONBuilder({});
      builder.addKeyValue('key', 'value');
      const result1 = builder.build();
      const result2 = builder.build();
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
    it('nArrayElements counts array elements, ignores non-arrays', () => {
      const builder = new MonoJSONBuilder({ maxKeys: 10 });
      builder.addKeyValue('num', 42);
      builder.addKeyValue('arr1', [1, 2, 3]);
      expect(builder.nArrayElements).toBe(3);
      builder.addKeyValue('str', 'hello');
      builder.addKeyValue('arr2', [4, [5, 6]]);
      expect(builder.nArrayElements).toBe(5);
    });
    it('zid column is inserted if namespace is provided', () => {
      // create namespace having id and uuid
      const namespace = new FuzzyNamespace();
      const forma1 = new Forma({ name: 'name1' });
      const forma2 = new Forma({ name: 'name2' });
      [forma1, forma2].forEach((f3a) => namespace.addForma(f3a));
      const id = forma1.id;
      const uuid = forma2.id;

      // Create a builder for zidSource uuid
      const zidSource = 'uuid';
      const builder = new MonoJSONBuilder({ namespace, zidSource });

      // addKeyValue will add zid iff key===zidSource (false)
      builder.addKeyValue('id', id);
      expect(builder.build()).toEqual({
        id: id.base64,
      });

      // addKeyValue will add zid iff key===zidSource (true)
      builder.addKeyValue('uuid', uuid);
      const zidJSON = builder.build();
      const zid = namespace.fuzzyIdOf(uuid);
      expect(zidJSON).toEqual({
        id: id.base64,
        zid,
        uuid: uuid.base64,
      });
      expect(zid.length).toBeLessThan(10);

      // zid column is inserted before zidSource
      expect(Object.keys(zidJSON)).toEqual(['id', 'zid', 'uuid']);
    });
  });

  describe('MonoJSONBuilder.fromSource', () => {
    it('auto-populates and allows decoration', () => {
      const builder = new MonoJSONBuilder({ maxKeys: 3 });

      const result1 = builder
        .fromSource({ name: 'test1', count: 42 })
        .addKeyValue('extra', 'field1')
        .build();
      expect(result1).toEqual({
        name: 'test1',
        count: 42,
        extra: 'field1',
      });

      // A builder retains its configuration and can be re-used
      const result2 = builder
        .fromSource({ name: 'test2' })
        .addKeyValue('extra', 'field2')
        .build();
      expect(result2).toEqual({ name: 'test2', extra: 'field2' });
    });

    it('Forma id values should not be quoted', () => {
      // Reproduces: nf find task -p forma:1,id:1,name:1
      // where id values appear quoted but name values do not
      const id = new UUID64();
      const name = 'Name1';
      const forma = new Forma({ id, name });
      const status = 'work';
      const builder = new MonoJSONBuilder();
      const monoJSON = builder.fromSource(forma).build();

      expect(monoJSON.name).toEqual(name); // unquoted
      expect(monoJSON.id).toMatch(id.base64); // id.toJSON()
    });

    it('MonoJSON Action should have status', () => {
      // Reproduces: nf find task -p forma:1,id:1,name:1
      // where id values appear quoted but name values do not
      const id = new UUID64();
      const name = 'Action1';
      const summary = 'Summary1';
      const status = 'work';
      const statusNote = 'note';
      const action = new Action({ id, name, summary, status, statusNote });
      const builder = new MonoJSONBuilder({ maxKeys: 10 });

      // ZenoStep 1 only shows id, name, summary
      const mj1 = builder
        .fromSource(action, { zeno: zenoStep(2) })
        .build();
      expect(mj1.id).toMatch(id.base64); // id.toJSON()
      expect(mj1.name).toEqual(name);
      expect(mj1.summary).toMatch(summary);
      expect(mj1.status).toMatch(status);
      expect(mj1.statusNote).toMatch(statusNote);

      const mj2 = builder
        .fromSource(action, { zeno: zenoStep(2) })
        .build();
      expect(mj2.id).toMatch(id.base64); // id.toJSON()
      expect(mj2.name).toEqual(name);
      expect(mj2.summary).toMatch(summary);
      expect(mj2.status).toMatch(status);
      expect(mj2.statusNote).toMatch(statusNote);
    });
  });
});
