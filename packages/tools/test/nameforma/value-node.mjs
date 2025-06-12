import avro from 'avro-js';
import should from 'should';
import { NameForma } from '../../index.mjs';
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';

const { ValueNode } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const dbg = DBG.T2T.VALUE_NODE;
const STARTTEST = '============';

describe('TESTTESTValueNode', ()=>{
  let type = avro.parse(ValueNode.SCHEMA);

  it('ValueNode null', () => {
    const msg = 'tc4r.ValueNode.null';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let value = null;
    let thing1 = ValueNode.create(value);
    should(thing1.value).equal(value);
    let buf = type.toBuffer(thing1);
    let thingB = type.fromBuffer(buf);
    let thing2 = new ValueNode(thingB);
    should(thing2.value).equal(value);
    dbg && cc.tag1(msg, 'deserialized:', thing2.value);
  });
  it('ValueNode string', () => {
    const msg = 'tc4r.ValueNode.string';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let value = 'testString';
    let thing1 = ValueNode.create(value);
    should(thing1.value).equal(value);
    let buf = type.toBuffer(thing1);
    let thingB = type.fromBuffer(buf);
    let thing2 = new ValueNode(thingB);
    should(thing2.value).equal(value);
    dbg && cc.tag1(msg, 'deserialized:', thing2.value);
  });
  it('ValueNode number', () => {
    const msg = 'tc4r.ValueNode.number';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let value = 1.23;
    let thing1 = ValueNode.create(value);
    should(thing1.value).equal(value);
    let buf = type.toBuffer(thing1);
    let thingB = type.fromBuffer(buf);
    let thing2 = new ValueNode(thingB);
    should(thing2.value).equal(value);
    dbg && cc.tag1(msg, 'deserialized:', thing2.value);
  });
  it('ValueNode array', () => {
    const msg = 'tc4r.ValueNode.array';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let value = [1.23, 'red'];
    let thing1 = ValueNode.create(value);
    should.deepEqual(thing1.value, value);
    let buf = type.toBuffer(thing1);
    let thingB = type.fromBuffer(buf);
    dbg > 1 && cc.fyi(msg, 'thingB:', thingB);
    let thing2 = new ValueNode(thingB);
    dbg > 1 && cc.fyi(msg, 'thing1:', thing1.value);
    dbg > 1 && cc.fyi(msg, 'thing2:', thing2.value);
    should.deepEqual(thing2.value, thing1.value);
    dbg && cc.tag1(msg, 'deserialized:', thing2.value);
  });
  it('ValueNode array.empty', () => {
    const msg = 'tc4r.ValueNode.array.empty';
    dbg > 1 && cc.tag(msg, STARTTEST);

    let value = [];
    let thing1 = ValueNode.create(value);
    should.deepEqual(thing1.value, value);
    let buf = type.toBuffer(thing1);
    let thingB = type.fromBuffer(buf);
    dbg > 1 && cc.tag(msg, 'thingB:', thingB);
    let thing2 = new ValueNode(thingB);
    dbg > 1 && cc.tag(msg, 'thing1:', thing1.value);
    dbg > 1 && cc.tag(msg, 'thing2:', thing2.value);
    should.deepEqual(thing2.value, thing1.value);
    dbg && cc.tag1(msg, 'deserialized:', thing2.value);
  });
});
