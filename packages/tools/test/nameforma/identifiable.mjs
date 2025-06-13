import should from 'should';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Identifiable } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
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

    should(Identifiable.uuidToTime(idNow)).equal(now);
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
  it('ctor default', () => {
    const msg = 'ti10e.ctor.default';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let i10eA = new Identifiable();
    should(i10eA).instanceOf(Identifiable);
    should.deepEqual(Object.keys(i10eA), ['id']);
    should(uuidValidate(i10eA.id)).equal(true);
    dbg > 1 && cc.tag(msg, 'i10eA.id:', i10eA.id);

    let i10eB = new Identifiable();
    should(uuidValidate(i10eB.id)).equal(true);
    should(i10eB.id).not.equal(i10eA.id);
    dbg > 1 && cc.tag(msg, 'i10eB.id:', i10eB.id);

    should(i10eB.id).above(i10eA.id); 
    dbg && cc.tag1(msg + UOK, 'i10eB.id > i10eA.id');
  });
  it('avro serialize', () => {
    const msg = 'ti10e.avro.serialize';
    dbg > 1 && cc.tag(msg, STARTTEST);
    let type = avro.parse(Identifiable.SCHEMA);

    let thing1 = new Identifiable();
    let serialized = type.toBuffer(thing1);
    let deserialized = type.fromBuffer(serialized);
    let thing2 = new Identifiable(deserialized);
    dbg > 1 && cc.tag(msg, 'deserialized:', deserialized);
    should.deepEqual(thing2, thing1);

    dbg && cc.tag1(msg+UOK, 'deserialized', thing2);
  });
  it('avro peek', () => {
    const msg = 'ti10e.avro.peek';
    dbg > 1 && cc.tag(msg, STARTTEST);
    let typeIdentifiable = avro.parse(Identifiable.SCHEMA);
    let typeOther = avro.parse({
      name: 'OtherIdentifiable',
      type: 'record',
      fields: [
        ...Identifiable.SCHEMA_FIELDS,
        { name: 'color', type: 'string' },
      ],
    });

    let thing1 = { id:'test-id', color: 'red' }
    let serialized = typeOther.toBuffer(thing1);
    let deserialized = typeOther.fromBuffer(serialized);
    let thing2 = Object.assign({}, deserialized);
    dbg > 1 && cc.tag(msg, 'deserialized:', deserialized);
    should.deepEqual(thing2, thing1);
    dbg > 1 && cc.tag(msg, 'deserialized other', thing2);

    let noCheck = true;
    let idTest = typeIdentifiable.fromBuffer(serialized, undefined, noCheck);
    let idPeek = new Identifiable(idTest);
    should(idPeek.id).equal(thing1.id);
    dbg && cc.tag1(msg+UOK, 'can peek id of other things', idPeek);
  });
});
