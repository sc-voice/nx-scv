import should from 'should';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { ColorConsole, List } = Text;
let { cc } = ColorConsole;

class TestClass {
  constructor(value) {
    this.value = value;
    this.date = Date.now();
  }

  toString() {
    return this.value + '';
  }
}

describe('TESTTESTcolumn', () => {
  it('default ctor', () => {
    let c1 = List.createColumn();
    should(c1.name).match(/column[0-9]/);
    should(c1.separator).equal('\n');
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
    let values = [ 1, 'one', test1, 2, 'two', test2 ];
    const dbg = DBG.L2T_TO_STRING;
    let rowSize = 3;
    let list = List.wrapList(values, { rowSize });
    should.deepEqual(list, [
      [1, 'one', test1],
      [2, 'two', test2],
    ]);
    should(list[0].separator).equal('\t');
    should(list.toString()).equal('1\tone\ttest1\n2\ttwo\ttest2');
    dbg && cc.ok1(msg + 1, '\n', list);
  });
  it('wrapList() row-major', () => {
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let cols2 = List.wrapList(list);
    should.deepEqual(cols2, [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9],
    ]);
    let order = 'row-major';
    let colsRowMajor = List.wrapList(list, { order });
    should.deepEqual(colsRowMajor, cols2);

    let rowSize = 3;
    let cols3 = List.wrapList(list, { rowSize });
    should.deepEqual(cols3, [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
  });
  it('wrapList() column-major', () => {
    const msg = 'tl2t.f13t-column-major';
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let order = 'col-major';
    let cols2 = List.wrapList(list, { order, rowSize: 2 });
    should.deepEqual(cols2, [
      [1, 6],
      [2, 7],
      [3, 8],
      [4, 9],
      [5],
    ]);

    let cols3 = List.wrapList(list, { order, rowSize: 3 });
    should.deepEqual(cols3, [
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    let cols4 = List.wrapList(list, { order, rowSize: 4 });
    should.deepEqual(cols4, [
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    should(cols4.toString()).equal([
      [1,4,7].join('\t'),
      [2,5,8].join('\t'),
      [3,6,9].join('\t'),
    ].join('\n'));

    for (let i = 5; i < list.length; i++) {
      let cols = List.wrapList(list, { order, rowSize: i });
      should.deepEqual(cols, [
        [1, 3, 5, 7, 9],
        [2, 4, 6, 8],
      ]);
    }

    let cols9 = List.wrapList(list, { order, rowSize: 9 });
    should.deepEqual(cols9, [list]);
  });
});
