import { describe, it, expect } from '@sc-voice/vitest';
import { FormaField } from '../src/forma-field.js';

describe('FormaField', () => {
  it('defaults label to name when not provided', () => {
    const f = new FormaField('name', true);
    expect(f.label).toBe('name');
  });

  it('uses given label when provided', () => {
    const f = new FormaField('id', false, 'Forma.id');
    expect(f.label).toBe('Forma.id');
  });

  it('immutable field has mutable=false', () => {
    const f = new FormaField('id', false);
    expect(f.mutable).toBe(false);
  });

  it('defaults value to empty string', () => {
    const f = new FormaField('name', true);
    expect(f.value).toBe('');
  });

  it('stores given value', () => {
    const f = new FormaField('name', true, 'Forma.name', 'Karl');
    expect(f.value).toBe('Karl');
  });
});
