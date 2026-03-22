import { describe, it, expect } from '@sc-voice/vitest';
import { UUID64 } from '@sc-voice/tools';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../index.mjs';
import { DBG } from '../src/defines.mjs';

const { Identifiable } = NameForma;
const { ColorConsole, Unicode } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const dbg = DBG.IDENTIFIABLE.TEST;
const STARTTEST = '=============';

describe('Identifiable', () => {
  it('uuid64', () => {
    const msg = 'ti10e.uuid64';
    dbg > 1 && cc.tag(msg, '==============');
    let uuid0 = Identifiable.uuid();
    let uuid1 = Identifiable.uuid();
    let uuid2 = Identifiable.uuid();

    dbg > 1 && cc.tag(msg, { uuid0 });
    dbg > 1 && cc.tag(msg, { uuid1 });
    dbg > 1 && cc.tag(msg, { uuid2 });

    expect(uuid1 > uuid0).toBe(true);
    expect(uuid2 > uuid1).toBe(true);
    dbg > 1 && cc.tag(msg, 'uuids are strictly increasing');

    expect(Identifiable.validate(uuid0)).toBe(true);
    expect(Identifiable.validate(uuid1)).toBe(true);
    expect(Identifiable.validate(uuid2)).toBe(true);

    dbg && cc.tag1(msg + UOK, 'valid UUID64 identifiers');
  });
});
