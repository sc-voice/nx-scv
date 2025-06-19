import should from 'should';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Patch, Schema, Identifiable, IdValue } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { ScvMath } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { Fraction } = ScvMath;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.ID_VALUE.TEST;
const STARTTEST = '=============';

const aString = 'red';
const aDouble = Math.PI;
const aBoolean = true;
const aFraction = new Fraction(1,3, 'inch');

class IdRecord extends Identifiable {
  constructor({id}) {

    super(id);
    this.aNull = null;
    this.aString = aString;
    this.aDouble = aDouble;
    this.aBoolean = aBoolean;
    this.aFraction = aFraction;
  }
}

describe('Patch', () => {
  const dbg = DBG.PATCH.TEST;
  let typeThing = Schema.register(Patch.SCHEMA, { avro });

  it('ctor default', () => {
    const msg = 'ti5e.ctor.default';
    let thing1 = new Patch();
    should(uuidValidate(thing1.id)).equal(true);
    should(uuidVersion(thing1.id)).equal(7);
    should(thing1.value).equal(null);
    should(thing1).instanceOf(Identifiable);

    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)), 
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('Patch object without class', () => {
    const msg = 'ti5e.patch.object';

    function Patch() { this.a = 1.23; };
    let p3h = new Patch();
    should(p3h.constructor.name).equal('Patch');
    should(p3h.a).equal(1.23);
    dbg && cc.tag1(msg+UOK, 'p3h:', p3h);
  });
  it('boolean', () => {
    const msg = 'ti5e.boolean';
    let id = 'test-boolean';
    let value = true;
    let thing1 = new Patch({ id, value });
    should(thing1).properties({ id, value: {boolean: value} });
    
    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)), 
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('double', () => {
    const msg = 'ti5e.double';
    let id = 'test-double';
    let value = Math.PI;
    let thing1 = new Patch({ id, value });
    should(thing1).properties({ id, value: {double: value} });

    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)), 
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('string', () => {
    const msg = 'ti5e.string';
    let id = 'test-string';
    let value = 'aString';
    let thing1 = new Patch({ id, value });
    should(thing1).properties({ id, value: {string: value} });

    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)), 
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('Fraction', () => {
    const msg = 'ti5e.Fraction';
    let id = 'test-Fraction';
    let value = new Fraction(1,3, 'inch');
    let thing1 = new Patch({ id, value });
    should(thing1).properties({ id, value: { Fraction: value} });
    dbg && cc.tag1(msg + UOK);

    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)), 
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('Object', () => {
    const msg = 'ti5e.Object';
    let id = 'test-obj';
    let aString = 'red';
    let aBool = false;
    let aDouble = Math.PI;
    let aFraction = new Fraction(1,3,'inch');
    let value = { id, aString, aBool, aDouble, aFraction, };
    let thing1 = new Patch({ id, value });
    should(thing1.id).equal(id);
    should.deepEqual(thing1.value, { 
      array: [
        { id:'aString', value:{string: aString} },
        { id:'aBool', value:{boolean: aBool} },
        { id:'aDouble', value:{double: Math.PI} },
        { id:'aFraction', value:{Fraction: aFraction} },
      ],
    });
    dbg && cc.tag1(msg + UOK);

    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)), 
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, 'avro deserialized:', thing2);
  });
}); // Patch

describe('IdValue', () => {
  let typeThing = Schema.register(IdValue.SCHEMA, { avro });

  it('uuidv7', () => {
    const msg = 'ti5e.uuidv7';
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
  it('avro', () => {
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
          {
            id: 'array2',
            value: {
              array: [
                { id: 'null3', value: null },
                { id: 'str3', value: { string: 'blue' } },
                { id: 'double3', value: { double: -1 } },
                { id: 'bool3', value: { boolean: false } },
                { id: 'array3', value: { array: [] } },
              ],
            },
          },
        ],
      },
    };
    let buf1 = typeThing.toBuffer(thing1);
    let thing2 = typeThing.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    thing2 = JSON.parse(JSON.stringify(thing2));
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg, 'Object thing2:', thing2);
  });
  it('TESTTESTfromIdentifiable', ()=>{
    const msg = 'p3h.fromIdentifiable';
    let id = 'test-id';
    let thing1 = new IdRecord({id});
    let patch = Patch.fromIdentifiable(thing1);
    should.deepEqual(
      JSON.parse(JSON.stringify(patch)),
      JSON.parse(JSON.stringify({
        id,
        value: {
          array: [
            {id:'aNull', value: null},
            {id:'aString', value: {string: aString}},
            {id:'aDouble', value: {double: aDouble}},
            {id:'aBoolean', value: {boolean: aBoolean}},
            {id:'aFraction', value: {Fraction: aFraction}},
          ],
        }
      }))
    );

    dbg && cc.tag1(msg+UOK, 'deserialized:', patch);
  });
  it('toIdentifiable', ()=>{
    const msg = 'p3h.toIdentifiable';
    let id = 'test-id';
    let thing1 = new IdRecord({id});
    should(thing1.id).equal(id);
    should(thing1.aNull).equal(null);
    should(thing1.aString).equal(aString);
    let patch = Patch.fromIdentifiable(thing1);
    should.deepEqual(
      JSON.parse(JSON.stringify(patch)),
      JSON.parse(JSON.stringify({
        id,
        value: {
          array: [
            {id:'aNull', value: null},
            {id:'aString', value: {string: aString}},
            {id:'aDouble', value: {double: aDouble}},
            {id:'aBoolean', value: {boolean: aBoolean}},
            {id:'aFraction', value: {Fraction: aFraction}},
          ],
        }
      }))
    )
    cc.tag1(msg+UOK, patch);
  });
});
