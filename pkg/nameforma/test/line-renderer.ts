import { describe, it, expect } from 'vitest';
import { LineRenderer } from '../src/line-renderer.js';
import { FormaField } from '../src/forma-field.js';

const renderer = new LineRenderer();

describe('LineRenderer: atomic', () => {
  it('renders strings', () => {
    expect(renderer.render('hello')).toEqual(['hello']);
  });

  it('renders numbers with default precision', () => {
    expect(renderer.render(123.456)).toEqual(['123.46']);
  });

  it('renders numbers with custom precision', () => {
    const customRenderer = new LineRenderer({ precision: 0 });
    expect(customRenderer.render(123.456)).toEqual(['123']);
  });

  it('renders booleans', () => {
    expect(renderer.render(true)).toEqual(['true']);
    expect(renderer.render(false)).toEqual(['false']);
  });

  it('renders Field', () => {
    const name = 'fname';
    const value = 'Sam';
    const label = 'First name';
    const mutable = false;
    const field = new FormaField(name, mutable, label, value);
    const expected = [ `${label}:${value}` ];
    expect(renderer.render(field)).toEqual(expected);
  });
});

describe('LineRenderer: single line', () => {
  it('renders arrays by flattening them', () => {
    expect(renderer.render(['a', 'b', 1])).toEqual(['a', 'b', '1.00']);
  });
});

describe('LineRenderer: multi-line', () => {
  it('handles complex arrays and objects', () => {
    const name = 'fname';
    const value = 'Sam';
    const label = 'First name';
    const mutable = false;
    const field = new FormaField(name, mutable, label, value);
    const data = [
      123.456,
      'hello',
      [1, 'is', true],
      [ 'Employee(', field, ')' ],
    ];
    const expected = [
      '123.46',
      'hello',
      '1.00 is true',
      'Employee( First name:Sam )',
    ];
    expect(renderer.render(data)).toEqual(expected);
  });
});
