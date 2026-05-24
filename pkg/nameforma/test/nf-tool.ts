import { describe, it, expect } from '@sc-voice/vitest';
import { validateParams, arg } from '../src/pi/nf-pi/tools/nf-tool.js';

describe('validateParams', () => {
  it('throws error when fuzzy_id is null for set_field_value', () => {
    expect(() => {
      validateParams('set_field_value', {
        fuzzy_id: null,
        field: 'name',
        value: 'test',
      });
    }).toThrow('Missing required parameters for set_field_value: fuzzy_id');
  });

  it('throws error when field is undefined for set_field_value', () => {
    expect(() => {
      validateParams('set_field_value', {
        fuzzy_id: 'abc123',
        value: 'test',
      });
    }).toThrow('Missing required parameters for set_field_value: field');
  });

  it('throws error when value is null for set_field_value', () => {
    expect(() => {
      validateParams('set_field_value', {
        fuzzy_id: 'abc123',
        field: 'name',
        value: null,
      });
    }).toThrow('Missing required parameters for set_field_value: value');
  });

  it('throws error when multiple params are missing', () => {
    expect(() => {
      validateParams('set_field_value', {
        fuzzy_id: null,
        field: null,
        value: null,
      });
    }).toThrow('Missing required parameters for set_field_value: fuzzy_id, field, value');
  });

  it('passes when all required params are provided', () => {
    expect(() => {
      validateParams('set_field_value', {
        fuzzy_id: 'abc123',
        field: 'name',
        value: 'new-name',
      });
    }).not.toThrow();
  });

  it('throws error for unknown operation', () => {
    expect(() => {
      validateParams('unknown-op', {});
    }).toThrow('Unknown operation: unknown-op');
  });

  it('throws error when fuzzy_id is string "null"', () => {
    expect(() => {
      validateParams('set_field_value', {
        fuzzy_id: 'null',
        field: 'name',
        value: 'test',
      });
    }).toThrow('Missing required parameters for set_field_value: fuzzy_id');
  });
});

describe('arg() shell escaping', () => {
  it('wraps value in single quotes and escapes internal single quotes', () => {
    expect(arg("a 'b' c")).toBe(` 'a "b" c'`);
  });

  it('prevents bash injection with $', () => {
    expect(arg('$HOME')).toBe(" '$HOME'");
  });

  it('rejects command substitution syntax', () => {
    expect(() => {
      arg('$(rm EVIL /)');
    }).toThrow('Command substitution not allowed');
  });

  it('prevents bash injection with backticks', () => {
    expect(arg('`cat /etc/passwd`')).toBe(" '`cat /etc/passwd`'");
  });

  it('returns empty arg for null', () => {
    expect(arg(null)).toBe('');
  });

  it('returns empty arg for undefined', () => {
    expect(arg(undefined)).toBe('');
  });

  it('returns single-quoted empty string for empty string', () => {
    expect(arg('')).toBe(" ''");
  });

  it('preserves spaces and special characters literally', () => {
    expect(arg('hello world & other')).toBe(" 'hello world & other'");
  });

  it('handles multiple single quotes', () => {
    expect(arg("'a' 'b' 'c'")).toBe(` '"a" "b" "c"'`);
  });
});
