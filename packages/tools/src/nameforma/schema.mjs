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

  static toAvroArray(jsArr, schema) {
    const msg = 's4a.toAvroArray';
    const dbg = S4A.TO_AVRO_ARRAY;
    const { items:s4aItems, default:d6t } = schema;
    let avroArray;
    switch (s4aItems) {
      case 'boolean':
      case 'double':
      case 'string':
        avroArray = jsArr.slice();
        break;
      default:
        dbg > 1 && cc.ok(msg, 's4aItems:', s4aItems);
        avroArray = jsArr.map(item=> Schema.toAvroRecord(item, s4aItems));
        break;
    }

    dbg && cc.ok1(msg+UOK, s4aItems, avroArray);
    return avroArray;
  }

  static toAvroRecord(jsObj, schema) {
    const msg = 's4a.toAvroRecord';
    const dbg = S4A.TO_AVRO_RECORD;
    const TYPE_KEY = {
      number: 'double',
      boolean: 'boolean',
      string: 'string',
    };

    let record = schema.fields.reduce((a, f) => {
      let { name, type } = f;
      let jsVal = jsObj[name];
      // union
      if (type instanceof Array) {
        if (jsVal == null) {
          a[name] = null;
        } else {
          let key = TYPE_KEY[typeof jsVal];
          if (key == null && jsVal instanceof Object) {
            key = jsVal.constructor.name;
          }
          a[name] = { [key]: jsVal };
        }
      } else {
        a[name] = jsVal;
      }
      return a;
    }, {});

    dbg && cc.ok1(msg, 'record:', record);
    return record;
  }

  get fullName() {
    let { namespace, name } = this;
    return namespace == null ? name : `${namespace}.${name}`;
  }
}
