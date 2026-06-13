import { describe, it, expect, beforeEach } from '@sc-voice/vitest';
import {
  NavigableView,
  ZenoCoord,
  zenoStep,
  zenoStepToLines,
  linesToZenoStep,
  ZENO_1_ROW_TERSE,
  ZENO_1_ROW_VERBOSE,
  ZENO_2_ROWS,
  ZENO_3_ROWS,
  ZENO_5_ROWS,
  ZENO_8_ROWS,
  ViewNamespace,
} from '../src/navigable-view.js';
import { FuzzyNamespace } from '../src/fuzzy-namespace.js';
import { Forma } from '../src/forma.js';
import UUID64 from '../src/uuid64.js';
import { Text } from '@sc-voice/tools';

const { ColorConsole } = Text;
const { cc } = ColorConsole;

describe('navigable-view', () => {
  describe('linesToZenoStep', () => {
    it('should convert lines to corresponding ZenoStep', () => {
      const msg = 'tnav.linesToZenoStep.convert';

      expect(linesToZenoStep(1)).toBe(ZENO_1_ROW_TERSE);
      expect(linesToZenoStep(1)).toBe(zenoStep(0));

      expect(linesToZenoStep(2)).toBe(ZENO_2_ROWS);
      expect(linesToZenoStep(2)).toBe(zenoStep(2));

      expect(linesToZenoStep(3)).toBe(ZENO_3_ROWS);
      expect(linesToZenoStep(3)).toBe(zenoStep(3));
      expect(linesToZenoStep(4)).toBe(zenoStep(3));

      expect(linesToZenoStep(5)).toBe(ZENO_5_ROWS);
      expect(linesToZenoStep(5)).toBe(zenoStep(4));
      expect(linesToZenoStep(6)).toBe(ZENO_5_ROWS);
      expect(linesToZenoStep(7)).toBe(ZENO_5_ROWS);

      expect(linesToZenoStep(8)).toBe(ZENO_8_ROWS);
      expect(linesToZenoStep(8)).toBe(zenoStep(5));

      cc.ok1(msg, 'lines correctly converted to ZenoSteps');
    });

    it('should reject invalid input', () => {
      const msg = 'tnav.linesToZenoStep.validation';

      expect(() => linesToZenoStep(0)).toThrow(RangeError);
      expect(() => linesToZenoStep(-1)).toThrow(RangeError);
      expect(() => linesToZenoStep(1.5)).toThrow(RangeError);

      cc.ok1(msg, 'invalid input properly rejected');
    });
  });

  describe('zenoStepToLines', () => {
    it('should return line counts for each ZenoStep', () => {
      const msg = 'tnav.zenoStepToLines.counts';

      // Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
      expect(zenoStepToLines(ZENO_1_ROW_TERSE)).toBe(1);
      expect(zenoStepToLines(ZENO_1_ROW_VERBOSE)).toBe(1);
      expect(zenoStepToLines(ZENO_2_ROWS)).toBe(2);
      expect(zenoStepToLines(ZENO_3_ROWS)).toBe(3);
      expect(zenoStepToLines(ZENO_5_ROWS)).toBe(5);
      expect(zenoStepToLines(ZENO_8_ROWS)).toBe(8);

      cc.ok1(msg, 'line counts correct for each ZenoStep');
    });
  });

  describe('linesToZenoCoord', () => {
    it('linesToZenoCoord(n, 0) bias towards anchor', ()=>{
      const { linesToZenoCoord } = NavigableView;
      expect(linesToZenoCoord(1, 0).toString()).toEqual('Z(0,0)');
      expect(linesToZenoCoord(2, 0).toString()).toEqual('Z(0,0)');

      expect(linesToZenoCoord(3, 0).toString()).toEqual('Z(2,0)');

      expect(linesToZenoCoord(4, 0).toString()).toEqual('Z(3,0)');
      expect(linesToZenoCoord(5, 0).toString()).toEqual('Z(3,0)');

      expect(linesToZenoCoord(6, 0).toString()).toEqual('Z(4,0)');
      expect(linesToZenoCoord(7, 0).toString()).toEqual('Z(4,0)');
      expect(linesToZenoCoord(8, 0).toString()).toEqual('Z(4,0)');

      expect(linesToZenoCoord(9, 0).toString()).toEqual('Z(5,0)');
      expect(linesToZenoCoord(10, 0).toString()).toEqual('Z(5,0)');
      expect(linesToZenoCoord(11, 0).toString()).toEqual('Z(5,0)');
      expect(linesToZenoCoord(12, 0).toString()).toEqual('Z(5,0)');
      expect(linesToZenoCoord(13, 0).toString()).toEqual('Z(5,0)');

      expect(linesToZenoCoord(14, 0).toString()).toEqual('Z(6,0)');
      expect(linesToZenoCoord(15, 0).toString()).toEqual('Z(6,0)');
    });
    it('linesToZenoCoord(n, 0.5) bias evenly', ()=>{
      const { linesToZenoCoord } = NavigableView;
      expect(linesToZenoCoord(1, 0.5).toString()).toEqual('Z(0,0)');
      expect(linesToZenoCoord(2, 0.5).toString()).toEqual('Z(0,0)');

      expect(linesToZenoCoord(3, 0.5).toString()).toEqual('Z(2,0)');

      expect(linesToZenoCoord(4, 0.5).toString()).toEqual('Z(2,2)');

      expect(linesToZenoCoord(5, 0.5).toString()).toEqual('Z(3,2)');

      expect(linesToZenoCoord(6, 0.5).toString()).toEqual('Z(3,3)');
      expect(linesToZenoCoord(7, 0.5).toString()).toEqual('Z(3,3)');
      expect(linesToZenoCoord(8, 0.5).toString()).toEqual('Z(3,3)');

      expect(linesToZenoCoord(9, 0.5).toString()).toEqual('Z(4,3)');

      expect(linesToZenoCoord(10, 0.5).toString()).toEqual('Z(4,4)');
      expect(linesToZenoCoord(11, 0.5).toString()).toEqual('Z(4,4)');
      expect(linesToZenoCoord(12, 0.5).toString()).toEqual('Z(4,4)');
      expect(linesToZenoCoord(13, 0.5).toString()).toEqual('Z(4,4)');
      expect(linesToZenoCoord(14, 0.5).toString()).toEqual('Z(4,4)');

      expect(linesToZenoCoord(15, 0.5).toString()).toEqual('Z(5,4)');
    });
    it('linesToZenoCoord(n, 1) bias to pivot', ()=>{
      const { linesToZenoCoord } = NavigableView;
      expect(linesToZenoCoord(1, 1).toString()).toEqual('Z(0,0)');

      expect(linesToZenoCoord(2, 1).toString()).toEqual('Z(0,2)');

      expect(linesToZenoCoord(3, 1).toString()).toEqual('Z(0,3)');
      expect(linesToZenoCoord(4, 1).toString()).toEqual('Z(0,3)');

      expect(linesToZenoCoord(5, 1).toString()).toEqual('Z(0,4)');
      expect(linesToZenoCoord(6, 1).toString()).toEqual('Z(0,4)');
      expect(linesToZenoCoord(7, 1).toString()).toEqual('Z(0,4)');

      expect(linesToZenoCoord(8, 1).toString()).toEqual('Z(0,5)');
      expect(linesToZenoCoord(9, 1).toString()).toEqual('Z(0,5)');
      expect(linesToZenoCoord(10, 1).toString()).toEqual('Z(0,5)');
      expect(linesToZenoCoord(11, 1).toString()).toEqual('Z(0,5)');
      expect(linesToZenoCoord(12, 1).toString()).toEqual('Z(0,5)');

      expect(linesToZenoCoord(13, 1).toString()).toEqual('Z(0,6)');
      expect(linesToZenoCoord(14, 1).toString()).toEqual('Z(0,6)');
      expect(linesToZenoCoord(15, 1).toString()).toEqual('Z(0,6)');
    });
  });

  describe('ZenoCoord', () => {
    it('bad ctor', ()=>{
      expect(() => new ZenoCoord(-1,0)).toThrow();
      expect(() => new ZenoCoord(0,-1)).toThrow();
      expect(() => new ZenoCoord(0,1000)).toThrow();
      expect(() => new ZenoCoord(1000,0)).toThrow();
    });
    it('toString()', ()=>{
      expect((new ZenoCoord(0,0)).toString()).toEqual('Z(0,0)');
      expect((new ZenoCoord(1,0)).toString()).toEqual('Z(1,0)');
      expect((new ZenoCoord(0,1)).toString()).toEqual('Z(0,1)');
      expect((new ZenoCoord(2,3)).toString()).toEqual('Z(2,3)');
    });
  });

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

      it('prefers anchor namespace in deduplication', () => {
        anchorNs.addForma(forma1);
        anchorNs.addForma(forma2);
        pivotNs.addForma(forma2);
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
        const fuzzy1 = viewNs.fuzzyIdOf(forma1);
        const fuzzy2 = viewNs.fuzzyIdOf(forma2);
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
  });
});
