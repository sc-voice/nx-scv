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
} from '../src/navigable-view.js';
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

      //cc.ok1(msg, 'lines correctly converted to ZenoSteps');
    });

    it('should reject invalid input', () => {
      const msg = 'tnav.linesToZenoStep.validation';

      expect(() => linesToZenoStep(0)).toThrow(RangeError);
      expect(() => linesToZenoStep(-1)).toThrow(RangeError);
      expect(() => linesToZenoStep(1.5)).toThrow(RangeError);

      //cc.ok1(msg, 'invalid input properly rejected');
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

      //cc.ok1(msg, 'line counts correct for each ZenoStep');
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

});
