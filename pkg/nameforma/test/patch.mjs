import { describe, it, expect } from '@sc-voice/vitest';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../index.mjs';
import { DBG } from '../src/defines.mjs';

const { Patch, Rational, Forma, Schema, Identifiable } = NameForma;
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { PATCH: P3H } = DBG;
const dbg = P3H.TEST;
const STARTTEST = '=============';

const aString = 'red';
const aDouble = Math.PI;
const aBoolean = true;
const aRational = new Rational(1, 3, 'inch');

describe('Patch', () => {
  it('ctor default', () => {
    const msg = 'tp3h.ctor.default';
    const p3h1 = new Patch();
    expect(uuidValidate(p3h1.id)).toBe(true);
    dbg && cc.tag1(msg + UOK, 'p3h1:', p3h1);
  });
  it('ctor simple', () => {
    const msg = 'tp3h.ctor.simple';
    const id = 'testPatch';
    const color = 'red';
    const size = 42;
    const sale = false;
    const p3h1 = new Patch({ id, color, size, sale });
    expect(p3h1).toMatchObject({ id, color, size, sale });
    dbg && cc.tag1(msg + UOK, 'p3h1:', p3h1);
  });
  it('patch simple', () => {
    const msg = 'tp3h.patch.simple';
    const id = 'testThing';
    const color = 'red';
    const size = 42;
    const sale = false;
    const thing1 = { id, color: 'blue', size: 34, sale: true };
    const thing2 = { id, color: 'blue', size: 34, sale: true };
    const p3h1 = new Patch({ id });
    p3h1.apply(thing2);
    expect(thing2).toEqual(thing1);
    dbg && cc.tag(msg, 'empty', p3h1);

    const p3h2 = new Patch({ id, color });
    p3h2.apply(thing2);
    expect(thing2).toEqual({ id, color, size: 34, sale: true });
    dbg && cc.tag(msg, 'color', p3h2);

    const p3h3 = new Patch({ id, color, size, sale });
    p3h3.apply(thing2);
    expect(thing2).toEqual({ id, color, size, sale });
    dbg && cc.tag(msg, 'size,sale', p3h3);

    dbg && cc.tag1(msg + UOK, 'p3h1:', p3h1);
  });
});

