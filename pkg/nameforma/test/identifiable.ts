import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';

const { Identifiable } = NameForma;
const { ColorConsole, Unicode, } = Text;
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

    expect(uuid1.compare(uuid0) > 0).toBe(true);
    expect(uuid2.compare(uuid1) > 0).toBe(true);
    dbg > 1 && cc.tag(msg, 'uuids are strictly increasing');

    expect(uuid0.validate()).toBe(true);
    expect(uuid1.validate()).toBe(true);
    expect(uuid2.validate()).toBe(true);

    dbg && cc.tag1(msg + UOK, 'valid UUID64 identifiers');
  });

  it('SCHEMA', () => {
    const msg = 'ti10e.SCHEMA';
    dbg > 1 && cc.tag(msg, '==============');
    const schema = Identifiable.SCHEMA;

    expect(schema.name).toBe('Identifiable');
    expect(schema.namespace).toBe('scvoice.nameforma');
    expect(schema.type).toBe('record');
    expect(schema.fields).toBeDefined();
    expect(schema.fields.length).toBe(1);
    expect(schema.fields[0].name).toBe('id');

    dbg && cc.tag1(msg + UOK, 'SCHEMA correctly defined');
  });
});
