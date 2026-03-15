import UUID64 from '../dist/uuid64.js';
import { Identifiable } from './identifiable.mjs';
import { Text, ScvMath } from '@sc-voice/tools';
import { DBG } from './defines.mjs';
import { Schema } from './schema.mjs';

const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { FORMA: F3A } = DBG;

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

    let { name = prefix + '-' + super.id.substring(0, 8) } = cfg;

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
      defaultId = true, // id is UUID64
      defaultName = false, // name is derived from id
    } = opts;
    const { id, name } = this;
    let err;

    if (!err && defaultId) {
      if (!UUID64.validate(id)) {
        err = new Error(`${msg} uuid64? ${id}`);
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

    dbg && cc.ok1(msg + UOK, { id, name });
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
