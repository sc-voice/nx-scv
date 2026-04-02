import { describe, it, expect } from '@sc-voice/vitest';
import UUID64 from '../src/uuid64.js';
import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../src/index.js';
import { DBG } from '../src/defines.js';

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

/**
 * TestClass - Simple class with patchableFields for patch testing
 */
class TestClass extends Identifiable {
  static patchableFields = ['color', 'size', 'sale', 'summary'];
  color: string = 'blue';
  size: number = 34;
  sale: boolean = true;
  summary: string = 'summary1';

  constructor(cfg: any = {}) {
    super(cfg.id);
    const { color, size, sale, summary } = cfg;
    if (color !== undefined) this.color = color;
    if (size !== undefined) this.size = size;
    if (sale !== undefined) this.sale = sale;
    if (summary !== undefined) this.summary = summary;
  }
}

describe('Patch', () => {
  it('ctor default', () => {
    const msg = 'tp3h.ctor.default';
    const p3h1 = new Patch();
    expect(p3h1.id.validate()).toBe(true);
    dbg && cc.tag1(msg + UOK, 'p3h1:', p3h1);
  });
  it('ctor simple', () => {
    const msg = 'tp3h.ctor.simple';
    const id = new UUID64();
    const color = 'red';
    const size = 42;
    const sale = false;
    const p3h1 = new Patch({ id, color, size, sale });
    expect(p3h1).toMatchObject({ id, color, size, sale });
    dbg && cc.tag1(msg + UOK, 'p3h1:', p3h1);
  });
  it('patch simple', () => {
    const msg = 'tp3h.patch.simple';
    const id = new UUID64();
    const thing1 = new TestClass({ id, color: 'blue', size: 34, sale: true, summary: "summary1" });
    const thing2 = new TestClass({ id, color: 'blue', size: 34, sale: true, summary: "summary1" });
    const color = 'red';
    const size = 42;
    const sale = false;
    const summary = "summary2";

    const p3h1 = new Patch({ id, color });
    p3h1.apply(thing2);
    expect(thing2).toMatchObject({ color: 'red', size: 34, sale: true, summary: "summary1" });
    dbg && cc.tag(msg, 'empty', p3h1);

    const p3h2 = new Patch({ id, color: 'green' });
    p3h2.apply(thing2);
    expect(thing2).toMatchObject({ color: 'green', size: 34, sale: true, summary: "summary1" });
    dbg && cc.tag(msg, 'color', p3h2);

    const p3h3 = new Patch({ id, color, size, sale, summary });
    p3h3.apply(thing2);
    expect(thing2).toMatchObject({ color, size, sale, summary });
    dbg && cc.tag(msg, 'size,sale', p3h3);

    dbg && cc.tag1(msg + UOK, 'p3h1:', p3h1);
  });
});
