import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { DBG } from './defines.mjs';
import { Rational } from './rational.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Identifiable } from './identifiable.mjs';
import { Schema } from './schema.mjs';
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { PATCH_DEPRECATED: P3H, SCHEMA: S4A } = DBG;

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

    this.value = Patch.toAvroValue(value);
    /*
     */
  }

  static toAvroRecord(jsObj, schema) {
    const msg = 'p3h.toAvroRecord';
    const dbg = P3H.TO_AVRO_RECORD;
    const TYPE_KEY = {
      number: 'double',
      boolean: 'boolean',
      string: 'string',
    };

    let record = schema.fields.reduce((a, f) => {
      let { name, type } = f;
      let jsVal = jsObj[name];
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

  static toAvroObject(jsObj, schema) {
    const msg = 'p3h.toAvroObject';
    const dbg = P3H.TO_AVRO_OBJECT;
    switch (schema.type) {
      case 'record':
        return toAvroRecord(jsObj, schame);
      default:
        throw new Error(msg, 'TBD');
    }
  }

  static toAvroSchema(jsObj = {}) {
    const msg = 'p3h.toAvroSchema';
    const dbg = P3H.TO_AVRO_SCHEMA;
    let avroObj = new Patch({ id: jsObj.id });
    avroObj.value = Patch.toAvroValue(jsObj.value);
    return avroObj;
  }

  static toAvroValue(value = null) {
    const msg = 'p3h.toAvroValue';
    const dbg = P3H.TO_AVRO_VALUE;

    if (value == null) {
      return null;
    }
    if (value instanceof Array) {
      return { array: value };
    }
    if (value instanceof Rational) {
      return { Rational: value };
    }

    let tv = typeof value;
    dbg > 1 && cc.ok(msg, 'typeof:', { tv, value });

    switch (tv) {
      case 'number':
        if (Number.isNaN(value)) {
          let eMsg = `${msg} nan: ${value}?`;
          dbg && cc.bad1(eMsg);
          throw new Error(eMsg);
        }
        if (!Number.isFinite(value)) {
          let eMsg = `${msg} infinite: ${value}?`;
          dbg && cc.bad1(eMsg);
          throw new Error(eMsg);
        }
        return { double: value };
      case 'string':
        return { string: value };
      case 'boolean':
        return { boolean: value };
      case 'object':
        break;
      default: {
        let eMsg = `${msg} type? ${value}`;
        dbg && cc.bad1(eMsg);
        throw new Error(eMsg);
      }
    }

    // Object
    let { id } = value;
    if (id == null) {
      throw new Error(`${msg} id? ${value}`);
    }

    let result = Object.entries(value).reduce(
      (a, entry) => {
        let [k, v] = entry;
        if (k !== 'id') {
          let pv = Patch.toAvroValue(v);
          let iv = { id: k, value: pv };
          dbg > 1 && cc.ok(msg, 'push:', iv);
          a.array.push(iv);
        }
        return a;
      },
      { array: [] },
    );

    dbg && cc.ok1(msg, 'result:', result);
    return result;
  }

  static fromAvroSchema(avroObj = {}) {
    const msg = 'p3h.fromAvroSchema';
    const dbg = P3H.FROM_AVRO_SCHEMA;
    let { id, value } = avroObj;
    dbg && cc.ok(msg, { id, value });
    let jsObj = { id };
    jsObj.value = Patch.fromAvroValue(value, jsObj);

    dbg && cc.ok1(msg, 'jsObj:', jsObj);
    return jsObj;
  } // from AvroSchema

  static fromAvroValue(value, context) {
    const msg = 'p3h.fromAvroValue';
    const dbg = P3H.FROM_AVRO_VALUE;

    if (value === null) {
      return null;
    }
    let [avroType, avroVal] = Object.entries(value)[0];
    switch (avroType) {
      case 'string':
      case 'double':
      case 'boolean':
        return avroVal;
      case 'Rational':
        return new Rational(avroVal);
      case 'array': {
        // array as record
        let jsObj = context || {};
        avroVal.forEach((item) => {
          let propName = item.id;
          if (propName && propName !== 'id') {
            let propVal = item.value;
            if (propVal instanceof Object) {
              let [type, val] = Object.entries(propVal)[0];
              propVal = val;
            }
            jsObj[propName] = propVal;
            dbg && cc.ok(msg, propName + ':', propVal);
          }
        });
        return jsObj;
      }
    }
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
            Rational.SCHEMA,
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
