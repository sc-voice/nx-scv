import util from 'node:util';
import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole, List, ListFactory } = Text;
const { cc } = ColorConsole;
const { GREEN, BLUE, MAGENTA, NO_COLOR } = Unicode.LINUX_COLOR;
const {
  UNDERLINE,
  NO_UNDERLINE,
  STRIKETHROUGH,
  NO_STRIKETHROUGH,
  BOLD,
  NO_BOLD,
} = Unicode.LINUX_STYLE;

class TestClass {
  constructor(value) {
    this.value = value;
    this.date = Date.now();
  }

  toString() {
    return this.value + '';
  }
}

describe('list', () => {
  it('l9y.SINGLETON', () => {
    expect(ListFactory.SINGLETON).toMatchObject({
      order: 'column-major',
      rowSeparator: '\n',
      colSeparator: ' ',
    });
  });
  it('l9y.default-ctor', () => {
    let lfDefault = new ListFactory();
    expect(lfDefault).toMatchObject({
      order: 'column-major',
      rowSeparator: '\n',
      colSeparator: ' ',
    });

    // use custom ListFactory to override defaults
    let order = 'row-major';
    let colSeparator = '|';
    let rowSeparator = '|R\n';
    let precision = 5;
    let opts = {
      order,
      rowSeparator,
      colSeparator,
      precision,
    };
    let lfCustom = new ListFactory(opts);
    expect(lfCustom).toMatchObject(opts);
    let list = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8, 1 / 9];
    let cols3 = lfCustom.wrapList(list, { maxValues: 3 });
    expect(cols3.toString()).toBe(
      [
        '1      |0.5  |0.33333|R',
        '0.25   |0.2  |0.16667|R',
        '0.14286|0.125|0.11111',
      ].join('\n'),
    );
  });
  it('createColumn default', () => {
    let col = List.createColumn();
    expect(col.name).toMatch(/column[1-9][0-9]*/);
    expect(col.separator).toBe('\n');
  });
  it('createColumn custom', () => {
    let name = 'test-name';
    let separator = 'test-separator';
    let col = List.createColumn({
      name,
      separator,
    });
    expect(col.name).toBe(name);
    expect(col.separator).toBe(separator);
  });
  it('createRow default', () => {
    let row = List.createRow();
    expect(row.name).toMatch(/row[1-9][0-9]*/);
    expect(row.separator).toBe('\t');
  });
  it('createRow custom', () => {
    let name = 'test-name';
    let separator = '|';
    let widths = new Array(10).fill(4);
    let precision = 2;
    let row = List.createRow({
      name,
      separator,
      widths,
      precision,
    });
    expect(row.name).toBe(name);
    expect(row.separator).toBe(separator);
    expect(row.precision).toBe(precision);
    expect(row.widths).toEqual(widths);
    row.push('abcdefghijklmnopqrstuvwxyz');
    row.push(1);
    row.push(1 / 2);
    row.push(1 / 3);
    row.push(2 / 3);
    row.push(false);
    expect(row.toString()).toBe('abcd|1   |0.5 |0.33|0.67|fals');
    row.widths.fill(5);
    expect(row.toString()).toBe('abcde|1    |0.5  |0.33 |0.67 |false');
  });
  it('push()', () => {
    let c1 = List.createColumn();
    let c2 = List.createColumn();
    let values = [1, 'two', { a: 3 }];

    // one by one
    c1.push(values[0]);
    c1.push(values[1]);
    c1.push(values[2]);
    expect(c1).toEqual(values);

    // all at once
    c2.push(...values);
    expect(c2).toEqual(values);
  });
  it('toStrings()', () => {
    let name = 'test-toString';
    let values = [1, 'two', { a: 3 }, null, undefined, true];
    let col = List.createColumn({ name, values });
    expect(col.toStrings()).toEqual([
      '1',
      'two',
      '{"a":3}',
      'null',
      'undefined',
      'true',
    ]);
  });
  it('toString()', () => {
    const msg = 'tl2t.toString';
    let test1 = new TestClass('test1');
    let test2 = new TestClass('test2');
    let values = [1, 'one', test1, 2, 'two', test2];
    const dbg = DBG.L2T_TO_STRING;
    let order = 'row-major';
    let maxValues = 3;
    let colSeparator = '|';
    let list = List.wrapList(values, {
      order,
      maxValues,
      colSeparator,
    });
    expect(list).toEqual([
      [1, 'one', test1],
      [2, 'two', test2],
    ]);
    expect(list[0].separator).toBe('|');
    expect(list.toString()).toBe('1|one|test1\n2|two|test2');
    dbg && cc.ok1(msg + 1, '\n', list);
  });
  it('wrapList() row-major', () => {
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let order = 'row-major';
    let cols2 = List.wrapList(list, { order });
    expect(cols2).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
    ]);
    let colsRowMajor = List.wrapList(list, { order });
    expect(colsRowMajor).toEqual(cols2);
    expect(colsRowMajor[0].widths).toEqual([1, 2]);

    let maxValues = 3;
    let colSeparator = '|';
    let cols3 = List.wrapList(list, {
      order,
      maxValues,
      colSeparator,
    });
    expect(cols3).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    expect(cols3[0].widths).toEqual([2, 1, 1]);
    expect(cols3.toString()).toBe(
      ['1 |2|3', '4 |5|6', '7 |8|9', '10'].join('\n'),
    );
  });
  it('wrapList() column-major', () => {
    const msg = 'tl2t.wrapList-column-major';
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let order = 'col-major';
    let colSeparator = '|';
    let cols2 = List.wrapList(list, {
      order,
      maxValues: 2,
      colSeparator,
    });
    expect(cols2).toEqual([[1, 6], [2, 7], [3, 8], [4, 9], [5]]);

    let cols3 = List.wrapList(list, {
      order,
      maxValues: 3,
      colSeparator,
    });
    expect(cols3).toEqual([
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    let cols4 = List.wrapList(list, {
      order,
      maxValues: 4,
      colSeparator,
    });
    expect(cols4).toEqual([
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    expect(cols4.toString()).toBe(
      [[1, 4, 7].join('|'), [2, 5, 8].join('|'), [3, 6, 9].join('|')].join(
        '\n',
      ),
    );

    for (let i = 5; i < list.length; i++) {
      let cols = List.wrapList(list, {
        order,
        maxValues: i,
        colSeparator,
      });
      expect(cols).toEqual([
        [1, 3, 5, 7, 9],
        [2, 4, 6, 8],
      ]);
    }

    let cols9 = List.wrapList(list, { order, maxValues: 9 });
    expect(cols9).toEqual([list]);
  });
});
