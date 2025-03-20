import should from 'should';
import { DBG } from '../../src/defines.mjs';
import { Text } from '../../index.mjs';
const { ColorConsole, Column } = Text;
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
    let c1 = new Column();
    should(c1.name).match(/column[0-9]/);
    should(c1.separator).equal(',');
  });
  it('push()', () => {
    let c1 = new Column();
    let c2 = new Column();
    let values = [1, 'two', { a: 3 }];

    // one by one
    c1.push(values[0]);
    c1.push(values[1]);
    c1.push(values[2]);
    should.deepEqual(c1.rows, values);

    // all at once
    c2.push(...values);
    should.deepEqual(c2.rows, values);
  });
  it('toStrings()', () => {
    let name = 'test-toString';
    let rows = [1, 'two', { a: 3 }, null, undefined, true];
    let col = new Column({ name, rows });
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
    const msg = 'c4n.toString';
    let list = [
      1,
      'one',
      new TestClass('test1'),
      2,
      'two',
      new TestClass('test2'),
    ];
    const dbg = DBG.C4N_TO_STRING;
    let separator = '\n';
    let nColumns = 3;
    let cols = Column.fromWrappedList(list, { separator, nColumns });
    should(cols.toString({ separator })).equal(
      '1,one,test1\n2,two,test2',
    );
    dbg && cc.ok1(msg+1, '\n', cols);
  });
  it('fromWrappedList() row-major', () => {
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let cols2 = Column.fromWrappedList(list);
    should.deepEqual(cols2.rows, [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9],
    ]);
    let order = 'row-major';
    let colsRowMajor = Column.fromWrappedList(list, { order });
    should.deepEqual(colsRowMajor, cols2);

    let nColumns = 3;
    let cols3 = Column.fromWrappedList(list, { nColumns });
    should.deepEqual(cols3.rows, [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
  });
  it('fromWrappedList() column-major', () => {
    const msg = 'tc4n.f13t-column-major';
    let list = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let order = 'col-major';
    let cols2 = Column.fromWrappedList(list, { order, nColumns: 2 });
    should.deepEqual(cols2.rows, [
      [1, 6],
      [2, 7],
      [3, 8],
      [4, 9],
      [5],
    ]);

    let cols3 = Column.fromWrappedList(list, { order, nColumns: 3 });
    should.deepEqual(cols3.rows, [
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);
    let cols4 = Column.fromWrappedList(list, { order, nColumns: 4 });
    should.deepEqual(cols4.rows, [
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
    ]);

    for (let i = 5; i < list.length; i++) {
      let cols = Column.fromWrappedList(list, { order, nColumns: i });
      should.deepEqual(cols.rows, [
        [1, 3, 5, 7, 9],
        [2, 4, 6, 8],
      ]);
    }

    let cols9 = Column.fromWrappedList(list, { order, nColumns: 9 });
    should.deepEqual(cols9.rows, [list]);
  });
});
