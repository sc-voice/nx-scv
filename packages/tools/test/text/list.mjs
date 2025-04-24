import util from 'node:util';
import should from 'should';
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

describe('TESTTESTlist', () => {
  it('l9y.SINGLETON', () => {
    should(ListFactory.SINGLETON).properties({
      order: 'column-major',
      rowSeparator: '\n',
      colSeparator: ' ',
    });
  });
  it('l9y.default-ctor', () => {
    let lfDefault = new ListFactory();
    should(lfDefault).properties({
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
    should(lfCustom).properties(opts);
    let list = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8, 1 / 9];
    let cols3 = lfCustom.wrapList(list, { maxValues: 3 });
    should(cols3.toString()).equal(
      [
        '1      |0.5  |0.33333|R',
        '0.25   |0.2  |0.16667|R',
        '0.14286|0.125|0.11111',
      ].join('\n'),
    );
  });
  it('createColumn default', () => {
    let col = List.createColumn();
    should(col.name).match(/column[1-9][0-9]*/);
    should(col.separator).equal('\n');
  });
  it('createColumn custom', () => {
    let name = 'test-name';
    let separator = 'test-separator';
    let col = List.createColumn({
      name,
      separator,
    });
    should(col.name).equal(name);
    should(col.separator).equal(separator);
  });
  it('createRow default', () => {
    let row = List.createRow();
    should(row.name).match(/row[1-9][0-9]*/);
    should(row.separator).equal('\t');
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
    should(row.name).equal(name);
    should(row.separator).equal(separator);
    should(row.precision).equal(precision);
    should.deepEqual(row.widths, widths);
    row.push('abcdefghijklmnopqrstuvwxyz');
    row.push(1);
    row.push(1 / 2);
    row.push(1 / 3);
    row.push(2 / 3);
    row.push(false);
    should(row.toString()).equal('abcd|1   |0.5 |0.33|0.67|fals');
    row.widths.fill(5);
    should(row.toString()).equal('abcde|1    |0.5  |0.33 |0.67 |false');
  });
  it('push()', () => {
    let c1 = List.createColumn();
    let c2 = List.createColumn();
    let values = [1, 'two', { a: 3 }];

    // one by one
    c1.push(values[0]);
    c1.push(values[1]);
    c1.push(values[2]);
    should.deepEqual(c1, values);

    // all at once
    c2.push(...values);
    should.deepEqual(c2, values);
  });
  it('toStrings()', () => {
    let name = 'test-toString';
    let values = [1, 'two', { a: 3 }, null, undefined, true];
    let col = List.createColumn({ name, values });
    should.deepEqual(col.toStrings(), [
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
    should.deepEqual(list, [
      [1, 'one', test1],
      [2, 'two', test2],
    ]);
    should(list[0].separator).equal('|');
    should(list.toString()).equal('1|one|test1\n2|two|test2');
    dbg && cc.ok1(msg + 1, '\n', list);
  });
  it('wrapList() row-major', () => {
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let order = 'row-major';
    let cols2 = List.wrapList(list, { order });
    should.deepEqual(cols2, [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
    ]);
    let colsRowMajor = List.wrapList(list, { order });
    should.deepEqual(colsRowMajor, cols2);
    should.deepEqual(colsRowMajor[0].widths, [1, 2]);

    let maxValues = 3;
    let colSeparator = '|';
    let cols3 = List.wrapList(list, {
      order,
      maxValues,
      colSeparator,
    });
    should.deepEqual(cols3, [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    should.deepEqual(cols3[0].widths, [2, 1, 1]);
    should(cols3.toString()).equal(
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
    should.deepEqual(cols2, [[1, 6], [2, 7], [3, 8], [4, 9], [5]]);

    let cols3 = List.wrapList(list, {
      order,
      maxValues: 3,
      colSeparator,
    });
    should.deepEqual(cols3, [
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    let cols4 = List.wrapList(list, {
      order,
      maxValues: 4,
      colSeparator,
    });
    should.deepEqual(cols4, [
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    should(cols4.toString()).equal(
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
      should.deepEqual(cols, [
        [1, 3, 5, 7, 9],
        [2, 4, 6, 8],
      ]);
    }

    let cols9 = List.wrapList(list, { order, maxValues: 9 });
    should.deepEqual(cols9, [list]);
  });
});
