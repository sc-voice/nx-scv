import should from 'should';
import { NameForma } from '../../index.mjs';
const { Task, Forma } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { T2K } = DBG.N8A;
const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;
import avro from 'avro-js';

const FRY_EGG = [
  { name: 'heat pan medium heat', progress: new Fraction(0, 300, 'F') },
  { name: 'add oil', progress: new Fraction(0, 1, 'Tbs') },
  { name: 'break egg into pan', progress: new Fraction(0, 2, 'Egg') },
  { name: 'cover pan', progress: new Fraction(0, 1, 'lid') },
  { name: 'cook', progress: new Fraction(0, 5, 'minutes') },
  {
    name: 'turn off heat and serve',
    progress: new Fraction(0, 1, 'serving'),
  },
];

let dbg = 2;

describe('task', () => {
  it('ctor', () => {
    const msg = 'tctor';
    dbg && cc.tag1(msg, 'START');

    let t2k = new Task();
    let { id } = t2k;
    should(t2k).properties({ title: `${id}-title?` });
    should.deepEqual(t2k.progress, new Fraction(0, 1, 'done'));
    should.deepEqual(t2k.duration, new Fraction(null, 1, 's'));

    dbg && cc.tag1(msg, 'END');
  });
  it('avro', () => {
    const msg = 'tavro';
    const title = 'avro-title';
    const progress = new Fraction(3, 4, 'tbsp');
    const duration = new Fraction(3, 4, 's');
    dbg && cc.tag1(msg, 'START');

    let type = avro.parse(Task.SCHEMA);

    let thing1 = new Task({ title, progress, duration });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Task(parsed);
    should.deepEqual(thing2, thing1);

    dbg && cc.tag1(msg, 'START');
  });
});
