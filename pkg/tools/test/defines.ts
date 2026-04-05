import { describe, it, expect } from '@sc-voice/vitest';
import { DBG } from '../src/defines.ts';

describe('defines', () => {
  it('DBG has expected structure', () => {
    expect(DBG).toBeDefined();
    expect(typeof DBG).toBe('object');
  });

  it('DBG.FRACTION exists with expected properties', () => {
    expect(DBG.FRACTION).toBeDefined();
    expect(DBG.FRACTION.REDUCE).toBe(0);
    expect(DBG.FRACTION.TEST).toBe(0);
  });

  it('DBG.COLOR_CONSOLE exists with expected properties', () => {
    expect(DBG.COLOR_CONSOLE).toBeDefined();
    expect(DBG.COLOR_CONSOLE.AS_STRING).toBe(0);
    expect(DBG.COLOR_CONSOLE.INSPECT).toBe(0);
    expect(DBG.COLOR_CONSOLE.SRC).toBe(0);
    expect(DBG.COLOR_CONSOLE.TEST).toBe(0);
    expect(DBG.COLOR_CONSOLE.PROPS_NEXT).toBe(0);
  });

  it('DBG has top-level debug flags', () => {
    expect(DBG.ALIGN_ALL).toBe(0);
    expect(DBG.ALIGN_LINE).toBe(0);
    expect(DBG.DEEPL_ADAPTER).toBe(0);
    expect(DBG.DEEPL_MOCK).toBe(0);
    expect(DBG.DEEPL_MOCK_XLT).toBe(0);
    expect(DBG.DEEPL_TEST_API).toBe(0);
    expect(DBG.DEEPL_XLT).toBe(0);
  });

  it('DBG has nested structures', () => {
    expect(DBG.M2H).toBeDefined();
    expect(DBG.M2H.H6D).toBeDefined();
    expect(DBG.M2H.H6D.FWHT).toBe(0);
    expect(DBG.M2H.H6D.ENCODE).toBe(0);
    expect(DBG.M2H.H6D.DECODE).toBe(0);

    expect(DBG.S5H).toBeDefined();
    expect(DBG.S5H.U3S).toBeDefined();
    expect(DBG.S5H.U3S.CONVERT_FRACTION).toBe(0);

    expect(DBG.T2T).toBeDefined();
    expect(DBG.T2T.HADAMARD).toBe(0);
  });
});
