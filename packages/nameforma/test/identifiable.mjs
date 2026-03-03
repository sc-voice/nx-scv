import { describe, it, expect } from 'vitest';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../index.mjs';
import { DBG } from '../src/defines.mjs';

const { Identifiable } = NameForma;
const { ColorConsole, Unicode, } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const dbg = DBG.IDENTIFIABLE.TEST;
const STARTTEST = '=============';

describe('Identifiable', () => {
  it('uuidv7', () => {
    const msg = 'ti10e.uuidv7';
    dbg > 1 && cc.tag(msg, '==============');
    let uuid0 = Identifiable.uuid({ msecs: 0 });
    let uuid1 = Identifiable.uuid({ msecs: 1 });
    let now = Date.now();
    let idNow = Identifiable.uuid({ msecs: now });

    expect(Identifiable.uuidToTime(idNow)).toBe(now);
    dbg > 1 &&
      cc.tag(
        msg,
        { idNow },
        'uuidToTime:',
        new Date(now).toLocaleTimeString(),
      );

    dbg > 1 && cc.tag(msg, { uuid0 });
    dbg > 1 && cc.tag(msg, { uuid1 });
    expect(uuid1 > uuid0).toBe(true);
    expect(uuid1 < idNow).toBe(true);
    dbg > 1 && cc.tag(msg, 'uuids can be sorted by milliseconds');

    expect(uuidVersion(uuid0)).toBe(7);
    expect(uuidVersion(uuid1)).toBe(7);
    expect(uuidVersion(idNow)).toBe(7);
    expect(uuidValidate(uuid0)).toBe(true);
    expect(uuidValidate(uuid1)).toBe(true);
    expect(uuidValidate(idNow)).toBe(true);

    dbg && cc.tag1(msg + UOK, 'valid v7 uuids');
  });
});
