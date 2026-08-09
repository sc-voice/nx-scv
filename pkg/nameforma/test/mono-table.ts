import { describe, it, expect } from '@sc-voice/vitest';
import { MonoTable } from '@sc-voice/nameforma/unstable';

const TEST_ARRAY = [
  ['color', 'size', 'date'],
  ['purple', 10, new Date(2000, 1, 1)],
  ['red', 5, new Date(2000, 2, 1)],
  ['blue', undefined, new Date(2000, 3, 1)],
];

const TEST_OBJS = [
  {
    color: 'purple',
    size: 10,
    date: new Date(2000, 1, 1),
    nums: [1, 3],
  },
  { color: 'red', size: 5, date: new Date(2000, 2, 1) },
  { color: 'blue', date: new Date(2000, 3, 1) },
];

const TEST_GROUP = [
  ['color', 'city', 'size', 'qty'],
  ['purple', 'sf', 'small', 1],
  ['purple', 'ny', null, 2],
  ['purple', null, 'large', 1],
  ['purple', 'ny', 'large', null],
  ['purple', 'sf', 'large', 1],
  ['gold', 'ny', 'small', 4],
  ['gold', 'sf', 'large', 5],
  ['gold', 'ny', 'medium', 6],
];

describe('mono-table', () => {
  it('default ctor', () => {
    let tbl = new MonoTable({});
    expect(tbl.headers).toEqual([]);
    expect(tbl.rows).toEqual([]);
    expect(tbl.asLines()).toEqual([]);
    expect(tbl.titleOfId).toBe(MonoTable.titleOfId);
    expect(tbl).toMatchObject({
      type: 'MonoTable',
      version: '1.0.0',
      columnSeparator: ' ',
      lineSeparator: '\n',
      cellOverflow: '…',
      emptyCell: '⌿',
    });
  });
  it('fromRows()', () => {
    let rows = [
      { color: 'purple', size: 10 },
      { color: 'red', size: 5 },
    ];
    let name = 'test-name';
    let summary = 'test-summary';
    let opts = { name, summary };

    let tbl = MonoTable.fromRows(rows, opts);

    expect(tbl.name).toBe(name);
    expect(tbl.summary).toBe(summary);
    expect(tbl.headers.map((h) => h.id)).toEqual(['color', 'size']);
    expect(tbl.rows.length).toBe(2);
    expect(tbl.rows).toEqual(rows);
    expect(tbl.rows).not.toBe(rows);

    let tbl2 = MonoTable.fromRows(rows, {
      name,
      summary,
      headers: tbl.headers,
    });
    expect(tbl2.headers).not.toBe(tbl.headers);
    expect(tbl2).toEqual(tbl);
  });
  it('serialize', () => {
    let rows = [
      { color: 'purple', size: 10 },
      { color: 'red', size: 5 },
    ];
    let name = 'test-name';
    let summary = 'test-summary';
    let opts = { name, summary };

    let tbl = MonoTable.fromRows(rows, opts);
    let json = JSON.stringify(tbl);
    let tbl2 = MonoTable.fromJSON(JSON.parse(json));
    expect(tbl2.options()).toEqual(tbl.options());
  });
  it('fromArray2()', () => {
    let data = [['color', 'size'], ['purple', 10], ['red', 5], ['blue']];
    let name = 'test-name';
    let summary = 'test-summary';
    let opts = { name, summary };

    let tbl = MonoTable.fromArray2(data, opts);

    expect(tbl.headers.map((h) => h.id)).toEqual(['color', 'size']);
    let expected = [
      { color: 'purple', size: 10 },
      { color: 'red', size: 5 },
    ];
    expect(tbl.rows[0]).toEqual(expected[0]);
    expect(tbl.rows[1]).toEqual(expected[1]);
    expect(tbl.rows.length).toBe(3);
  });
  it('asLines()', () => {
    let data = TEST_ARRAY;
    let name = 'test-name';
    let summary = 'test-summary';
    let opts = { name, summary };

    let tbl = MonoTable.fromArray2(data, opts);
    let lines = tbl.asLines();
    expect(lines[0]).toBe(name);
    expect(lines[1]).toMatch(/Color *Size/i);
    expect(lines[2]).toMatch(/purple *10/);
    expect(lines[3]).toMatch(/red *5/);
    expect(lines[4]).toMatch(/blue *⌿/);
    expect(lines.at(-1)).toBe(summary);
  });
  it('filter()', () => {
    let name = 'test-name';
    let summary = 'test-summary';
    let opts = { name, summary };
    let tbl = MonoTable.fromArray2(TEST_ARRAY, opts);
    let rowFilter = (row: any) => row.size;

    let tbl2 = tbl.filter(rowFilter);

    expect(tbl2.name).toBe(tbl.name);
    expect(tbl2.summary).toBe(tbl.summary);
    expect(tbl2.rows).toEqual(tbl.rows.filter(rowFilter));
  });
  it('sort()', () => {
    let tbl = MonoTable.fromArray2(TEST_ARRAY);
    let compare = (a: any, b: any) => {
      let cmp = a.color.localeCompare(b.color);
      return cmp;
    };
    let tbl2 = new MonoTable(tbl);

    expect(tbl2.sort(compare)).toBe(tbl2);
    expect(tbl2.rows[0]).toEqual(tbl.rows[2]);
  });
  it('format()', () => {
    let tbl = MonoTable.fromArray2(TEST_ARRAY);
    let localeOptions = { dateStyle: 'short' as const };
    let cellValue = (s: any, id: string) =>
      id === 'color' ? `${s}-${id}` : s;
    let tblEN = tbl.format({
      cellValue,
      locales: ['en'],
      localeOptions,
    });
    expect(tblEN.split('\n')[0]).toMatch(/Color +Size +Date/i);
    expect(tblEN.split('\n')[1]).toMatch(/purple-color +10 +2.1.00/);

    let tblFR = tbl.format({ locales: ['fr'], localeOptions });
    let frLines = tblFR.split('\n');
    expect(frLines[0]).toMatch(/Color {2}Size Date/i);
    expect(frLines[1]).toMatch(/purple {3}10 01.02.2000/);
  });
  it('titleOfId', () => {
    expect(MonoTable.titleOfId('happy cow')).toBe('Happy cow');
  });
  it('at', () => {
    let tbl = MonoTable.fromRows(TEST_OBJS);

    // one argument
    expect(tbl.at(-1)).toEqual(undefined);
    expect(tbl.at(0)).toEqual(TEST_OBJS[0]);
    expect(tbl.at(1)).toEqual(TEST_OBJS[1]);
    expect(tbl.at(2)).toEqual(TEST_OBJS[2]);
    expect(tbl.at(3)).toEqual(undefined);

    // two arguments
    expect(tbl.at(-1, 0)).toEqual(undefined);
    expect(tbl.at(0, 0)).toEqual('purple');
    expect(tbl.at(0, 3)).toEqual([1, 3]);
    expect(tbl.at(1, 1)).toEqual(5);
    expect(tbl.at(2, 2)).toEqual(TEST_OBJS[2].date);
    expect(tbl.at(2, 'size')).toEqual(undefined);
    expect(tbl.at(3, 4)).toEqual(undefined);
  });
  it('stringAt', () => {
    let tbl = MonoTable.fromRows(TEST_OBJS);
    let cellValue = (value: any, id: string) =>
      value === 'purple' ? `p-${id}` : value;
    let opts = {
      cellValue,
      locales: ['en'],
      localeOptions: {
        dateStyle: 'short' as const,
      },
    };

    expect(tbl.stringAt(-1, undefined)).toBe(undefined);
    expect(tbl.stringAt(0, 0)).toBe('purple');
    expect(tbl.stringAt(0, 0, opts)).toBe('p-color');
    expect(tbl.stringAt(0, 1)).toBe('10');
    expect(tbl.stringAt(0, 2, opts)).toBe('2/1/00');
    expect(tbl.stringAt(2, 1, opts)).toBe(tbl.emptyCell);
  });
  it('findHeader', () => {
    let tbl = MonoTable.fromArray2(TEST_GROUP, {
      name: '---findHeader---',
    });
    let { headers: hdrs } = tbl;
    expect(MonoTable.findHeader(hdrs, -1)).toBe(undefined);
    expect(MonoTable.findHeader(hdrs, 'asdf')).toBe(undefined);
    expect(MonoTable.findHeader(hdrs, 0)).toBe(tbl.headers[0]);
    expect(MonoTable.findHeader(hdrs, 'color')).toBe(tbl.headers[0]);
    expect(MonoTable.findHeader(hdrs, { id: 'color' })).toBe(
      tbl.headers[0],
    );
    expect(MonoTable.findHeader(hdrs, 1)).toBe(tbl.headers[1]);
    expect(MonoTable.findHeader(hdrs, 'city')).toBe(tbl.headers[1]);
    expect(MonoTable.findHeader(hdrs, { id: 'city' })).toBe(
      tbl.headers[1],
    );
  });
  it('groupBy() count', () => {
    let tbl = MonoTable.fromArray2(TEST_GROUP, {
      name: '---groupBy---',
    });
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        { id: 'size', aggregate: 'count' },
        {
          id: 'size',
          aggregate: (a: any, v: any, i: number) =>
            v == null ? a || 0 : (a || 0) + 1,
        },
      ],
    );

    expect(aggTbl.at(0, 0)).toBe('gold');
    expect(aggTbl.at(0, 1)).toBe('ny');
    expect(aggTbl.at(0, 2)).toBe(2);
    expect(aggTbl.at(0, 3)).toBe(2);
    expect(aggTbl.at(1, 0)).toBe('gold');
    expect(aggTbl.at(1, 1)).toBe('sf');
    expect(aggTbl.at(1, 2)).toBe(1);
    expect(aggTbl.at(1, 3)).toBe(1);
    expect(aggTbl.at(2, 0)).toBe('purple');
    expect(aggTbl.at(2, 1)).toBe(null);
    expect(aggTbl.at(2, 2)).toBe(1); // null does not count
    expect(aggTbl.at(2, 3)).toBe(1); // null does not count
    expect(aggTbl.at(3, 0)).toBe('purple');
    expect(aggTbl.at(3, 1)).toBe('ny');
    expect(aggTbl.at(3, 2)).toBe(1);
    expect(aggTbl.at(3, 3)).toBe(1);
    expect(aggTbl.at(4, 0)).toBe('purple');
    expect(aggTbl.at(4, 1)).toBe('sf');
    expect(aggTbl.at(4, 2)).toBe(2);
    expect(aggTbl.at(4, 3)).toBe(2);
  });
  it('groupBy() min, max', () => {
    let tbl = MonoTable.fromArray2(TEST_GROUP, {
      name: '---groupBy---',
    });
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        { id: 'qty', aggregate: 'min' },
        { id: 'qty', aggregate: 'max' },
      ],
    );

    expect(aggTbl.at(0, 0)).toBe('gold');
    expect(aggTbl.at(0, 1)).toBe('ny');
    expect(aggTbl.at(0, 2)).toBe(4);
    expect(aggTbl.at(0, 3)).toBe(6);
    expect(aggTbl.at(1, 0)).toBe('gold');
    expect(aggTbl.at(1, 1)).toBe('sf');
    expect(aggTbl.at(1, 2)).toBe(5);
    expect(aggTbl.at(1, 3)).toBe(5);
    expect(aggTbl.at(2, 0)).toBe('purple');
    expect(aggTbl.at(2, 1)).toBe(null);
    expect(aggTbl.at(2, 2)).toBe(1); // null does not count
    expect(aggTbl.at(2, 3)).toBe(1); // null does not count
    expect(aggTbl.at(3, 0)).toBe('purple');
    expect(aggTbl.at(3, 1)).toBe('ny');
    expect(aggTbl.at(3, 2)).toBe(2);
    expect(aggTbl.at(3, 3)).toBe(2);
    expect(aggTbl.at(4, 0)).toBe('purple');
    expect(aggTbl.at(4, 1)).toBe('sf');
    expect(aggTbl.at(4, 2)).toBe(1);
    expect(aggTbl.at(4, 3)).toBe(1);
  });
  it('groupBy() distinct/like', () => {
    let tbl = MonoTable.fromArray2(TEST_GROUP, {
      name: '---groupBy---',
    });
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        { id: 'size', aggregate: 'list' }, // synonym
        { id: 'size', aggregate: 'distinct' }, // synonym
      ],
    );
    expect(aggTbl.at(0, 0)).toBe('gold');
    expect(aggTbl.at(0, 1)).toBe('ny');
    expect(aggTbl.at(0, 2)).toEqual(['small', 'medium']);
    expect(aggTbl.at(0, 3)).toEqual(aggTbl.at(0, 2));
    expect(aggTbl.at(1, 0)).toBe('gold');
    expect(aggTbl.at(1, 1)).toBe('sf');
    expect(aggTbl.at(1, 2)).toEqual(['large']);
    expect(aggTbl.at(1, 3)).toEqual(aggTbl.at(1, 2));
    expect(aggTbl.at(2, 0)).toBe('purple');
    expect(aggTbl.at(2, 1)).toBe(null);
    expect(aggTbl.at(2, 2)).toEqual(['large']);
    expect(aggTbl.at(2, 3)).toEqual(aggTbl.at(2, 2));
    expect(aggTbl.at(3, 0)).toBe('purple');
    expect(aggTbl.at(3, 1)).toBe('ny');
    expect(aggTbl.at(3, 2)).toEqual(['large']);
    expect(aggTbl.at(3, 3)).toEqual(aggTbl.at(3, 2));
    expect(aggTbl.at(4, 0)).toBe('purple');
    expect(aggTbl.at(4, 1)).toBe('sf');
    expect(aggTbl.at(4, 2)).toEqual(['small', 'large']);
    expect(aggTbl.at(4, 3)).toEqual(aggTbl.at(4, 2));
  });
  it('groupBy() sum,avg', () => {
    let tbl = MonoTable.fromArray2(TEST_GROUP, {
      name: '---groupBy---',
    });
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        { id: 'qty', aggregate: 'sum' },
        { id: 'qty', aggregate: 'avg' },
      ],
    );

    expect(aggTbl.at(0, 0)).toBe('gold');
    expect(aggTbl.at(0, 1)).toBe('ny');
    expect(aggTbl.at(0, 2)).toBe(10);
    expect(aggTbl.at(0, 3)).toBe(5);
    expect(aggTbl.at(1, 0)).toBe('gold');
    expect(aggTbl.at(1, 1)).toBe('sf');
    expect(aggTbl.at(1, 2)).toBe(5);
    expect(aggTbl.at(1, 3)).toBe(5);
    expect(aggTbl.at(2, 0)).toBe('purple');
    expect(aggTbl.at(2, 1)).toBe(null);
    expect(aggTbl.at(2, 2)).toBe(1); // null does not count
    expect(aggTbl.at(2, 3)).toBe(1); // null does not count
    expect(aggTbl.at(3, 0)).toBe('purple');
    expect(aggTbl.at(3, 1)).toBe('ny');
    expect(aggTbl.at(3, 2)).toBe(2);
    expect(aggTbl.at(3, 3)).toBe(2);
    expect(aggTbl.at(4, 0)).toBe('purple');
    expect(aggTbl.at(4, 1)).toBe('sf');
    expect(aggTbl.at(4, 2)).toBe(2);
    expect(aggTbl.at(4, 3)).toBe(1);
  });
});
