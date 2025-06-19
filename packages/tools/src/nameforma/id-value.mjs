import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Schema } from './schema.mjs';
import { Fraction } from '../math/fraction.mjs';
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { PATCH:P3H, SCHEMA: S4A } = DBG;

export class Identifiable {
  #id;
  constructor(id = Identifiable.uuid()) {
    this.#id = id;

    Object.defineProperty(this, 'id', {
      enumerable: true,
      get() { return this.#id; },
    });
  }

  static uuid(opts) {
    return uuidV7(opts);
  }

  static uuidToTime(id) {
    const msg = 'f3a.uuidToDate';
    if (!uuidValidate(id)) {
      throw new Error(`${msg} invalid uuid:${id}`);
    }
    if (uuidVersion(id) !== 7) {
      throw new Error(`${msg} expected v7 uuid:${id}`);
    }

    let time = Number.parseInt(id.replace(/-/, '').substring(0, 12), 16);
    return time;
  }

  get id() { return this.#id };
}

export class Patch extends Identifiable {
  constructor(cfg) {
    const msg = 'Patch.ctor';
    if (cfg == null) {
      super();
      this.value = null;
      return;
    }

    let { id, value = cfg } = cfg;
    super(id);

    this.value = Patch.patchValue(value);
  }

  static fromIdentifiable(obj={}) {
    let p3h = new Patch({id:obj.id});
    p3h.value = Patch.patchValue(obj);
    return p3h;
  }

  static patchValue(value=null) {
    const msg = 'patchValue';
    const dbg = P3H.PATCH_VALUE;

    if (value == null) {
      return null;
    }
    if (value instanceof Array) {
      return { array: value };
    } 
    if (value instanceof Fraction) {
      return { Fraction: value };
    }

    let tv = typeof value;
    dbg > 1 && cc.ok(msg, 'typeof:', {tv,value});

    switch (tv) {
      case 'number':
        return {double: value};
      case 'string':
        return {string: value};
      case 'boolean':
        return {boolean: value};
      case 'object':
        break;
      default:
        throw new Error(`${msg} type? ${value}`);
    }

    // Object
    let { id } = value;
    if (id == null) {
      throw new Error(`${msg} id? ${value}`);
    }

    let result = Object.entries(value).reduce((a,entry) =>{
      let [ k, v ] = entry;
      if (k !== 'id') {
        let pv = Patch.patchValue(v);
        let iv = {id:k, value:pv};
        dbg > 1 && cc.ok(msg, 'push:', iv);
        a.array.push(iv)
      }
      return a;
    }, {array: []});

    dbg && cc.ok1(msg, 'result:', result);
    return result;
  }

  static get SCHEMA() {
    return new Schema({
      type: 'record',
      name: 'Patch',
      fields: [
        { name: 'id', type: 'string' },
        {
          name: 'value',
          default: null,
          type: [
            'null',
            'string',
            'double',
            'boolean',
            Fraction.SCHEMA,
            {
              type: 'array',
              items: 'Patch',
              default: [],
            },
          ],
        },
      ], // fields
    });
  }
} // Patch

export class IdValue extends Identifiable {
  constructor(cfg = {}) {
    let { id , value = null } = cfg;
    super(id);

    this.value = value;
  }

  static get SCHEMA() {
    return new Schema({
      type: 'record',
      name: 'IdValue',
      fields: [
        { name: 'id', type: 'string' },
        {
          name: 'value',
          default: null,
          type: [
            'null',
            'string',
            'double',
            'boolean',
            {
              type: 'array',
              items: 'IdValue',
              default: [],
            },
          ],
        },
      ], // fields
    });
  }

}
