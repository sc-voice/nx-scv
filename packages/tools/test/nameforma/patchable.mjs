import should from 'should';
import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { NameForma } from '../../index.mjs';
const { Forma, Schema, Identifiable, IdValue } = NameForma;
import avro from 'avro-js';
import { Text } from '../../index.mjs';
import { ScvMath } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { Fraction } = ScvMath;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

const dbg = DBG.PATCHABLE.TEST;
const STARTTEST = '=============';

const aString = 'red';
const aDouble = Math.PI;
const aBoolean = true;
const aFraction = new Fraction(1, 3, 'inch');

class Patch extends Identifiable {
  constructor(cfg = {}) {
    super(cfg.id);
    Object.entries(cfg).forEach((entry) => {
      const [k, v] = entry;
      if (k !== 'id') {
        this[k] = v;
      }
    });
  }
}

class Patchable extends Forma {
  #patch = {};

  constructor(cfg = {}) {
    const msg = 'p7e.ctor';
    super(cfg);
    let { color = 'color?', size = 0, ok = true } = cfg;
    this.#patch.id = this.id;
    Object.assign(this, { color, size, ok });
  }

  get patch() {
    return new Patch(this.#patch);
  }

  set(key, value) {
    const msg = 'p7e.set';
    if (typeof key !== 'string' || !/[a-z][a-z0-9_]*/.test(key)) {
      throw new Error(`${msg} key? ${key}`);
    }

    this.#patch[key] = value;
    this[key] = value;
  }
}

describe('TESTTESTPatchable', () => {
  class TestPatchable extends Patchable {
    constructor(cfg = {}) {
      super(cfg);
    }
  }
  it('ctor() default', () => {
    const msg = 'tp7e.ctor.default';
    const color = 'color?';
    const size = 0;
    const ok = true;

    let thing1 = new TestPatchable();
    should(thing1).properties({ color, size, ok });
    should(thing1.validate()).equal(true);
    dbg > 1&& cc.tag(msg, 'thing1.id:', thing1.id);

    should(thing1.validate({defaultName:true})).equal(true);
    dbg && cc.tag1(msg + UOK, thing1);
  });
  it('ctor() custom', () => {
    const msg = 'tp7e.ctor.custom';
    const color = 'color?';
    const size = 0;
    const ok = true;
    const id = 'testid';
    let eCaught;

    let thing1 = new TestPatchable({ id });
    should(thing1).properties({ color, size, ok });
    should(thing1.validate({ defaultId: true })).instanceOf(Error);
    should(thing1.validate({ defaultId: false })).equal(true);
    dbg > 1 && cc.tag(msg, 'thing1.id:', thing1.id);

    should(thing1.validate({ 
      defaultId: false, 
      defaultName: true,
    })).equal(true);
    dbg && cc.tag1(msg + UOK, 'thing1.name:', thing1.name);
  });
  it('TESTTESTset()', () => {
    const msg = 'tp7e.set';
    const color = 'red';
    const size = 42;
    const ok = false;
    const id = 'testid';
    let thing1 = new TestPatchable({ id });
    let { color: oldColor, size: oldSize, ok: oldOk } = thing1;
    dbg && cc.tag(msg, 'thing1:', thing1);

    thing1.set('color', color);
    should(thing1).properties({ color });
    let { patch, unpatch } = thing1;
    should.deepEqual(Object.assign({}, patch), { id, color });
    should(patch).instanceOf(Patch);

    thing1.set('size', size);
    should(thing1).properties({ color, size });
    should.deepEqual(
      Object.assign({}, thing1.patch), 
      { id, color, size }
    );

    thing1.set('ok', ok);
    should(thing1).properties({ color, size, ok });
    should.deepEqual(
      Object.assign({}, thing1.patch), 
      { id, color, size, ok }
    );

    dbg && cc.tag1(msg + UOK, thing1);
  });
}); // Patchable
