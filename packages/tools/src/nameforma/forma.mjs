import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: UOK } = Unicode;
import { DBG } from '../defines.mjs';
const { F3A } = DBG.N8A;
import { Admin, Consumer, Producer } from './kafka1.mjs';

export class Forma {
  static #instances = {};
  static #registry = {};
  static #avro;
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

    let { id = `${prefix}${('' + instances).padStart(3, '0')}` } = cfg;

    Object.defineProperty(this, 'prefix', {
      value: prefix,
    });
    Object.defineProperty(this, 'id', {
      enumerable: true,
      value: id,
    });

    dbg && cc.ok1(msg + UOK, id);
  }

  static get REGISTRY() {
    return Object.assign({}, Forma.#registry);
  }

  static register(opts = {}) {
    return Forma.registerSchema(Forma.SCHEMA, opts);
  }

  static registerSchema(schema, opts = {}) {
    const msg = 'f3a.registerSchema';
    const dbg = F3A.REGISTER_SCHEMA;

    let { name, namespace } = schema;
    if (name == null) {
      throw new Error(`${msg} name?`);
    }
    let fullName = namespace ? `${namespace}.${name}` : `${name}`;
    dbg > 1 && cc.ok(msg, 'parsing:', fullName);
    let { avro = Forma.#avro, registry = Forma.#registry } = opts;
    if (avro == null) {
      throw new Error(`${msg} avro?`);
    }
    Forma.#avro = avro;
    let type = registry[fullName];

    if (type == null) {
      type = avro.parse(schema, Object.assign({ registry }, opts));
      dbg && cc.ok1(msg + UOK, fullName);
      registry[fullName] = type;
      Forma.#registry[fullName] = type;
    }

    return type;
  }

  static get SCHEMA_FIELDS() {
    return [{ name: 'id', type: 'string' }];
  }

  static get SCHEMA() {
    return {
      name: 'Forma',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: Forma.SCHEMA_FIELDS,
    };
  }

  static abbreviateName(name) {
    let length = name.length;
    return [name[0], length - 2, name[length - 1]].join('');
  }

  toString() {
    return this.id;
  }
} // Forma
