import UUID64 from './uuid64.js';
import { Identifiable } from './identifiable.js';
import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';
import { Schema } from './schema.js';

const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { FORMA: F3A } = DBG;

export class Forma extends Identifiable {
  static #instances: Record<string, number> = {};
  #prefix: string = '';
  name: string;

  constructor(cfg: any = {}) {
    const msg = 'f3a.ctor';
    const dbg = (F3A as any).CTOR;
    const { id } = cfg;
    super(id);

    const prefix = this.#defaultPrefix();
    let instances = Forma.#instances[prefix] || 0;
    instances++;
    Forma.#instances[prefix] = instances;

    let { name } = cfg;
    if (name == null) {
      let uid: any = null;
      try {
        uid = UUID64.fromString(this.id);
      } catch (err) {
        // this.id is not a valid UUID64 string, use fallback
      }
      if (uid) {
        name = uid.timeId();
      } else {
        name = prefix + '-' + this.id.substring(0, 8);
      }
    }

    this.name = name;

    dbg && cc.ok1(msg + UOK, { id: this.id, name });
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

  static abbreviateName(name: string) {
    let length = name.length;
    return [name[0], length - 2, name[length - 1]].join('');
  }

  #defaultPrefix() {
    return Forma.abbreviateName(this.constructor.name).toUpperCase();
  }

  validate(opts: any = {}) {
    const msg = 'f3a.validate';
    const dbg = (DBG as any).FORMA.VALIDATE;
    const {
      defaultId = true, // id is UUID64
      defaultName = false, // name is derived from id
    } = opts;
    const { id, name } = this as any;
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

  override toString() {
    return this.name;
  }

  patch(cfg: any = {}) {
    let { name = this.name } = cfg;
    this.name = name;
  }
}
