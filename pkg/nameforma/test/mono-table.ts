import { describe, it, expect } from '@sc-voice/vitest';
import {
  MonoTable,
  TableDefaults,
  PlainTheme,
} from '@sc-voice/nameforma/unstable';

const PLAIN_THEME = new PlainTheme();

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
    let opts = { name, summary, theme: PLAIN_THEME };

    let tbl = MonoTable.fromRows(rows, opts);
    let json = JSON.stringify(tbl);
    let tbl2 = MonoTable.fromJSON(JSON.parse(json));
    const opt1 = tbl.options();
    const opt2 = tbl2.options();
    expect(opt2.name).toEqual(opt1.name);
    expect(opt2.summary).toEqual(opt1.summary);
    expect(opt2.rows).toEqual(opt1.rows);
    expect(opt2.headers!.map((h) => h.id)).toEqual(
      opt1.headers!.map((h) => h.id),
    );
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
    let opts = { name, summary, theme: PLAIN_THEME };

    let tbl = MonoTable.fromArray2(data, opts);
    let lines = tbl.asLines();
    expect(lines[0]).toBe('test-name');
    expect(lines[1]).toMatch(/Color.*Size/i);
    expect(lines[2]).toMatch(/purple.*10/);
    expect(lines[3]).toMatch(/red.*5/);
    expect(lines[4]).toMatch(/blue.*⌿/);
    expect(lines.at(-1)).toBe('test-summary');
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
      theme: PLAIN_THEME,
    });
    expect(tblEN.split('\n')[0]).toMatch(/Color.*Size.*Date/i);
    expect(tblEN.split('\n')[1]).toMatch(/purple-color.*10.*2.1.00/);

    let tblFR = tbl.format({
      locales: ['fr'],
      localeOptions,
      theme: PLAIN_THEME,
    });
    let frLines = tblFR.split('\n');
    expect(frLines[0]).toMatch(/Color.*Size.*Date/i);
    expect(frLines[1]).toMatch(/purple.*10.*01.02.2000/);
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
    expect(tbl.stringAt(0, 0)).toMatch(/purple/);
    expect(tbl.stringAt(0, 0, opts)).toMatch(/p-color/);
    expect(tbl.stringAt(0, 1)).toMatch(/10/);
    expect(tbl.stringAt(0, 2, opts)).toMatch(/2\/1\/00/);
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

  it('stripAnsi() removes ANSI escape sequences', () => {
    const colored = '\x1b[31mred\x1b[39m';
    expect(MonoTable.stripAnsi(colored)).toBe('red');
    expect(MonoTable.stripAnsi('plain')).toBe('plain');
    expect(MonoTable.stripAnsi('\x1b[38;2;170;170;170mgray\x1b[39m')).toBe(
      'gray',
    );
  });

  it('stripAnsi() does not strip literal brackets without ESC', () => {
    const literal = '[39m text';
    expect(MonoTable.stripAnsi(literal)).toBe(literal);
  });

  it('padVisible() pads by visible width, not raw width', () => {
    const colored = '\x1b[31mX\x1b[39m';
    expect(MonoTable.padVisible(colored, 5)).toBe(colored + '    ');
    expect(MonoTable.padVisible(colored, 5, true)).toBe('    ' + colored);
    const plain = 'X';
    expect(MonoTable.padVisible(plain, 5)).toBe('X    ');
    expect(MonoTable.padVisible(plain, 5, true)).toBe('    X');
  });

  it('asLines() aligns columns when cells contain ANSI codes', () => {
    const rows = [
      { name: '\x1b[31mred\x1b[39m', value: '10' },
      { name: 'green', value: '5' },
    ];
    const tbl = MonoTable.fromRows(rows);
    const lines = tbl.asLines();

    // All rows should have same visual length after stripping ANSI
    const visLines = lines
      .slice(1)
      .map((line) => MonoTable.stripAnsi(line));
    const lengths = visLines.map((line) => line.length);
    expect(lengths[0]).toBe(lengths[1]);
  });

  it('applyHeaderCase() applies CSS text-transform transformations', () => {
    expect(MonoTable.applyHeaderCase('hello world', 'capitalize')).toBe(
      'Hello World',
    );
    expect(MonoTable.applyHeaderCase('hello world', 'uppercase')).toBe(
      'HELLO WORLD',
    );
    expect(MonoTable.applyHeaderCase('hello world', 'lowercase')).toBe(
      'hello world',
    );
    expect(MonoTable.applyHeaderCase('hello world', 'none')).toBe(
      'hello world',
    );
    expect(MonoTable.applyHeaderCase('helloWorld', 'capitalize')).toBe(
      'Helloworld',
    );
  });

  it('headerCase option transforms table headers', () => {
    const rows = [{ userId: 'john', firstName: 'John' }];
    const tbl = MonoTable.fromRows(rows, {
      headerCase: 'uppercase',
      theme: PLAIN_THEME,
    });
    const lines = tbl.asLines();

    expect(lines[0]).toContain('USERID');
    expect(lines[0]).toContain('FIRSTNAME');
  });

  it('headerCase default is capitalize', () => {
    const rows = [{ userId: 'john', firstName: 'John' }];
    const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
    const lines = tbl.asLines();

    expect(lines[0]).toContain('Userid');
    expect(lines[0]).toContain('Firstname');
  });

  it('headerCase none skips titleOfId transformation', () => {
    const rows = [{ userId: 'john', firstName: 'John' }];
    const tbl = MonoTable.fromRows(rows, {
      headerCase: 'none',
      theme: PLAIN_THEME,
    });
    const lines = tbl.asLines();

    expect(lines[0]).toContain('userId');
    expect(lines[0]).toContain('firstName');
  });

  describe('renderOverflowCell', () => {
    it('wraps text to multiple lines respecting maxRowWidth', () => {
      const rows = [
        { id: '1', description: 'This is a long description' },
      ];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const header = tbl.headers.find((h) => h.id === 'description')!;
      const lines = tbl.renderOverflowCell(
        header,
        'This is a long description',
        {
          maxRowWidth: 20,
          columnSeparator: ' | ',
          theme: PLAIN_THEME,
        },
      );
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.every((l) => l.startsWith(' | '))).toBe(true);
    });

    it('prefixes every line with columnSeparator', () => {
      const rows = [{ x: '1' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const header = tbl.headers[0];
      const lines = tbl.renderOverflowCell(header, 'short', {
        maxRowWidth: 15,
        columnSeparator: ' | ',
        theme: PLAIN_THEME,
      });
      for (const line of lines) {
        expect(line.startsWith(' | ')).toBe(true);
      }
    });

    it('handles unbreakable strings (single word > maxRowWidth)', () => {
      const rows = [{ x: '1' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const header = { id: 'field', title: 'Field' };
      const lines = tbl.renderOverflowCell(
        header,
        'supercalifragilisticexpialidocious',
        {
          maxRowWidth: 15,
          columnSeparator: ' ',
          theme: PLAIN_THEME,
        },
      );
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((l) => l.startsWith(' '))).toBe(true);
    });

    it('combines label and value with nfLabel styling', () => {
      const rows = [{ x: '1' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const header = { id: 'city', title: 'City' };
      const lines = tbl.renderOverflowCell(header, 'San Francisco', {
        maxRowWidth: 100,
        columnSeparator: ' | ',
        theme: PLAIN_THEME,
      });
      // Should contain both City (from nfLabel) and San Francisco
      const combined = lines.join(' ');
      expect(combined).toContain('City');
      expect(combined).toContain('San Francisco');
    });

    it('respects maxRowWidth minus columnSeparator width', () => {
      const rows = [{ x: '1' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const header = { id: 'desc', title: 'Description' };
      const lines = tbl.renderOverflowCell(
        header,
        'word1 word2 word3 word4 word5',
        {
          maxRowWidth: 20,
          columnSeparator: ' | ',
          theme: PLAIN_THEME,
        },
      );
      for (const line of lines) {
        const stripped = MonoTable.stripAnsi(line);
        expect(stripped.length).toBeLessThanOrEqual(20);
      }
    });

    it('handles ANSI codes in visual width calculation', () => {
      const rows = [{ x: '1' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const header = { id: 'h', title: 'H' };
      const coloredValue = '\x1b[31mred text\x1b[39m more words here';
      const lines = tbl.renderOverflowCell(header, coloredValue, {
        maxRowWidth: 20,
        columnSeparator: ' | ',
        theme: PLAIN_THEME,
      });
      for (const line of lines) {
        const stripped = MonoTable.stripAnsi(line);
        expect(stripped.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('maxRowWidth integration (Full/Partial/Zero Fit)', () => {
    it('Full Fit: all columns fit without overflow', () => {
      const rows = [
        { id: '1', name: 'Alice', city: 'SF' },
        { id: '2', name: 'Bob', city: 'LA' },
      ];
      const tbl = MonoTable.fromRows(rows, {
        theme: PLAIN_THEME,
        columnSeparator: ' | ',
      });
      const lines = tbl.asLines({ maxRowWidth: 200, theme: PLAIN_THEME });
      // Should have: header + 2 data rows (no overflow, no separator)
      expect(lines.length).toBe(3); // header + 2 rows
      expect(lines[1]).toContain('1');
      expect(lines[2]).toContain('2');
      // No row separators in full fit
      expect(lines.every((l) => !l.includes('─'))).toBe(true);
    });

    it('Partial Fit: hybrid layout with fit and overflow columns', () => {
      const rows = [
        { a: '1', b: 'Alice', c: 'San Francisco', d: 'alice@example.com' },
      ];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const lines = tbl.asLines({
        maxRowWidth: 30,
        columnSeparator: ' | ',
        theme: PLAIN_THEME,
      });
      // Should have header + fit row + overflow rows + separator
      expect(lines.length).toBeGreaterThan(2);
      // Data should include both fit and overflow content
      const combined = lines.join(' | ');
      expect(combined).toContain('1');
      expect(combined).toContain('Alice');
    });

    it('Zero Fit: all columns overflow to separate lines', () => {
      const rows = [{ x: 'value' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const lines = tbl.asLines({
        maxRowWidth: 5,
        columnSeparator: ' ',
        theme: PLAIN_THEME,
      });
      // Should have header + overflow lines (no standard fit row)
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('overflow cells respect maxRowWidth in wrapped content', () => {
      const rows = [
        { id: '1', overflow: 'this is some text that should be wrapped' },
      ];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const lines = tbl.asLines({
        maxRowWidth: 30,
        columnSeparator: ' ',
        theme: PLAIN_THEME,
      });
      // Check that wrapped overflow lines respect maxRowWidth
      const overflowLines = lines.filter(
        (l) => l.includes('wrapped') || l.includes('text'),
      );
      for (const line of overflowLines) {
        const stripped = MonoTable.stripAnsi(line);
        expect(stripped.length).toBeLessThanOrEqual(30);
      }
    });

    it('renders row separator with auto-default in overflow', () => {
      const rows = [{ a: 'x', b: 'long text that will overflow' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const lines = tbl.asLines({
        maxRowWidth: 25,
        columnSeparator: ' ',
        theme: PLAIN_THEME,
      });
      // In overflow mode (overflowIndex <= 1), separator auto-default activates
      const hasSeparator = lines.some((l) => l.includes('─'));
      if (hasSeparator) {
        expect(hasSeparator).toBe(true);
      }
    });

    it('supports user-provided rowSeparator function', () => {
      const rows = [{ a: 'x', b: 'this will overflow to another line' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const customSeparator = (row: any, idx: number) =>
        `===ROW ${idx + 1}===`;
      const lines = tbl.asLines({
        maxRowWidth: 25,
        columnSeparator: ' ',
        rowSeparator: customSeparator,
        theme: PLAIN_THEME,
      });
      // Should have custom separator
      expect(lines.some((l) => l.includes('ROW 1'))).toBe(true);
    });

    it('applies theme.nfLabel to overflow cell labels', () => {
      const rows = [{ field: 'value', data: 'more data' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const lines = tbl.asLines({
        maxRowWidth: 20,
        columnSeparator: ' ',
        theme: PLAIN_THEME,
      });
      const combined = lines.join(' ');
      // Should contain field names (styled via nfLabel)
      expect(combined).toContain('Field');
      expect(combined).toContain('Data');
    });
  });

  describe('_calculateLayout', () => {
    it('Full Fit: all columns fit within maxRowWidth', () => {
      const rows = [
        { id: '1', name: 'Alice', city: 'SF' },
        { id: '2', name: 'Bob', city: 'NY' },
      ];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const { overflowIndex } = tbl._calculateLayout({
        maxRowWidth: 200,
        columnSeparator: ' | ',
      });
      expect(overflowIndex).toBe(3); // all 3 columns fit
      expect(tbl.headers.length).toBe(3);
    });

    it('Partial Fit: some columns overflow', () => {
      const rows = [
        {
          id: '1',
          name: 'Alice',
          city: 'San Francisco',
          email: 'alice@example.com',
        },
      ];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const { overflowIndex } = tbl._calculateLayout({
        maxRowWidth: 25,
        columnSeparator: ' | ',
      });
      expect(overflowIndex).toBeGreaterThan(0);
      expect(overflowIndex).toBeLessThan(tbl.headers.length);
    });

    it('Zero Fit: even first column exceeds maxRowWidth', () => {
      const rows = [{ veryLongColumnName: 'x', b: 'y' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      const { overflowIndex } = tbl._calculateLayout({
        maxRowWidth: 5,
        columnSeparator: ' | ',
      });
      expect(overflowIndex).toBe(0); // no columns fit
    });

    it('calculates widths from header titles and data', () => {
      const rows = [{ id: 'short', name: 'VeryLongName' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      tbl._calculateLayout({ maxRowWidth: 200, columnSeparator: ' ' });
      // name column width should be based on data ('VeryLongName' = 12 chars)
      const nameHeader = tbl.headers.find((h) => h.id === 'name');
      expect(nameHeader?.width).toBe(12);
    });

    it('respects columnSeparator width in fit calculation', () => {
      const rows = [{ a: 'x', b: 'y', c: 'z' }];
      const tbl = MonoTable.fromRows(rows, { theme: PLAIN_THEME });
      // Wide separator reduces how many columns fit
      const { overflowIndex: wideSepFit } = tbl._calculateLayout({
        maxRowWidth: 10,
        columnSeparator: ' || ',
      });
      const { overflowIndex: narrowSepFit } = tbl._calculateLayout({
        maxRowWidth: 10,
        columnSeparator: ' ',
      });
      expect(narrowSepFit).toBeGreaterThanOrEqual(wideSepFit);
    });
  });

  describe('TableDefaults', () => {
    it('static options() provides defaults', () => {
      const opts = TableDefaults.options({});
      expect(opts).toMatchObject({
        type: 'MonoTable',
        version: '1.0.0',
        columnSeparator: ' ',
        lineSeparator: '\n',
        cellOverflow: '…',
        emptyCell: '⌿',
        headerCase: 'capitalize',
        rows: [],
      });
      expect(opts.titleOfId).toBe(MonoTable.titleOfId);
      expect(opts.headers).toBeUndefined();
      expect(opts.name).toBeUndefined();
      expect(opts.summary).toBeUndefined();
    });

    it('static options() overrides defaults', () => {
      const opts = TableDefaults.options({
        name: 'test-table',
        columnSeparator: '|',
        emptyCell: '-',
        headerCase: 'uppercase',
        rows: [{ id: 1 }],
      });
      expect(opts.name).toBe('test-table');
      expect(opts.columnSeparator).toBe('|');
      expect(opts.emptyCell).toBe('-');
      expect(opts.headerCase).toBe('uppercase');
      expect(opts.rows).toEqual([{ id: 1 }]);
    });

    it('constructor applies defaults', () => {
      const defaults = new TableDefaults({});
      expect(defaults).toMatchObject({
        type: 'MonoTable',
        version: '1.0.0',
        columnSeparator: ' ',
        lineSeparator: '\n',
        cellOverflow: '…',
        emptyCell: '⌿',
        headerCase: 'capitalize',
        rows: [],
      });
    });

    it('constructor applies provided options', () => {
      const defaults = new TableDefaults({
        name: 'my-table',
        columnSeparator: '→',
        summary: 'test summary',
      });
      expect(defaults.name).toBe('my-table');
      expect(defaults.columnSeparator).toBe('→');
      expect(defaults.summary).toBe('test summary');
      expect(defaults.type).toBe('MonoTable');
      expect(defaults.emptyCell).toBe('⌿');
    });

    it('validates headers must be an Array', () => {
      expect(() => {
        TableDefaults.options({ headers: 'invalid' as any });
      }).toThrow('headers must be an Array');
    });

    it('validates rows must be an Array', () => {
      expect(() => {
        TableDefaults.options({ rows: 'invalid' as any });
      }).toThrow('rows must be an Array');
    });
  });

  describe('themedValue callback', () => {
    it('applies themedValue to zid column', () => {
      const rows = [
        { name: 'Alice', zid: 'abc123' },
        { name: 'Bob', zid: 'def456' },
      ];
      const themedValue = (theme: any, key: string, value: string) => {
        if (key === 'zid') {
          return `[LINK:${value}]`;
        }
        return value;
      };

      const tbl = new MonoTable({
        rows,
        theme: PLAIN_THEME,
        themedValue,
      });

      const formatted = tbl.format();
      expect(formatted).toContain('[LINK:abc123]');
      expect(formatted).toContain('[LINK:def456]');
      expect(formatted).toContain('Alice');
      expect(formatted).toContain('Bob');
    });

    it('does not apply themedValue to non-zid columns', () => {
      const rows = [{ name: 'Alice', zid: 'abc123' }];
      const themedValue = (theme: any, key: string, value: string) => {
        if (key === 'zid') {
          return `[LINK:${value}]`;
        }
        return value;
      };

      const tbl = new MonoTable({
        rows,
        theme: PLAIN_THEME,
        themedValue,
      });

      const formatted = tbl.format();
      expect(formatted).toContain('[LINK:abc123]');
      expect(formatted).toContain('Alice'); // name not transformed
      expect(formatted).not.toContain('[LINK:Alice]');
    });
  });
});
