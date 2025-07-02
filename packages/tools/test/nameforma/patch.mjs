import should from 'should';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Rational, Forma, Patch, Schema, Identifiable, IdValue } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { ScvMath } from '../../index.mjs';
import { DBG } from '../../src/nameforma/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.PATCH.TEST;
const STARTTEST = '=============';

const aString = 'red';
const aDouble = Math.PI;
const aBoolean = true;
const aRational = new Rational(1, 3, 'inch');

class IdRecord extends Identifiable {
  constructor({ id }) {
    super(id);
    this.aNull = null;
    this.aString = aString;
    this.aDouble = aDouble;
    this.aBoolean = aBoolean;
    this.aRational = aRational;
  }
}

describe('Patch', () => {
  const dbg = DBG.PATCH.TEST;
  const registry = {};
  let patchType = Schema.register(Patch.SCHEMA, { avro, registry });

  it('ctor default', () => {
    const msg = 'ti5e.ctor.default';
    let thing1 = new Patch();
    should(uuidValidate(thing1.id)).equal(true);
    should(uuidVersion(thing1.id)).equal(7);
    should(thing1.value).equal(null);
    should(thing1).instanceOf(Identifiable);

    let buf1 = patchType.toBuffer(thing1);
    let thing2 = patchType.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    should.deepEqual(
      JSON.parse(JSON.stringify(thing2)),
      JSON.parse(JSON.stringify(thing1)),
    );
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('Patch object without class', () => {
    const msg = 'ti5e.patch.object';

    function Patch() {
      this.a = 1.23;
    }
    let p3h = new Patch();
    should(p3h.constructor.name).equal('Patch');
    should(p3h.a).equal(1.23);
    dbg && cc.tag1(msg + UOK, 'p3h:', p3h);
  });
  it('null', () => {
    const msg = 'ti5e.null';
    let id = 'test-null';
    let value = null;
    let thing1 = { id, value };
    let avro1 = Patch.toAvroSchema({ id, value });
    should(avro1).properties({ id, value: null });

    let buf1 = patchType.toBuffer(avro1);
    let avro2 = patchType.fromBuffer(buf1);
    let thing2 = Patch.fromAvroSchema(avro2);
    dbg > 1 && cc.tag(msg, 'thing2:', thing2);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('boolean', () => {
    const msg = 'ti5e.boolean';
    let id = 'test-boolean';
    let value = true;
    let thing1 = { id, value };
    let avro1 = Patch.toAvroSchema({ id, value });
    should(avro1).properties({ id, value: { boolean: value } });

    let buf1 = patchType.toBuffer(avro1);
    let avro2 = patchType.fromBuffer(buf1);
    let thing2 = Patch.fromAvroSchema(avro2);
    dbg > 1 && cc.tag(msg, 'thing2:', thing2);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('double', () => {
    const msg = 'ti5e.double';
    let id = 'test-double';
    let value = Math.PI;
    let thing1 = { id, value };
    let avro1 = Patch.toAvroSchema({ id, value });
    should(avro1).properties({ id, value: { double: value } });

    let buf1 = patchType.toBuffer(avro1);
    let avro2 = patchType.fromBuffer(buf1);
    let thing2 = Patch.fromAvroSchema(avro2);
    dbg > 1 && cc.tag(msg, 'thing2:', thing2);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('string', () => {
    const msg = 'ti5e.string';
    let id = 'test-string';
    let value = 'aString';
    let thing1 = { id, value };
    let avro1 = Patch.toAvroSchema({ id, value });
    should(avro1).properties({ id, value: { string: value } });

    let buf1 = patchType.toBuffer(avro1);
    let avro2 = patchType.fromBuffer(buf1);
    let thing2 = Patch.fromAvroSchema(avro2);
    dbg > 1 && cc.tag(msg, 'thing2:', thing2);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, thing2);
  });
  it('Rational', () => {
    const msg = 'ti5e.Rational';
    let id = 'test-Rational';
    let value = new Rational(1, 3, 'inch');
    let thing1 = { id, value };
    let avro1 = Patch.toAvroSchema(thing1);
    should(avro1).properties({ id, value: { Rational: value } });
    dbg > 1 && cc.tag(msg, 'avro1:', avro1);

    let buf1 = patchType.toBuffer(avro1);
    let avro2 = patchType.fromBuffer(buf1);
    let avroRational = avro2.value.Rational; // {Rational: Rational}
    should(avroRational.$isValid()).equal(true);
    should(avroRational.$getType()).equal(registry.Rational);
    dbg > 1 && cc.tag(msg, 'avro2:', avro2);

    let thing2 = Patch.fromAvroSchema(avro2);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, 'thing2:', thing2);
  });
  it('toAvroValue() null', () => {
    const msg = 'ti5e.toAvroValue.null';
    dbg > 1 && cc.tag(msg, STARTTEST);

    should(Patch.toAvroValue(undefined)).equal(null);
    should(Patch.toAvroValue(null)).equal(null);
    dbg > 1 && cc.tag(msg, 'null');

    dbg && cc.tag1(msg + UOK, STARTTEST);
  });
  it('toAvroValue() boolean', () => {
    const msg = 'ti5e.toAvroValue.boolean';
    dbg > 1 && cc.tag(msg, STARTTEST);

    should.deepEqual(Patch.toAvroValue(false), { boolean: false });
    should.deepEqual(Patch.toAvroValue(true), { boolean: true });

    dbg && cc.tag1(msg + UOK);
  });
  it('toAvroValue() string', () => {
    const msg = 'ti5e.toAvroValue.string';
    dbg > 1 && cc.tag(msg, STARTTEST);

    should.deepEqual(Patch.toAvroValue(''), { string: '' });
    should.deepEqual(Patch.toAvroValue('asdf'), { string: 'asdf' });

    dbg && cc.tag1(msg + UOK);
  });
  it('toAvroValue() double', () => {
    const msg = 'ti5e.toAvroValue.double';
    dbg > 1 && cc.tag(msg, STARTTEST);

    should.deepEqual(Patch.toAvroValue(-Math.PI), { double: -Math.PI });
    dbg > 1 && cc.tag(msg, 'double');

    let eCaught;
    try {
      eCaught = undefined;
      let nan = Number('asdf');
      should(Number.isNaN(nan)).equal(true);
      should(typeof nan).equal('number');
      let nanAvro = Patch.toAvroValue(nan);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught?.message).match(/NaN/);
    dbg > 1 && cc.tag(msg, 'NaN');

    try {
      eCaught = undefined;
      let inf = 1 / 0;
      should(Number.isNaN(inf)).equal(false);
      should(typeof inf).equal('number');
      let infAvro = Patch.toAvroValue(inf);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught?.message).match(/Infinity/);
    dbg > 1 && cc.tag(msg, 'Infinity');

    dbg && cc.tag1(msg + UOK);
  });
  it('toAvroValue Function', () => {
    const msg = 'ti5e.toAvroValue.Function';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let value = () => 'test-fun';
    let eCaught;
    try {
      let vAvro = Patch.toAvroValue(value);
    } catch (e) {
      eCaught = e;
    }
    should(eCaught?.message).match(/type\?/);

    dbg && cc.tag(msg + UOK);
  });
  it('toAvroValue Object', () => {
    const msg = 'ti5e.toAvroValue.Object';
    if (1 == 2 / 2) {
      cc.bad1(msg, 'TODO?');
      return;
    }
    let id = 'test-obj';
    let aString = 'red';
    let aBool = false;
    let aDouble = Math.PI;
    let aRational = new Rational(1, 3, 'inch');
    let thing1 = { id, aString, aBool, aDouble, aRational };
    let avro1 = Patch.toAvroSchema(thing1);
    should(avro1.id).equal(id);
    should.deepEqual(avro1.value, {
      array: [
        { id: 'aString', value: { string: aString } },
        { id: 'aBool', value: { boolean: aBool } },
        { id: 'aDouble', value: { double: Math.PI } },
        { id: 'aRational', value: { Rational: aRational } },
      ],
    });

    let buf1 = patchType.toBuffer(avro1);
    let avro2 = patchType.fromBuffer(buf1);
    should(avro2.$isValid()).equal(true);
    should.deepEqual(
      JSON.parse(JSON.stringify(avro2)),
      JSON.parse(JSON.stringify(avro1)),
    );
    dbg > 1 && cc.tag(msg, 'avro2:', avro2);

    let thing2 = Patch.fromAvroSchema(avro2);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, 'thing2:', thing2);
  });
  it('toAvroSchema', () => {
    const msg = 'p3h.toAvroSchema';
    if (1 == 2 / 2) {
      cc.bad1(msg, 'TODO?');
      return;
    }
    let id = 'test-id';
    let thing1 = new IdRecord({ id });
    let patch = Patch.toAvroSchema(thing1);
    should.deepEqual(
      JSON.parse(JSON.stringify(patch)),
      JSON.parse(
        JSON.stringify({
          id,
          value: {
            array: [
              { id: 'aNull', value: null },
              { id: 'aString', value: { string: aString } },
              { id: 'aDouble', value: { double: aDouble } },
              { id: 'aBoolean', value: { boolean: aBoolean } },
              { id: 'aRational', value: { Rational: aRational } },
            ],
          },
        }),
      ),
    );

    dbg && cc.tag1(msg + UOK, 'deserialized:', patch);
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
    let buf1 = patchType.toBuffer(thing1);
    let thing2 = patchType.fromBuffer(buf1);
    dbg && cc.tag(msg, 'anonymous thing2:', thing2);
    thing2 = JSON.parse(JSON.stringify(thing2));
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg, 'Object thing2:', thing2);
  });
});

class Patchable extends Forma {
  #patch = {};
  #unpatch = {};

  constructor(cfg = {}) {
    const msg = 'p7e.ctor';
    super(cfg);
    let { color = 'color?', size = 0, ok = true } = cfg;
    Object.assign(this, { color, size, ok });
  }

  get patch() {
    return JSON.parse(JSON.stringify(this.#patch));
  }

  get unpatch() {
    return JSON.parse(JSON.stringify(this.#unpatch));
  }

  set(key, value) {
    const msg = 'p7e.set';
    if (typeof key !== 'string' || !/[a-z][a-z0-9_]*/.test(key)) {
      throw new Error(`${msg} key? ${key}`);
    }

    this.#unpatch[key] = this[key];
    this.#patch[key] = value;
    this[key] = value;
  }
}

describe('Patchable', () => {
  class TestPatchable extends Patchable {
    constructor(cfg = {}) {
      super(cfg);
    }
  }
  it('ctor()', () => {
    const msg = 'tp7e.ctor';
    const color = 'color?';
    const size = 0;
    const ok = true;
    let thing1 = new TestPatchable();
    should(thing1).properties({ color, size, ok });
    dbg && cc.tag(msg, 'thing1:', thing1);
    should(thing1.validate({ defaultIdName: true })).equal(true);
    should(JSON.stringify(thing1.patch)).equal('{}');
    dbg && cc.tag1(msg + UOK, thing1);
  });
  it('set()', () => {
    const msg = 'tp7e.set';
    const color = 'red';
    const size = 42;
    const ok = false;
    let thing1 = new TestPatchable();
    let { color: oldColor, size: oldSize, ok: oldOk } = thing1;
    dbg && cc.tag(msg, 'thing1:', thing1);
    should.deepEqual(thing1.patch, {});
    should.deepEqual(thing1.unpatch, {});

    thing1.set('color', color);
    should(thing1).properties({ color });
    should.deepEqual(thing1.patch, { color });
    should.deepEqual(thing1.unpatch, { color: oldColor });

    thing1.set('size', size);
    should(thing1).properties({ color, size });
    should.deepEqual(thing1.patch, { color, size });
    should.deepEqual(thing1.unpatch, { color: oldColor, size: oldSize });

    thing1.set('ok', ok);
    should(thing1).properties({ color, size, ok });
    should.deepEqual(thing1.patch, { color, size, ok });
    should.deepEqual(thing1.unpatch, {
      color: oldColor,
      size: oldSize,
      ok: oldOk,
    });

    dbg && cc.tag1(msg + UOK, thing1);
  });
}); // Patch
