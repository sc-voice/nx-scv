import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
import { Identifiable } from './identifiable.mjs';
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
      id = `${prefix + '-' + Identifiable.uuid()}`,
      name = id.split('-').slice(0, 2).join('-'),
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

  validate(opts = {}) {
    const msg = 'f3a.validate';
    const dbg = DBG.FORMA.VALIDATE;
    let { defaultIdName = true } = opts;

    if (defaultIdName) {
      let parts = this.id.split('-');
      let prefix = parts.shift();
      let uuid = parts.join('-');
      if (!uuidValidate(uuid)) {
        dbg && cc.bad1(msg, 'uuid?', this.id);
        return false;
      }
      if (!/[A-Z0-9]+/.test(prefix)) {
        dbg && cc.bad1(msg, 'prefix?', this.id);
        return false;
      }

      dbg && cc.ok1(msg + UOK, this.id);
      return true;
    }
  }

  toString() {
    return this.id;
  }

  patch(cfg = {}) {
    let { name = this.name } = cfg;
    this.name = name;
  }
} // Forma
