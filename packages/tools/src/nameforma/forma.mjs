import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: UOK } = Unicode;
import { DBG } from '../defines.mjs';
const { F3A } = DBG.N8A;
import { Admin, Consumer, Producer } from './kafka1.mjs';
import { Schema } from './schema.mjs';

export class Forma {
  static #instances = {};
  #prefix;

  constructor(cfg = {}) {
    const msg = 'f3a.ctor';
    const dbg = F3A.CTOR;

    let {
      prefix = Forma.abbreviateName(this.constructor.name).toUpperCase(),
    } = cfg;

    let instances = Forma.#instances[prefix] || 0;
    instances++;
    Forma.#instances[prefix] = instances;

    let {
      id = `${prefix}${('' + instances).padStart(3, '0')}`,
      name = id,
    } = cfg;

    Object.defineProperty(this, 'prefix', {
      value: prefix,
    });
    Object.defineProperty(this, 'id', {
      enumerable: true,
      value: id,
    });
    this.name = name;

    dbg && cc.ok1(msg + UOK, { id, name });
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

  static registerSchema(opts = {}) {
    return Schema.register(this.SCHEMA, opts);
  }

  static get SCHEMA() {
    return {
      name: 'Forma',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        { name: 'id', type: 'string' }, // immutable, unique
        { name: 'name', type: 'string' }, // mutable
      ],
    };
  }

  static abbreviateName(name) {
    let length = name.length;
    return [name[0], length - 2, name[length - 1]].join('');
  }

  toString() {
    return this.id;
  }

  patch(cfg = {}) {
    let { name = this.name } = cfg;
    this.name = name;
  }
} // Forma
