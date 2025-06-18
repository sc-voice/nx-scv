import should from 'should';
import { NameForma } from '../../index.mjs';
const { Schema, Task, Forma } = NameForma;
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { T2K } = DBG.N8A;
const { Units, Fraction } = ScvMath;
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

let dbg = DBG.T2T.TASK;

describe('TESTTESTtask', () => {
  it('ctor', () => {
    const msg = 'tctor';
    dbg && cc.tag1(msg, 'START');

    let t2k = new Task();
    let { id, name } = t2k;
    should(t2k).properties({ id, name: id, title: 'title?' });
    should.deepEqual(t2k.progress, new Fraction(0, 1, 'done'));
    should.deepEqual(t2k.duration, new Fraction(null, 1, 's'));
    should(t2k.toString()).match(/T2K[0-9]+\. title\? \(0\/1done\)/);

    dbg && cc.tag1(msg + UOK, ...cc.props(t2k));
  });
  it('avro', () => {
    const msg = 'tt2k.avro';
    dbg > 1 && cc.tag(msg, '==============');

    const title = 'avro-title';
    const progress = new Fraction(3, 4, 'tbsp');
    const duration = new Fraction(3, 4, 's');

    let type = Task.registerSchema({ avro });
    dbg > 1 && cc.tag(msg, 'schema registered');

    let thing1 = new Task({ title, progress, duration });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Task(parsed);
    should.deepEqual(thing2, thing1);
    dbg && cc.tag1(msg + UOK, 'Task serialized with avro');
  });
  it('put', () => {
    const msg = 't2k.put';
    dbg > 1 && cc.tag(msg, '===================');
    let name = 't2k.put.name';
    let title = 't2k.put.title';
    let progress = new Fraction(0, 1, 'done');
    let duration = new Fraction(5, 60, 'hr');
    let units = new Units();
    let t2k = new Task({ name, title, progress, duration });
    should(t2k.toString()).equal(`${name}. ${title} (0/1done 5/60hr)`);

    t2k.put({
      duration: units.convert(duration).to('min'),
    });
    should(t2k.toString()).equal(`${name}. title? (0/1done 5min)`);
    dbg && cc.tag1(msg + UOK, 'put with defaults');
  });
  it('patch', () => {
    const msg = 't2k.patch';
    dbg > 1 && cc.tag(msg, '===================');
    let name = 't2k.patch.name';
    let title = 't2k.patch.title';
    let progress = new Fraction(0, 1, 'done');
    let duration = new Fraction(5, 60, 'hr');
    let units = new Units();
    let t2k = new Task({ name, title, progress, duration });
    should(t2k.toString()).equal(`${name}. ${title} (0/1done 5/60hr)`);

    t2k.patch();
    should(t2k.toString()).equal(`${name}. ${title} (0/1done 5/60hr)`);
    dbg > 1 && cc.tag(msg, 'empty patch');

    let newName = 'new-name';
    let { id } = t2k;
    t2k.patch({ id: 'ignored', name: newName, title: 'new title' });
    should(t2k.id).equal(id); // immutable
    should(t2k.toString()).equal(`${newName}. new title (0/1done 5/60hr)`);
    dbg > 1 && cc.tag(msg, 'patched title');

    t2k.patch({ progress: new Fraction(1, 1, 'done') });
    should(t2k.toString()).equal(
      `${newName}${UOK} new title (1done 5/60hr)`,
    );
    dbg > 1 && cc.tag(msg, 'patched progress numerator');

    t2k.patch({ duration: units.convert(duration).to('min') });
    should(t2k.toString()).equal(
      `${newName}${UOK} new title (1done 5min)`,
    );
    dbg && cc.tag1(msg + UOK, 'patched duration unit conversion');
  });
});
