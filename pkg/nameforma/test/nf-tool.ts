import { describe, it, expect } from '@sc-voice/vitest';
import { validateParams } from '../src/pi/nf-pi/tools/nf-tool.js';

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
