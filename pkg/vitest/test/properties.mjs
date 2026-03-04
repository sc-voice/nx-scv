import { describe, it, expect } from '../index.mjs';

describe('expect().properties() extension', () => {
  describe('string argument - single property', () => {
    it('passes when property exists', () => {
      const obj = { name: 'John' };
      expect(obj).properties('name');
    });

    it('fails when property missing', () => {
      const obj = { name: 'John' };
      try {
        expect(obj).properties('age');
      } catch (e) {
        // Expected to throw
        return;
      }
      throw new Error('Expected assertion to fail');
    });
  });

  describe('array argument - multiple properties', () => {
    it('passes when all properties exist', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      expect(obj).properties(['name', 'age', 'email']);
    });

    it('passes when checking subset of properties', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      expect(obj).properties(['name', 'age']);
    });

    it('fails when any property missing', () => {
      const obj = { name: 'John', age: 30 };
      try {
        expect(obj).properties(['name', 'age', 'email']);
      } catch (e) {
        // Expected to throw
        return;
      }
      throw new Error('Expected assertion to fail');
    });
  });

  describe('object argument - property keys and values', () => {
    it('passes when properties and values match', () => {
      const obj = { name: 'John', age: 30 };
      expect(obj).properties({ name: 'John', age: 30 });
    });

    it('passes when checking subset', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      expect(obj).properties({ name: 'John' });
    });

    it('fails when property missing', () => {
      const obj = { name: 'John' };
      try {
        expect(obj).properties({ name: 'John', age: 30 });
      } catch (e) {
        // Expected to throw
        return;
      }
      throw new Error('Expected assertion to fail');
    });

    it('fails when value does not match', () => {
      const obj = { name: 'John', age: 30 };
      try {
        expect(obj).properties({ name: 'Jane', age: 30 });
      } catch (e) {
        // Expected to throw
        return;
      }
      throw new Error('Expected assertion to fail');
    });
  });

  describe('edge cases', () => {
    it('works with nested objects', () => {
      const obj = { user: { name: 'John' } };
      expect(obj).properties('user');
    });

    it('works with arrays', () => {
      const obj = { items: [1, 2, 3] };
      expect(obj).properties('items');
    });

    it('works with null/undefined values in object', () => {
      const obj = { a: 1, b: null };
      expect(obj).properties({ a: 1, b: null });
    });
  });

  describe('deepEqual', () => {
    it('works with null/undefined values in object', () => {
      const obj = { a:{x:1}, b:{y:2}, c:{z:3} }
      expect(obj).properties({ b:{y:2} });
    });
  });
});
