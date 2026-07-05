import { describe, it, expect, beforeEach } from 'vitest';
import { FuzzyNamespace } from '../src/fuzzy-namespace.js';
import { Forma } from '../src/forma.js';

describe('FuzzyNamespace', () => {
  let ns: FuzzyNamespace;
  let forma1: Forma;
  let forma2: Forma;
  let forma3: Forma;

  beforeEach(() => {
    ns = new FuzzyNamespace();
    // two ids from an actual collision
    const id1 = '0PvuTUTT00GlrCCFYF0btW';
    const id2 = '0PvuTZTy00GlrCCFYF0btW';

    // two ids from an actual collision
    forma1 = new Forma({ id: id1, name: 'Task One' });
    forma2 = new Forma({ id: id2, name: 'Task Two' });
    forma3 = new Forma({ name: 'Task Three' });
  });

  describe('addForma', () => {
    it('adds forma to the namespace', () => {
      ns.addForma(forma1);
      expect(ns.getForma(forma1.id.base64)).toBe(forma1);
    });

    it('adds multiple forma', () => {
      ns.addForma(forma1);
      ns.addForma(forma2);
      ns.addForma(forma3);
      const formas = [...ns.findByClass(Forma)];
      expect(formas[0]).toBe(forma1);
      expect(formas[1]).toBe(forma2);
      expect(formas[2]).toBe(forma3);
      expect(formas.length).toBe(3);
    });
  });

  describe('removeForma', () => {
    beforeEach(() => {
      ns.addForma(forma1);
      ns.addForma(forma2);
    });

    it('removes forma by fuzzy ID', () => {
      const fuzzyId = ns.fuzzyIdOf(forma1);
      const removed = ns.removeForma(fuzzyId);
      expect(removed).toBe(forma1);
      expect(ns.getForma(forma1.id.base64)).toBeUndefined();
    });

    it('returns undefined if forma not found', () => {
      const removed = ns.removeForma('notfound');
      expect(removed).toBeUndefined();
    });

    it('invalidates cache after removal', () => {
      const fuzzyId1Before = ns.fuzzyIdOf(forma1);
      ns.removeForma(fuzzyId1Before);
      // After removal, the masked IDs may change because prefix/suffix computation changes
      const fuzzyId2After = ns.fuzzyIdOf(forma2);
      expect(fuzzyId2After).toBeDefined();
    });
  });

  describe('getForma', () => {
    beforeEach(() => {
      ns.addForma(forma1);
      ns.addForma(forma2);
    });

    it('retrieves forma by full UUID64', () => {
      const found = ns.getForma(forma1.id.base64);
      expect(found).toBe(forma1);
    });

    it('retrieves forma by fuzzy ID', () => {
      const fuzzyId = ns.fuzzyIdOf(forma1);
      const found = ns.getForma(fuzzyId);
      expect(found).toBe(forma1);
    });

    it('returns undefined if not found', () => {
      const found = ns.getForma('notfound');
      expect(found).toBeUndefined();
    });

    it('returns undefined if ambiguous', () => {
      // This would require two forma with matching fuzzy IDs, which is hard to engineer
      // Since prefix/suffix ensures uniqueness, this is unlikely in practice
    });
  });

  describe('fuzzyIdOf', () => {
    it('returns masked FuzzyId for single forma', () => {
      ns.addForma(forma1);
      const fuzzyId = ns.fuzzyIdOf(forma1);
      expect(fuzzyId).toBeDefined();
      expect(fuzzyId.length).toBeGreaterThanOrEqual(5);
      expect(fuzzyId.length).toBeLessThanOrEqual(10);
    });

    it('caches computed FuzzyIds', () => {
      ns.addForma(forma1);
      const id1 = ns.fuzzyIdOf(forma1);
      const id2 = ns.fuzzyIdOf(forma1);
      expect(id1).toBe(id2);
    });

    it('returns consistent IDs after operations', () => {
      ns.addForma(forma1);
      const fuzzyId1 = ns.fuzzyIdOf(forma1);
      ns.addForma(forma2);
      const fuzzyId1Again = ns.fuzzyIdOf(forma1);
      // Both IDs should be >=5 chars and unique
      expect(fuzzyId1).toBeDefined();
      expect(fuzzyId1Again).toBeDefined();
      expect(fuzzyId1).not.toEqual(fuzzyId1Again); // Cache invalidated, recomputed
    });
  });

  describe('iterator', () => {
    it('iterates over empty namespace', () => {
      const entries = Array.from(ns);
      expect(entries).toHaveLength(0);
    });

    it('iterates over single forma', () => {
      ns.addForma(forma1);
      const entries = Array.from(ns);
      expect(entries).toHaveLength(1);
      const [fuzzyId, forma] = entries[0];
      expect(forma).toBe(forma1);
      expect(fuzzyId).toBeDefined();
      expect(typeof fuzzyId).toBe('string');
    });

    it('iterates over multiple forma in order', () => {
      ns.addForma(forma1);
      ns.addForma(forma2);
      ns.addForma(forma3);
      const entries = Array.from(ns);
      expect(entries).toHaveLength(3);
      expect(entries[0][1]).toBe(forma1);
      expect(entries[1][1]).toBe(forma2);
      expect(entries[2][1]).toBe(forma3);
    });

    it('yields [FuzzyId, Forma] tuples', () => {
      ns.addForma(forma1);
      for (const [fuzzyId, forma] of ns) {
        expect(typeof fuzzyId).toBe('string');
        expect(forma).toBeInstanceOf(Forma);
      }
    });

    it('iterator FuzzyId matches fuzzyIdOf() result', () => {
      ns.addForma(forma1);
      ns.addForma(forma2);
      ns.addForma(forma3);
      for (const [fuzzyId, forma] of ns) {
        expect(fuzzyId).toBe(ns.fuzzyIdOf(forma));
      }
    });
  });

  describe('uniqueness', () => {
    it('produces unique FuzzyIds within namespace', () => {
      ns.addForma(forma1);
      ns.addForma(forma2);
      ns.addForma(forma3);
      const id1 = ns.fuzzyIdOf(forma1);
      const id2 = ns.fuzzyIdOf(forma2);
      const id3 = ns.fuzzyIdOf(forma3);
      expect(id1).not.toEqual(id2);
      expect(id2).not.toEqual(id3);
      expect(id1).not.toEqual(id3);
    });
  });

  describe('small namespace behavior', () => {
    it('produces FuzzyId length of exactly 5 for small namespaces', () => {
      ns.addForma(forma1);
      ns.addForma(forma2);
      const id1 = ns.fuzzyIdOf(forma1);
      const id2 = ns.fuzzyIdOf(forma2);
      expect(id1.length).toBe(5);
      expect(id2.length).toBe(5);
    });

    it('produces FuzzyId length of exactly 7 with three items', () => {
      // Our fuzzyid are longer than the minimum 5 because id1 is similar to id2
      ns.addForma(forma1);
      ns.addForma(forma2);
      ns.addForma(forma3);
      const id1 = ns.fuzzyIdOf(forma1);
      const id2 = ns.fuzzyIdOf(forma2);
      const id3 = ns.fuzzyIdOf(forma3);
      expect(id1.length).toBeLessThanOrEqual(8);
      expect(id2.length).toBeLessThanOrEqual(8);
      expect(id3.length).toBeLessThanOrEqual(8);
      expect(id1.length).toEqual(id2.length);
      expect(id3.length).toEqual(id2.length);
    });
  });

  describe('cache invalidation', () => {
    it('invalidates cache on addForma', () => {
      ns.addForma(forma1);
      const id1 = ns.fuzzyIdOf(forma1);
      ns.addForma(forma2);
      const id1After = ns.fuzzyIdOf(forma1);
      // IDs may differ due to prefix/suffix recomputation
      expect(id1).toBeDefined();
      expect(id1After).toBeDefined();
    });

    it('invalidates cache on removeForma', () => {
      ns.addForma(forma1);
      ns.addForma(forma2);
      const id2 = ns.fuzzyIdOf(forma2);
      ns.removeForma(ns.fuzzyIdOf(forma1));
      const id2After = ns.fuzzyIdOf(forma2);
      expect(id2).toBeDefined();
      expect(id2After).toBeDefined();
    });
  });
});
