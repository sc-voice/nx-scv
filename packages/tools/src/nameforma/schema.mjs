import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { SCHEMA: S4A } = DBG;

export class Schema {
  // an Avro schema
  static #registry = {};
  static #avro;

  constructor(cfg = {}) {
    let sCfg = JSON.stringify(cfg);
    Object.assign(this, JSON.parse(sCfg));
    this.name = this.name || 'UnnamedSchema';
  }

  static get REGISTRY() {
    return Object.assign({}, Schema.#registry);
  }

  static register(schema, opts = {}) {
    const msg = 's4a.register';
    const dbg = S4A.REGISTER;

    let { name, namespace } = schema;
    if (name == null) {
      throw new Error(`${msg} name?`);
    }
    let fullName = namespace ? `${namespace}.${name}` : `${name}`;
    dbg > 1 && cc.ok(msg, 'parsing:', fullName);
    let { avro = Schema.#avro, registry = Schema.#registry } = opts;
    if (avro == null) {
      throw new Error(`${msg} avro?`);
    }
    Schema.#avro = avro;
    let type = registry[fullName];

    if (type == null) {
      type = avro.parse(schema, Object.assign({ registry }, opts));
      dbg && cc.ok1(msg + UOK, fullName);
      registry[fullName] = type;
      Schema.#registry[fullName] = type;
    }

    return type;
  }

  get fullName() {
    let { namespace, name } = this;
    return namespace == null ? name : `${namespace}.${name}`;
  }
}
