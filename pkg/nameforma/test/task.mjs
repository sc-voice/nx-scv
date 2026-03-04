import { describe, it, expect } from '@sc-voice/vitest';
import avro from 'avro-js';
import { NameForma } from '../index.mjs';
import { ScvMath, Text } from '@sc-voice/tools';
import { DBG } from '../src/defines.mjs';

const { Schema, Rational, Task, Forma } = NameForma;
const { TASK: T2K } = DBG;
const { Units } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;

const FRY_EGG = [
  { name: 'heat pan medium heat', progress: new Rational(0, 300, 'F') },
  { name: 'add oil', progress: new Rational(0, 1, 'Tbs') },
  { name: 'break egg into pan', progress: new Rational(0, 2, 'Egg') },
  { name: 'cover pan', progress: new Rational(0, 1, 'lid') },
  { name: 'cook', progress: new Rational(0, 5, 'minutes') },
  {
    name: 'turn off heat and serve',
    progress: new Rational(0, 1, 'serving'),
  },
];

let dbg = T2K.TEST;

describe('task', () => {
  it('ctor', () => {
    const msg = 'tctor';
    dbg && cc.tag1(msg, 'START');

    let t2k = new Task();
    let { id, name } = t2k;
    expect(t2k.validate({ defaultIdName: true })).toBe(true);
    expect(t2k).toMatchObject({ title: 'title?' });
    expect(t2k.progress).toEqual(new Rational(0, 1, 'done'));
    expect(t2k.duration).toEqual(new Rational(null, 1, 's'));
    expect(t2k.toString()).toMatch(/T2K[-0-9a-z]+\. title\? \(0\/1done\)/);

    dbg && cc.tag1(msg + UOK, ...cc.props(t2k));
  });
  it('avro', () => {
    const msg = 'tt2k.avro';
    dbg > 1 && cc.tag(msg, '==============');

    const title = 'avro-title';
    const progress = new Rational(3, 4, 'tbsp');
    const duration = new Rational(3, 4, 's');

    let type = Task.registerSchema({ avro });
    dbg > 1 && cc.tag(msg, 'schema registered');

    let thing1 = new Task({ title, progress, duration });
    let buf = type.toBuffer(thing1);
    let parsed = type.fromBuffer(buf);
    let thing2 = new Task(parsed);
    expect(thing2).toEqual(thing1);
    dbg && cc.tag1(msg + UOK, 'Task serialized with avro');
  });
  it('put', () => {
    const msg = 't2k.put';
    dbg > 1 && cc.tag(msg, '===================');
    let name = 't2k.put.name';
    let title = 't2k.put.title';
    let progress = new Rational(0, 1, 'done');
    let duration = new Rational(5, 60, 'hr');
    let units = new Units();
    let t2k = new Task({ name, title, progress, duration });
    expect(t2k.toString()).toBe(`${name}. ${title} (0/1done 5/60hr)`);

    t2k.put({
      duration: units.convert(duration).to('min'),
    });
    expect(t2k.toString()).toBe(`${name}. title? (0/1done 5min)`);
    dbg && cc.tag1(msg + UOK, 'put with defaults');
  });
  it('patch', () => {
    const msg = 't2k.patch';
    dbg > 1 && cc.tag(msg, '===================');
    let name = 't2k.patch.name';
    let title = 't2k.patch.title';
    let progress = new Rational(0, 1, 'done');
    let duration = new Rational(5, 60, 'hr');
    let units = new Units();
    let t2k = new Task({ name, title, progress, duration });
    expect(t2k.toString()).toBe(`${name}. ${title} (0/1done 5/60hr)`);

    t2k.patch();
    expect(t2k.toString()).toBe(`${name}. ${title} (0/1done 5/60hr)`);
    dbg > 1 && cc.tag(msg, 'empty patch');

    let newName = 'new-name';
    let { id } = t2k;
    t2k.patch({ id: 'ignored', name: newName, title: 'new title' });
    expect(t2k.id).toBe(id); // immutable
    expect(t2k.toString()).toBe(`${newName}. new title (0/1done 5/60hr)`);
    dbg > 1 && cc.tag(msg, 'patched title');

    t2k.patch({ progress: new Rational(1, 1, 'done') });
    expect(t2k.toString()).toBe(
      `${newName}${UOK} new title (1done 5/60hr)`
    );
    dbg > 1 && cc.tag(msg, 'patched progress numerator');

    t2k.patch({ duration: units.convert(duration).to('min') });
    expect(t2k.toString()).toBe(
      `${newName}${UOK} new title (1done 5min)`
    );
    dbg && cc.tag1(msg + UOK, 'patched duration unit conversion');
  });
});
