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

export class Forma extends Identifiable {
  static #instances = {};
  #prefix;

  constructor(cfg = {}) {
    const msg = 'f3a.ctor';
    const dbg = F3A.CTOR;
    const { id } = cfg;
    super(id);

    const prefix = this.#defaultPrefix();
    let instances = Forma.#instances[prefix] || 0;
    instances++;
    Forma.#instances[prefix] = instances;

    let {
      name = prefix + '-' + super.id.split('-')[0],
    } = cfg;

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

  #defaultPrefix() {
    return Forma.abbreviateName(this.constructor.name).toUpperCase();
  }

  validate(opts = {}) {
    const msg = 'f3a.validate';
    const dbg = DBG.FORMA.VALIDATE;
    const { 
      defaultId = true, // id is uuid version 7
      defaultName = false, // name is derived from id
    } = opts;
    const { id, name } = this;
    let err;

    if (!err && defaultId) {
      if (!uuidValidate(id)) {
        err = new Error(`${msg} uuid? ${id}`);
      } else if (uuidVersion(id) !== 7) {
        err = new Error(`${msg} uuidv7? ${id}`);
      }
    }
    if (!err && defaultName) {
      const prefix = this.#defaultPrefix();
      if (!name.startsWith(prefix)) {
        err = new Error(`${msg} defaultName? ${name}`);
      }
    }

    if (err) {
      dbg && cc.bad1(err.message);
      return err;
    }

    dbg && cc.ok1(msg+UOK, {id, name});
    return true;
  }

  toString() {
    return this.name;
  }

  patch(cfg = {}) {
    let { name = this.name } = cfg;
    this.name = name;
  }
} // Forma
