import { describe, it, expect } from '@sc-voice/vitest';
import { RowGrouper } from '../src/row-grouper.js';

describe('RowGrouper', () => {
  const row1 = { id: 'R1', name: 'name1' };
  const row2 = { id: 'R2', name: 'name2' };
  const row3 = { id: 'R3', name: 'name3' };
  const row4 = { id: 'R4', name: 'name4' };
  const row5 = { id: 'R5', name: 'name5' };
  describe('Construction / defaults', () => {
    it('new RowGrouper() defaults: groupLines=12, rowCount=0, getLines()=[]', () => {
      const grouper = new RowGrouper();
      expect(grouper.groupLines).toBe(12);
      expect(grouper.rowCount).toBe(0);
      expect(grouper.getLines()).toEqual([]);
      expect(grouper.headerFun).toEqual(RowGrouper.DEFAULT_HEADER_FUN);
    });

    it('respects custom groupLines option', () => {
      const grouper = new RowGrouper({ groupLines: 20 });
      expect(grouper.groupLines).toBe(20);
    });

    it('DEFAULT_HEADER_FUN produces Row ${rowIndex}', () => {
      expect(RowGrouper.DEFAULT_HEADER_FUN(1, {})).toBe('Row 1');
      expect(RowGrouper.DEFAULT_HEADER_FUN(2, {})).toBe('Row 2');
    });

    it('uses DEFAULT_HEADER_FUN when no headerFun option given', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine('content');
      const lines = grouper.getLines();
      expect(lines[0]).toBe('Row 1');
      expect(lines[1]).toBe('content');
    });

    it('invokes custom headerFun with correct (rowIndex, rowData) args', () => {
      const headers: Array<{ index: number; data: any }> = [];
      const customHeaderFun = (rowIndex: number, rowData: any) => {
        headers.push({ index: rowIndex, data: rowData });
        return `Custom-${rowIndex}`;
      };
      const grouper = new RowGrouper({
        groupLines: 2,
        headerFun: customHeaderFun,
      });

      // groupLines=2 means 1 header + 1 content line per group
      grouper.startRow({ id: 'row1', name: 'first' }).pushLine('line1'); // group 1: header #1
      grouper.startRow({ id: 'row2', name: 'second' }).pushLine('line2'); // group 2: header #2
      grouper.startRow({ id: 'row3', name: 'third' }).pushLine('line3'); // group 3: header #3
      grouper.getLines();

      expect(headers).toHaveLength(3);
      expect(headers[0]).toEqual({
        index: 1,
        data: { id: 'row1', name: 'first' },
      });
      expect(headers[1]).toEqual({
        index: 2,
        data: { id: 'row2', name: 'second' },
      });
      expect(headers[2]).toEqual({
        index: 3,
        data: { id: 'row3', name: 'third' },
      });
    });
  });

  describe('Basic row accumulation', () => {
    it('single row: header injected at start, followed by content lines in order', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine('line1').pushLine('line2');
      const lines = grouper.getLines();
      expect(lines).toEqual(['Row 1', 'line1', 'line2']);
    });

    it('multiple single-line rows: only first header, no re-trigger unless group break', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine('row1');
      grouper.startRow().pushLine('row2');
      grouper.startRow().pushLine('row3');
      const lines = grouper.getLines();
      expect(lines).toEqual(['Row 1', 'row1', 'row2', 'row3']);
    });

    it('rowCount increments once per startRow() call', () => {
      const grouper = new RowGrouper();
      expect(grouper.rowCount).toBe(0);
      grouper.startRow().pushLine('a', 'b');
      expect(grouper.rowCount).toBe(1);
      grouper.startRow().pushLine('c');
      expect(grouper.rowCount).toBe(2);
      grouper.startRow();
      expect(grouper.rowCount).toBe(3);
    });

    it('getLines() is idempotent — multiple calls return same content', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine('line1');
      const lines1 = grouper.getLines();
      const lines2 = grouper.getLines();
      expect(lines2).toEqual(lines1);
    });
  });

  describe('Row atomicity (multiline rows)', () => {
    it('multiline row forces new header on next startRow()', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine('a', 'b'); // multiline
      grouper.startRow().pushLine('c'); // should trigger new header
      const lines = grouper.getLines();
      expect(lines).toEqual(['Row 1', 'a', 'b', 'Row 2', 'c']);
    });

    it('multiline row lines are never split across Row boundary', () => {
      const grouper = new RowGrouper({ groupLines: 4 });
      // Row 1: header (1) + 2 content lines = 3, leaves 1 space (4-1)
      grouper.startRow().pushLine('a', 'b');
      // Next row: 3 lines, but only 1 space left, so triggers new Row
      grouper.startRow().pushLine('c', 'd', 'e');
      const lines = grouper.getLines();
      expect(lines).toEqual(['Row 1', 'a', 'b', 'Row 2', 'c', 'd', 'e']);
    });
  });

  describe('Row-break logic (groupLines)', () => {
    it('Single line rows: full and partial groups', () => {
      const grouper = new RowGrouper({ groupLines: 3 });

      // Partial group
      grouper.startRow().pushLine(row1.id);
      expect(grouper.getLines()).toEqual(['Row 1', 'R1']);

      // Full group
      grouper.startRow().pushLine(row2.id);
      expect(grouper.getLines()).toEqual(['Row 1', 'R1', 'R2']);

      // Full group
      grouper.startRow().pushLine(row3.id);
      grouper.startRow().pushLine(row4.id);
      expect(grouper.getLines()).toEqual([
        ...['Row 1', 'R1', 'R2'],
        ...['Row 3', 'R3', 'R4'],
      ]);

      // Last group is partial
      grouper.startRow().pushLine(row5.id);
      expect(grouper.getLines()).toEqual([
        ...['Row 1', 'R1', 'R2'],
        ...['Row 3', 'R3', 'R4'],
        ...['Row 5', 'R5'],
      ]);
    });
    it('Multiline rows exact/big', () => {
      const opts = { groupLines: 3 };

      // 2 line row (using single arg pushLine)
      const grouper = new RowGrouper(opts);
      grouper
        .startRow()
        .pushLine(row1.id + 'a')
        .pushLine(row1.id + 'b');
      expect(grouper.getLines()).toEqual(['Row 1', 'R1a', 'R1b']);

      // 3 line row (using varargs pushLine)
      const id2 = row2.id;
      grouper.startRow().pushLine(id2 + 'a', id2 + 'b', id2 + 'c');
      expect(grouper.getLines()).toEqual([
        ...['Row 1', 'R1a', 'R1b'],
        ...['Row 2', 'R2a', 'R2b', 'R2c'],
      ]);
    });
    it('Multiline rows partial/big', () => {
      const opts = { groupLines: 3 };
      const grouper = new RowGrouper(opts);

      // 2 line row
      grouper.startRow().pushLine(row1.id + 'a');
      expect(grouper.getLines()).toEqual(['Row 1', 'R1a']);

      // 3 line row
      grouper
        .startRow()
        .pushLine(row2.id + 'a')
        .pushLine(row2.id + 'b')
        .pushLine(row2.id + 'c');
      expect(grouper.getLines()).toEqual([
        'Row 1',
        'R1a',
        'Row 2',
        'R2a',
        'R2b',
        'R2c',
      ]);
    });
  });

  describe('Flush-on-getLines', () => {
    it('buffered row is flushed when getLines() called without following startRow()', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine('a').pushLine('b');
      // No startRow() or explicit flush call, just getLines()
      const lines = grouper.getLines();
      expect(lines).toEqual(['Row 1', 'a', 'b']);
    });

    it('startRow() after getLines() starts fresh state, no content leakage', () => {
      const grouper = new RowGrouper();
      grouper.startRow().pushLine(row1.id);
      grouper.getLines();
      // After getLines(), state is NOT reset; next startRow() continues from where we left off
      // It only injects a header if previous row was multiline or lines is empty (not true here)
      grouper.startRow().pushLine(row2.id);
      const lines = grouper.getLines();
      // Single-line row 'a' doesn't trigger multiline flag, so no new header
      expect(lines).toEqual(['Row 1', 'R1', 'R2']);
    });
  });

  describe('Edge cases', () => {
    it('startRow() with no rowData defaults to {} without throwing', () => {
      const grouper = new RowGrouper({
        headerFun: (rowIndex, rowData) =>
          `Header-${rowData.field || 'none'}`,
      });
      expect(() => {
        grouper.startRow().pushLine('content');
        grouper.getLines();
      }).not.toThrow();
      const lines = grouper.getLines();
      expect(lines[0]).toBe('Header-none');
    });

    it('pushLine() before any startRow() — buffered as orphan row without header', () => {
      const grouper = new RowGrouper();
      grouper.pushLine('orphan');
      // First startRow() flushes orphan row (no header injected because it fits in group space)
      // Then starts the new row; since #lines is no longer empty, no header injected
      grouper.startRow().pushLine('first');
      const lines = grouper.getLines();
      // Orphan gets flushed without header, then first row content joins same group
      expect(lines).toEqual(['orphan', 'first']);
    });

    it('two consecutive startRow() calls with no pushLine() in between', () => {
      const grouper = new RowGrouper();
      grouper.startRow();
      grouper.startRow().pushLine('content');
      const lines = grouper.getLines();
      // First empty row flushes (no lines to append), second row triggers header (only 1 header total)
      expect(lines).toEqual(['Row 1', 'content']);
    });
  });

  describe('Method chaining', () => {
    it('startRow() and pushLine() return this for chaining', () => {
      const grouper = new RowGrouper();
      const result = grouper.startRow().pushLine('a').pushLine('b');
      expect(result).toBe(grouper);
    });
  });
});
