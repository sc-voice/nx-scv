import { describe, it, expect } from 'vitest';
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
    expect(renderer.render([field])).toEqual([value]);
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
    const expected = [
      '123.46',
      'hello',
      '1.00 is true',
      `Employee( ${value} )`,
    ];
    expect(renderer.render(data)).toEqual(expected);
  });
});

describe('LineRenderer: ZENO_1_ROW_VERBOSE', () => {
  const verboseRenderer = new LineRenderer({ zenoStep: ZENO_1_ROW_VERBOSE });

  it('renders Field with label and value', () => {
    const name = 'fname';
    const value = 'Sam';
    const label = 'First name';
    const mutable = false;
    const field = new FormaField(name, mutable, label, value);
    expect(verboseRenderer.render([field])).toEqual([`${label}:${value}`]);
  });

  it('renders multiple Fields with labels', () => {
    const field1 = new FormaField('fname', false, 'First name', 'Sam');
    const field2 = new FormaField('lname', false, 'Last name', 'Smith');
    const data = [[field1, field2]];
    expect(verboseRenderer.render(data)).toEqual([
      `First name:Sam Last name:Smith`,
    ]);
  });
});
