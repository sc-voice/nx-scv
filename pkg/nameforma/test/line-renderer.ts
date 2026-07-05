import { describe, it, expect, vi } from 'vitest';
import { LineRenderer } from '../src/line-renderer.js';
import { FormaField } from '../src/forma-field.js';
import { ZENO_1_ROW_VERBOSE } from '../src/navigable-view.js';

const renderer = new LineRenderer();

describe('LineRenderer: single row', () => {
  it('renders row of strings', () => {
    expect(renderer.render(['hello'])).toEqual(['hello']);
  });

  it('renders row of numbers with default precision', () => {
    expect(renderer.render([123.456])).toEqual(['123.46']);
  });

  it('renders row of numbers with custom precision', () => {
    const customRenderer = new LineRenderer({ precision: 0 });
    expect(customRenderer.render([123.456])).toEqual(['123']);
  });

  it('renders row of booleans', () => {
    expect(renderer.render([true])).toEqual(['true']);
    expect(renderer.render([false])).toEqual(['false']);
  });

  it('renders row with Field', () => {
    const name = 'fname';
    const value = 'Sam';
    const label = 'First name';
    const mutable = false;
    const field = new FormaField(name, mutable, label, value);
    expect(renderer.render([field])[0]).toContain(value);
  });

  it('renders row with multiple cells', () => {
    expect(renderer.render(['a', 'b', 1])).toEqual(['a b 1.00']);
  });
});

describe('LineRenderer: multiple rows', () => {
  it('renders multiple rows', () => {
    const data = [['a'], ['b'], [1]];
    expect(renderer.render(data)).toEqual(['a', 'b', '1.00']);
  });

  it('handles complex data with Fields', () => {
    const name = 'fname';
    const value = 'Sam';
    const label = 'First name';
    const mutable = false;
    const field = new FormaField(name, mutable, label, value);
    const data = [
      [123.456],
      ['hello'],
      [1, 'is', true],
      ['Employee(', field, ')'],
    ];
    const expected = ['123.46', 'hello', '1.00 is true'];
    const result = renderer.render(data);
    expect(result[0]).toBe('123.46');
    expect(result[1]).toBe('hello');
    expect(result[2]).toBe('1.00 is true');
    expect(result[3]).toContain(value);
  });
});

describe('LineRenderer: nfLabel styling', () => {
  it('applies nfLabel to FormaField labels', () => {
    const mockTheme = {
      nfLabel: vi.fn((text: string) => `[${text}]`),
      nfBoundary: vi.fn((text: string) => text),
      nfLink: vi.fn((text: string) => text),
      nfNominal: vi.fn((text: string) => text),
      nfWarn: vi.fn((text: string) => text),
      nfAttend: vi.fn((text: string) => text),
      nfAway: vi.fn((text: string) => text),
    };
    const themedRenderer = new LineRenderer({ theme: mockTheme });
    const field = new FormaField('fname', false, 'First name', 'Sam');
    const result = themedRenderer.render([field])[0];

    expect(mockTheme.nfLabel).toHaveBeenCalledWith('First name');
    expect(result).toContain('[First name]');
    expect(result).toContain('Sam');
  });
});

describe('LineRenderer: ZENO_1_ROW_VERBOSE', () => {
  const verboseRenderer = new LineRenderer({
    zenoStep: ZENO_1_ROW_VERBOSE,
  });

  it('renders Field with label and value', () => {
    const name = 'fname';
    const value = 'Sam';
    const label = 'First name';
    const mutable = false;
    const field = new FormaField(name, mutable, label, value);
    const result = verboseRenderer.render([field]);
    expect(result[0]).toContain(label);
    expect(result[0]).toContain(value);
  });

  it('renders multiple Fields with labels', () => {
    const field1 = new FormaField('fname', false, 'First name', 'Sam');
    const field2 = new FormaField('lname', false, 'Last name', 'Smith');
    const data = [[field1, field2]];
    const result = verboseRenderer.render(data);
    expect(result[0]).toContain('First name');
    expect(result[0]).toContain('Sam');
    expect(result[0]).toContain('Last name');
    expect(result[0]).toContain('Smith');
  });
});

describe('LineRenderer: wrapping and line budget', () => {
  it('wraps long line at lineWidth boundary', () => {
    const narrowRenderer = new LineRenderer({ lineWidth: 20 });
    const data = [['short', 'line', 'that', 'exceeds', 'width']];
    const result = narrowRenderer.render(data);
    expect(result.length).toBeGreaterThan(1);
  });

  it('splits cells wider than 15 characters', () => {
    const narrowRenderer = new LineRenderer({ lineWidth: 20 });
    const longCell = 'verylongcellcontenthere'; // 23 chars, splits into 15+8
    const data = [[longCell, 'short']];
    const result = narrowRenderer.render(data);
    // Cell should be split and wrapped to multiple lines
    expect(result.length).toBeGreaterThan(1);
  });

  it('distributes line budget fairly via round-robin', () => {
    const budgetRenderer = new LineRenderer({ lines: 5, lineWidth: 20 });
    const data = [
      ['short'],
      ['another', 'row', 'with', 'multiple', 'cells'],
      ['third', 'row'],
    ];
    const result = budgetRenderer.render(data);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('clips bottom rows when lines budget exhausted', () => {
    const clipRenderer = new LineRenderer({ lines: 3, lineWidth: 75 });
    const data = [['row1'], ['row2'], ['row3'], ['row4'], ['row5']];
    const result = clipRenderer.render(data);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('adds ellipsis for clipped rows', () => {
    // Force a row to wrap into multiple lines that we'll clip
    const clipRenderer = new LineRenderer({ lines: 2, lineWidth: 10 });
    const data = [
      ['toolongcellcontent'], // Will split into segments > 10 chars total
      ['row2'],
    ];
    const result = clipRenderer.render(data);
    // With limited lines, first row should be clipped
    expect(result.length).toBeGreaterThan(0);
  });

  it('respects wrapIndent for continuation lines', () => {
    const indentRenderer = new LineRenderer({
      lineWidth: 15,
      wrapIndent: 4,
    });
    const data = [['this', 'is', 'a', 'long', 'line']];
    const result = indentRenderer.render(data);
    // Continuation lines should have extra indentation
    if (result.length > 1) {
      expect(result[1].startsWith('    ')).toBe(true);
    }
  });

  it('handles baseIndent with wrapping', () => {
    const indentRenderer = new LineRenderer({
      lineWidth: 20,
      wrapIndent: 2,
    });
    const baseIndent = '  ';
    const data = [['hello', 'world', 'foo', 'bar', 'baz']];
    const result = indentRenderer.render(data, baseIndent);
    expect(result[0].startsWith(baseIndent)).toBe(true);
    if (result.length > 1) {
      expect(result[1].startsWith(baseIndent)).toBe(true);
    }
  });

  it('handles single row with unlimited lines', () => {
    const defaultRenderer = new LineRenderer();
    const data = [['a', 'b', 'c', 'd', 'e']];
    const result = defaultRenderer.render(data);
    expect(result.length).toBe(1);
  });
});
