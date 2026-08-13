import { describe, it, expect, beforeEach } from '@sc-voice/vitest';
import { ViewNamespace } from '../src/view-namespace.js';
import { FuzzyNamespace } from '../src/fuzzy-namespace.js';
import { Forma } from '../src/forma.js';
import { Entity } from '../src/entity.js';
import UUID64 from '../src/uuid64.js';

class TestEntity extends Entity {
  name: string = '';

  constructor(cfg: any = {}) {
    super({ id: cfg.id });
    this.patch(cfg);
  }

  static entity = 'test-entity';
  static override get avroSchema() {
    return {
      name: 'TestEntity',
      namespace: 'test',
      type: 'record',
      fields: [
        ...Forma.avroSchema.fields,
        { name: 'name', type: 'string' },
      ],
    };
  }

  static fromJson(data: any): TestEntity {
    return new TestEntity(data);
  }

  protected override populateNamespace(): void {}
}

describe('ViewNamespace', () => {
  let anchorNs: FuzzyNamespace;
  let pivotNs: FuzzyNamespace;
  let viewNs: ViewNamespace;
  let forma1: Forma;
  let forma2: Forma;
  let forma3: Forma;

  beforeEach(() => {
    anchorNs = new FuzzyNamespace();
    pivotNs = new FuzzyNamespace();
    viewNs = new ViewNamespace(anchorNs, pivotNs);

    forma1 = new Forma({ id: new UUID64(), name: 'forma1' });
    forma2 = new Forma({ id: new UUID64(), name: 'forma2' });
    forma3 = new Forma({ id: new UUID64(), name: 'forma3' });
  });

  describe('merging', () => {
    it('includes formas from both anchor and pivot namespaces', () => {
      anchorNs.addForma(forma1);
      pivotNs.addForma(forma2);

      const merged = Array.from(viewNs).map(([_, f]) => f);
      expect(merged).toHaveLength(2);
      expect(merged).toContain(forma1);
      expect(merged).toContain(forma2);
    });

    it('deduplicates formas present in both anchor and pivot', () => {
      anchorNs.addForma(forma1);
      pivotNs.addForma(forma1);

      const merged = Array.from(viewNs).map(([_, f]) => f);
      expect(merged).toHaveLength(1);
      expect(merged[0]).toBe(forma1);
    });

    it('merged namespaces deduplicate', () => {
      anchorNs.addForma(forma1);
      anchorNs.addForma(forma2);
      pivotNs.addForma(forma1);
      pivotNs.addForma(forma3);

      const merged = Array.from(viewNs).map(([_, f]) => f);
      expect(merged).toHaveLength(3);
      expect(merged).toContain(forma1);
      expect(merged).toContain(forma2);
      expect(merged).toContain(forma3);
    });
  });

  describe('getForma', () => {
    it('finds formas in anchor namespace', () => {
      anchorNs.addForma(forma1);
      pivotNs.addForma(forma2);
      const found1 = viewNs.getForma(forma1.id.base64);
      expect(found1).toBe(forma1);
      const found2 = viewNs.getForma(forma2.id.base64);
      expect(found2).toBe(forma2);
      const found3 = viewNs.getForma(forma3.id.base64);
      expect(found3).toBeUndefined();
    });
  });

  describe('fuzzyIdOf', () => {
    it('returns fuzzyId for forma in anchor namespace', () => {
      anchorNs.addForma(forma1);
      pivotNs.addForma(forma2);
      const fuzzy1 = viewNs.fuzzyIdOf(forma1.id);
      const fuzzy2 = viewNs.fuzzyIdOf(forma2.id);
      const found1 = viewNs.getForma(fuzzy1);
      expect(found1).toBe(forma1);
      const found2 = viewNs.getForma(fuzzy2);
      expect(found2).toBe(forma2);

      // normal fuzzy ids are 5-6 chars, but when UUID64s are created
      // rapidly, we need to include the time sequence as well
      expect(fuzzy1.length).toBeLessThan(8);
    });
  });

  describe('cache invalidation', () => {
    it('caches merged namespace on first access', () => {
      anchorNs.addForma(forma1);
      const merged1 = Array.from(viewNs);
      const merged2 = Array.from(viewNs);
      // Both iterations should use same cache
      expect(merged1.length).toBe(merged2.length);
    });

    it('invalidates cache when anchor namespace changes', () => {
      anchorNs.addForma(forma1);
      const merged1 = Array.from(viewNs).map(([_, f]) => f);

      anchorNs.addForma(forma2);
      const merged2 = Array.from(viewNs).map(([_, f]) => f);

      expect(merged1).toHaveLength(1);
      expect(merged2).toHaveLength(2);
    });

    it('invalidates cache when pivot namespace changes', () => {
      pivotNs.addForma(forma1);
      const merged1 = Array.from(viewNs).map(([_, f]) => f);

      pivotNs.addForma(forma2);
      const merged2 = Array.from(viewNs).map(([_, f]) => f);

      expect(merged1).toHaveLength(1);
      expect(merged2).toHaveLength(2);
    });
  });

  describe('mutation routing', () => {
    it('removeForma removes from anchor namespace', () => {
      anchorNs.addForma(forma1);
      const removed = viewNs.removeForma(forma1.id.base64);

      expect(removed).toBe(forma1);
      expect(viewNs.getForma(forma1.id.base64)).toBeUndefined();
    });

    it('removeForma removes from pivot namespace if not in anchor', () => {
      pivotNs.addForma(forma2);
      const removed = viewNs.removeForma(forma2.id.base64);

      expect(removed).toBe(forma2);
      expect(viewNs.getForma(forma2.id.base64)).toBeUndefined();
    });

    it('removeForma returns undefined for unknown formas', () => {
      const removed = viewNs.removeForma(forma1.id.base64);
      expect(removed).toBeUndefined();
    });

    it('addForma throws ambiguous operation error', () => {
      expect(() => viewNs.addForma(forma1)).toThrow('Ambiguous operation');
    });
  });

  describe('iterator', () => {
    it('iterates over merged namespace', () => {
      anchorNs.addForma(forma1);
      pivotNs.addForma(forma2);

      const entries = Array.from(viewNs);
      expect(entries).toHaveLength(2);
      expect(entries.map(([_, f]) => f)).toContain(forma1);
      expect(entries.map(([_, f]) => f)).toContain(forma2);
    });

    it('returns [fuzzyId, forma] tuples', () => {
      anchorNs.addForma(forma1);
      const [fuzzyId, forma] = Array.from(viewNs)[0];

      expect(viewNs.getForma(fuzzyId)).toBe(forma1);
      expect(forma).toBe(forma1);
    });
  });

  describe('track/untrack', () => {
    it('track adds entity and returns true', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      const result = viewNs.track(entity);

      expect(result).toBe(true);
      const merged = Array.from(viewNs).map(([_, f]) => f);
      expect(merged).toContain(entity);
    });

    it('track returns false for duplicate id in anchor', () => {
      anchorNs.addForma(forma1);
      const entity = new TestEntity({ id: forma1.id, name: 'test1' });

      const result = viewNs.track(entity);

      expect(result).toBe(false);
    });

    it('track returns false for duplicate id in pivot', () => {
      pivotNs.addForma(forma2);
      const entity = new TestEntity({ id: forma2.id, name: 'test2' });

      const result = viewNs.track(entity);

      expect(result).toBe(false);
    });

    it('track returns false for already tracked entity', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      viewNs.track(entity);

      const result = viewNs.track(entity);

      expect(result).toBe(false);
    });

    it('multiple tracked entities appear in merged namespace', () => {
      const entity1 = new TestEntity({ id: new UUID64(), name: 'test1' });
      const entity2 = new TestEntity({ id: new UUID64(), name: 'test2' });
      anchorNs.addForma(forma1);

      viewNs.track(entity1);
      viewNs.track(entity2);

      const merged = Array.from(viewNs).map(([_, f]) => f);
      expect(merged).toHaveLength(3);
      expect(merged).toContain(entity1);
      expect(merged).toContain(entity2);
      expect(merged).toContain(forma1);
    });

    it('untrack removes entity from merged namespace', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      viewNs.track(entity);

      viewNs.untrack(entity);

      const merged = Array.from(viewNs).map(([_, f]) => f);
      expect(merged).not.toContain(entity);
    });

    it('getForma finds tracked entity by exact base64 id', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      viewNs.track(entity);

      const found = viewNs.getForma(entity.id.base64);

      expect(found).toBe(entity);
    });

    it('getForma finds tracked entity by case-insensitive match', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      viewNs.track(entity);

      const base64 = entity.id.base64;
      const lowerMatch = base64.toLowerCase();
      const found = viewNs.getForma(lowerMatch);

      expect(found).toBe(entity);
    });

    it('getForma returns undefined for untracked id', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });

      const found = viewNs.getForma(entity.id.base64);

      expect(found).toBeUndefined();
    });

    it('tracked getter returns snapshot copy', () => {
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      viewNs.track(entity);

      const snapshot = viewNs.tracked;
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0]).toBe(entity);
      // mutating snapshot does not affect internal state
      snapshot.pop();
      expect(viewNs.tracked).toHaveLength(1);
    });

    it('constructor accepts initial tracked entities', () => {
      const entity = new TestEntity({
        id: new UUID64(),
        name: 'pre-tracked',
      });
      const vn = new ViewNamespace(anchorNs, pivotNs, [entity]);

      const merged = Array.from(vn).map(([_, f]) => f);
      expect(merged).toContain(entity);
      expect(vn.tracked).toHaveLength(1);
    });

    it('tracked entity disappears from iterator after untrack', () => {
      anchorNs.addForma(forma1);
      const entity = new TestEntity({ id: new UUID64(), name: 'test1' });
      viewNs.track(entity);

      const merged1 = Array.from(viewNs).map(([_, f]) => f);
      expect(merged1).toHaveLength(2);

      viewNs.untrack(entity);

      const merged2 = Array.from(viewNs).map(([_, f]) => f);
      expect(merged2).toHaveLength(1);
      expect(merged2).toContain(forma1);
      expect(merged2).not.toContain(entity);
    });
  });
});
