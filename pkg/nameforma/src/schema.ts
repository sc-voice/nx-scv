import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';

const { ColorConsole, Unicode } = Text;
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { SCHEMA: S4A } = DBG;

export class Schema {
  // an Avro schema
  static #registry: Record<string, any> = {};
  static #avro: any;

  name?: string;
  namespace?: string;
  type?: string;
  fields?: any[];
  [key: string]: any;

  constructor(cfg: any = {}) {
    let sCfg = JSON.stringify(cfg);
    Object.assign(this, JSON.parse(sCfg));
    this.name = this.name || 'UnnamedSchema';
  }

  static get REGISTRY() {
    return Object.assign({}, Schema.#registry);
  }

  static register(schema: any, opts: any = {}) {
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
      if (type == null) {
        let eMsg = `${msg} parse?`;
        throw new Error(eMsg);
      }
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

  register(opts: any = {}) {
    return Schema.register(this, opts);
  }

  toAvro(jsObj: any, opts: any = {}) {
    const msg = 's4a.toAvro';
    const dbg = S4A.TO_AVRO;
    const { avro = Schema.#avro, registry = Schema.#registry } = opts;
    if (avro == null) {
      let eMsg = `${msg} avro?`;
      cc.bad1(msg, eMsg);
      throw new Error(eMsg);
    }
    const { name } = this;
    const fullName = this.fullName;
    let type = (name && registry[name]) || (fullName && registry[fullName]);
    if (type == null) {
      type = this.register({ avro, registry });
    }
    if (type == null) {
      let eMsg = `${msg} type?`;
      cc.bad1(msg, eMsg);
      throw new Error(eMsg);
    }

    return type.clone(jsObj, { wrapUnions: true });
  }
}
