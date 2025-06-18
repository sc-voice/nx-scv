import should from 'should';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Schema, Forma, Identifiable } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.IDENTIFIABLE.TEST;
const STARTTEST = '=============';

describe('Identifiable', () => {
  //let typeI10e = avro.parse(Identifiable.SCHEMA);
  let typeI10e = Schema.register(Identifiable.SCHEMA, { avro });

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
    should.deepEqual(Object.keys(i10eA), ['id', 'value']);
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

    dbg && cc.tag1(msg + UOK, 'deserialized', thing2);
  });
  it('avro peek', () => {
    const msg = 'ti10e.avro.peek';
    dbg > 1 && cc.tag(msg, STARTTEST);
    let typeIdentifiable = avro.parse(Identifiable.SCHEMA);

    // Anti-pattern?
    // Should Identifiable be extended in this way?
    class OtherIdentifiable extends Identifiable {
      constructor(cfg = {}) {
        super(cfg);
        this.color = cfg.color || 'no-color';
      }

      get SCHEMA() {
        return {
          name: 'OtherIdentifiable',
          type: 'record',
          fields: [
            ...Identifiable.ID_FIELDS,
            { name: 'color', type: 'string' },
          ],
        };
      }
    } // OtherIdentifiable

    let typeOther = avro.parse(OtherIdentifiable.SCHEMA);
    let thing1 = new Identifiable({ id: 'test-id', color: 'red' });
    let serialized = typeOther.toBuffer(thing1);
    let deserialized = typeOther.fromBuffer(serialized);
    let thing2 = new Identifiable(deserialized);
    dbg > 1 && cc.tag(msg, 'deserialized:', deserialized);
    should.deepEqual(thing2, thing1);
    dbg > 1 && cc.tag(msg, 'deserialized other', thing2);

    let noCheck = true;
    let idTest = typeIdentifiable.fromBuffer(
      serialized,
      undefined,
      noCheck,
    );
    let idPeek = new Identifiable(idTest);
    should(idPeek.id).equal(thing1.id);
    dbg && cc.tag1(msg + UOK, 'can peek id of other things', idPeek);
  });
  it('value boolean', () => {
    const msg = 'ti10e.value.boolean';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let thing1 = new Identifiable({ id: 'test-id', value: true });
    let serialized = typeI10e.toBuffer(thing1.toAvroJson());
    let deserialized = typeI10e.fromBuffer(serialized);
    let thing2 = new Identifiable(deserialized);
    dbg > 1 && cc.tag(msg, 'deserialized:', deserialized);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg, 'deserialized other', thing2);
  });
  it('value string', () => {
    const msg = 'ti10e.value.string';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let thing1 = new Identifiable({ id: 'test-id', value: 'red' });
    let serialized = typeI10e.toBuffer(thing1.toAvroJson());
    let deserialized = typeI10e.fromBuffer(serialized);
    let thing2 = new Identifiable(deserialized);
    dbg > 1 && cc.tag(msg, 'deserialized:', deserialized);
    should.deepEqual(thing2, thing1);
    dbg > 1 && cc.tag(msg, 'deserialized other', thing2);
  });
  it('value double', () => {
    const msg = 'ti10e.value.double';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let thing1 = new Identifiable({ id: 'test-id', value: Math.PI });
    let serialized = typeI10e.toBuffer(thing1.toAvroJson());
    let deserialized = typeI10e.fromBuffer(serialized);
    let thing2 = new Identifiable(deserialized);
    dbg > 1 && cc.tag(msg, 'deserialized:', deserialized);
    should.deepEqual(thing2, thing1);
    dbg > 1 && cc.tag(msg, 'deserialized other', thing2);
  });
  it('TESTTESTvalue boolean array', () => {
    const msg = 'ti10e.value.array';
    dbg > 1 && cc.tag(msg, STARTTEST);
    let schemaIdValue = new Schema({
      type: 'record',
      name: 'IdValue',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'value', type: ['null', 'double'], default: null },
      ],
    });
    let typeIdValue = Schema.register(schemaIdValue, { avro });
    dbg > 1 && cc.tag(msg, 'typeIdValue:', typeIdValue);

    let schemaIVArray = new Schema({
      type: 'array',
      name: 'IVArray',
      //items: 'IdValue',
      items: {
        type: 'record',
        name: 'IVArrayItem',
        fields: [
          { name: 'id', type: 'string' },
          {
            name: 'value',
            type: ['null', 'double', 'IVArrayItem'],
            default: null,
          },
        ],
      },
      default: [],
    });
    let typeIVArray = Schema.register(schemaIVArray, { avro });
    dbg > 1 && cc.tag(msg, 'typeIVArray:', typeIVArray);

    let aPi = { id: 'aPiId', value: { double: Math.PI } };
    let bufPi = typeIdValue.toBuffer(aPi);
    let aPi2 = typeIdValue.fromBuffer(bufPi);
    aPi2 = JSON.parse(JSON.stringify(aPi2));
    should(aPi2).properties(aPi);
    dbg > 1 && cc.tag(msg, 'aPi2:', aPi2);

    let aIVA = [aPi, { id: 'aOther', value: { double: 1 } }];
    let bufIVA = typeIVArray.toBuffer(aIVA);
    let aIVA2 = typeIVArray.fromBuffer(bufIVA);
    dbg && cc.tag(msg, 'anonymous aIVA2:', aIVA2);
    aIVA2 = JSON.parse(JSON.stringify(aIVA2));
    should.deepEqual(aIVA2, aIVA);
    dbg && cc.tag1(msg, 'Object aIVA2:', aIVA2);
  });
});
