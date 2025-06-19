import should from 'should';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Schema, Forma, IdValue } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.ID_VALUE.TEST;
const STARTTEST = '=============';

describe('IdValue', () => {
  let typeThing = Schema.register(IdValue.SCHEMA, { avro });

  it('uuidv7', () => {
    const msg = 'ti5e.uuidv7';
    dbg > 1 && cc.tag(msg, '==============');
    let uuid0 = IdValue.uuid({ msecs: 0 });
    let uuid1 = IdValue.uuid({ msecs: 1 });
    let now = Date.now();
    let idNow = IdValue.uuid({ msecs: now });

    should(IdValue.uuidToTime(idNow)).equal(now);
    dbg > 1 &&
      cc.tag(
        msg,
        { idNow },
        'uuidToTime:',
        new Date(now).toLocaleTimeString(),
      );

    dbg > 1 && cc.tag(msg, { uuid0 });
    dbg > 1 && cc.tag(msg, { uuid1 });
    should(uuid1).above(uuid0);
    should(uuid1).below(idNow);
    dbg > 1 && cc.tag(msg, 'uuids can be sorted by milliseconds');

    should(uuidVersion(uuid0)).equal(7);
    should(uuidVersion(uuid1)).equal(7);
    should(uuidVersion(idNow)).equal(7);
    should(uuidValidate(uuid0)).equal(true);
    should(uuidValidate(uuid1)).equal(true);
    should(uuidValidate(idNow)).equal(true);
    dbg && cc.tag1(msg + UOK, 'valid v7 uuids');
  });
  it('TESTTESTctor default', () => {
    const msg = 'ti5e.ctor.default';
    let i5e = new IdValue();
    should(uuidValidate(i5e.id)).equal(true);
    should(uuidVersion(i5e.id)).equal(7);
    should(i5e.value).equal(null);
  });
  it('TESTTESTctor boolean', () => {
    const msg = 'ti5e.ctor.boolean';
    let id = 'test-boolean';
    let value = true;
    let i5e = new IdValue({id,value});
    should(i5e).properties({id,value});
  });
  it('TESTTESTctor double', () => {
    const msg = 'ti5e.ctor.double';
    let id = 'test-double';
    let value = Math.PI;
    let i5e = new IdValue({id,value});
    should(i5e).properties({id,value});
  });
  it('TESTTESTctor string', () => {
    const msg = 'ti5e.ctor.string';
    let id = 'test-string';
    let value = 'aString';
    let i5e = new IdValue({id,value});
    should(i5e).properties({id,value});
  });
  it('TESTTESTavro', () => {
    const msg = 'ti5e.avro';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let thing1 = { 
      id: 'array1', 
      value: { 
        array: [
          { id: 'null2', value: null },
          { id: 'str2', value: { string: 'red' } },
          { id: 'double2', value: { double: Math.PI } },
          { id: 'bool2', value: { boolean: true } },
          { id: 'array2', 
            value: { 
              array: [
                { id: 'null3', value: null },
                { id: 'str3', value: { string: 'blue' } },
                { id: 'double3', value: { double: -1 } },
                { id: 'bool3', value: { boolean: false } },
                { id: 'array3', value: { array: [] } },
              ]
            } 
          },
        ]
      }, 
    }
    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    thing2 = JSON.parse(JSON.stringify(thing2));
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg, 'Object thing2:', thing2);
  });
});
