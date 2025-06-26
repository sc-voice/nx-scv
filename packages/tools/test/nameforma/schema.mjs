import avro from 'avro-js';
import should from 'should';
import { NameForma, ScvMath } from '../../index.mjs';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Fraction } = ScvMath;
const { Forma, Schema } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.SCHEMA.TEST;
const STARTTEST = '============';

describe('schema', () => {
  function arraySchemaOf(s4aItems) {
    return new Schema({
      type: 'array',
      name: `${s4aItems}Array`,
      items: s4aItems,
      default: [],
    });
  }
  function testArraySchema(s4aItems, thing1) {
    const msg = 's4a.testArraySchema';
    const schema = arraySchemaOf(s4aItems);
    dbg > 1 && cc.tag(msg, s4aItems, 'schema:', schema);
    const type = Schema.register(schema, { avro });
    dbg > 1 && cc.tag(msg, s4aItems, 'type:', type);
    const avro1 = Schema.toAvroArray(thing1, schema);
    should(avro1).not.equal(undefined);
    dbg > 1 && cc.tag(msg, s4aItems, 'avro1:', avro1);
    const buf1 = type.toBuffer(avro1);
    const avro2 = type.fromBuffer(buf1);
    should.deepEqual(avro2, avro1);
    dbg && cc.tag1(msg, s4aItems, 'avro2:', avro2);
  }
  it('ctor', () => {
    const msg = 'ts4a.ctor';
    dbg > 1 && cc.tag(msg, STARTTEST);
    const name = 'test-name';
    const namespace = 'test-namespace';

    let s4aEmpty = new Schema();
    const noName = 'UnnamedSchema';
    should(s4aEmpty).properties({
      name: noName,
      fullName: noName,
    });
    should(s4aEmpty.namespace).equal(undefined);
    dbg > 1 && cc.tag(msg, 'default ctor');

    const fEvil = () => {
      throw new Error(msg, 'EVIL');
    };
    let s4aFun = new Schema({ name, namespace, fullName: fEvil });
    should(s4aFun).properties({
      name,
      namespace,
      fullName: `${namespace}.${name}`,
    });
    dbg > 1 && cc.tag(msg, 'evil ctor');

    let s4a = new Schema({ name, namespace });
    should(s4a).properties({
      name,
      namespace,
      fullName: `${namespace}.${name}`,
    });

    dbg && cc.tag1(msg + UOK, 'typical ctor');
  });
  it('avro', () => {
    const msg = 'tf3a.avro';
    dbg > 1 && cc.tag(msg, STARTTEST);

    const id = 'tavro-id';

    const registry = {};
    const f3a = Forma.SCHEMA;
    dbg > 1 && cc.tag(msg, 'registerSchema');
    let type = Schema.register(Forma.SCHEMA, { avro, registry });
    let typeAgain = Schema.register(Forma.SCHEMA);
    should(typeAgain).equal(type);
    let typeExpected = avro.parse(f3a);
    let name = `${f3a.namespace}.${f3a.name}`;
    should.deepEqual(type, typeExpected);
    should.deepEqual(`"${name}"`, typeExpected.toString());
    should.deepEqual(
      Object.keys(registry).sort(),
      [name, 'string'].sort(),
    );
    should(registry).properties({
      [name]: typeExpected,
    });
    should(Schema.REGISTRY).properties({
      [name]: typeExpected,
    });
    dbg > 1 &&
      cc.tag(msg + UOK, 'parsed schema is added to registry:', name);

    dbg > 1 && cc.tag(msg, 'serialize with schema');
    const thing1 = new Forma({ id });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Forma(parsed);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, 'Forma serialized with avro');
  });
  it('toAvroRecord simple', () => {
    const msg = 'ts4a.toAvroRecord.simple';
    dbg && cc.tag1(msg, STARTTEST);
    const id = 'test-id';
    const clr = 'red';
    const qty = 42;
    const ok = true;

    class TestRecord {
      constructor(cfg) {
        Object.assign(this, cfg);
      }
    }
    const thing1 = new TestRecord({ id, clr, qty, ok });
    const schema = new Schema({
      type: 'record',
      name: thing1.constructor.name,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'clr', type: 'string' },
        { name: 'qty', type: 'double' },
        { name: 'ok', type: 'boolean' },
      ],
    });
    should(schema.name).equal('TestRecord');
    let avro1 = Schema.toAvroRecord(thing1, schema);
    should.deepEqual(avro1, { id, clr, qty, ok });
    dbg && cc.tag1(msg, 'avro1:', avro1);
  });
  it('TESTTESTtoAvroRecord union', () => {
    const msg = 'ts4a.toAvroRecord.union';
    dbg > 1 && cc.tag(msg, STARTTEST);
    const id = 'test-id';
    const clr = 'red';
    const qty = 42;
    const ok = true;

    class TestRecord {
      constructor(cfg) {
        Object.assign(this, cfg);
      }
    }
    const thing1 = new TestRecord({ id, clr, qty, ok });
    const schema = new Schema({
      type: 'record',
      name: thing1.constructor.name,
      fields: [
        { name: 'id', type: ['null', 'string'], default: null },
        { name: 'clr', type: ['null', 'string'], default: null },
        { name: 'qty', type: ['null', 'double'], default: null },
        { name: 'ok', type: ['null', 'boolean'], default: null },
      ],
    });
    should(schema.name).equal('TestRecord');
    let avro1 = Schema.toAvroRecord(thing1, schema);
    let avroType = avro.parse(schema);
    should.deepEqual(avro1, {
      id: { string: id },
      clr: { string: clr },
      qty: { double: qty },
      ok: { boolean: ok },
    });
    dbg && cc.tag1(msg, 'avro1:', avro1);
  });
  it('toAvroArray simple', () => {
    const msg = 'ts4a.toAvroArray.simple';
    dbg > 1 && cc.tag(msg, STARTTEST);

    testArraySchema('string', ['a', 'b', 'c']);
    testArraySchema('string', []);
    testArraySchema('double', [1, 2.1, -5]);
    testArraySchema('double', []);
    testArraySchema('boolean', [true, false]);
    testArraySchema('boolean', []);

    dbg && cc.tag1(msg + UOK);
  });
  it('toAvroArray Fraction', () => {
    const msg = 'ts4a.toAvroArray.Fraction';
    dbg > 1 && cc.tag(msg, STARTTEST);

    if (1 == 2/2) {
      cc.bad1(msg, 'TODO...');
      return;
    }

    let fractionType = Schema.register(Fraction.SCHEMA, { avro });
    let f1 = new Fraction(1, 3, 'inch');

    //function testArraySchema(s4aItems, thing1) {
    //testArraySchema('Fraction', [{ Fraction: f1 }]);
    let s4aItems = 'Fraction';
    let thing1 = [f1];
    const schema = arraySchemaOf(s4aItems);
    dbg > 1 && cc.tag(msg, s4aItems, 'schema:', schema);
    const type = Schema.register(schema, { avro });
    let clone = type.clone(thing1);
    console.log(msg, 'clone', JSON.stringify(clone,null,2));


    let typeSchema = JSON.parse(type.getSchema());
    console.log(msg, 'typeSchema', JSON.stringify(typeSchema,null,2));
    //console.log(msg, 'REGISTRY', Schema.REGISTRY);
    dbg > 1 && cc.tag(msg, s4aItems, 'type:', type);
    const avro1 = Schema.toAvroArray(thing1, schema);
    should(avro1).not.equal(undefined);
    dbg > 1 && cc.tag(msg, s4aItems, 'avro1:', avro1);
    const buf1 = type.toBuffer(avro1);
    const avro2 = type.fromBuffer(buf1);
    should.deepEqual(avro2, avro1);
    dbg && cc.tag1(msg, s4aItems, 'avro2:', avro2);

    dbg && cc.tag1(msg + UOK);
  });
});
