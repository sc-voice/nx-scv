import avro from 'avro-js';
import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Schema } from './schema.mjs';
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const dbg = DBG.T2T.CAR_CDR;

export class ValueNode {
  constructor(cfg = {}) {
    let obj = JSON.parse(JSON.stringify(cfg));
    Object.entries(cfg).forEach((entry) => {
      let [k, v] = entry;
      if (v instanceof Array) {
        this[k] = v.map((item) => {
          if (item instanceof ValueNode) {
            return item;
          }
          return ValueNode.create(item);
        });
      } else {
        this[k] = v;
      }
    });
  }

  static create(cfg) {
    const msg = 'v3e.create';
    if (cfg == null) {
      return new ValueNode({ value_: null, values_: [] });
    }
    if (cfg instanceof ValueNode) {
      return new ValueNode({ value_: null, values_: [cfg] });
    }
    if (cfg instanceof Array) {
      return new ValueNode({ value_: { int: 0 }, values_: cfg });
    }

    switch (typeof cfg) {
      case 'number':
        return new ValueNode({ value_: { double: cfg }, values_: [] });
      case 'string':
        return new ValueNode({ value_: { string: cfg }, values_: [] });
      case 'object': {
        let { value_, values_ } = cfg;
        if (value_ === undefined || values_ === undefined) {
          throw new Error(
            `${msg} cfg object ValueNode? ${JSON.stringify(cfg)}`,
          );
        }
        return new ValueNode(cfg);
      }
      default:
        throw new Error(`${msg} cfg? ${typeof cfg}`);
    }
  }

  static get SCHEMA() {
    return {
      type: 'record',
      name: 'ValueNode',
      fields: [
        {
          name: 'value_',
          type: [
            'null',
            'string',
            'double',
            'int',
            //  {type: 'array', items: 'ValueNode'}
          ],
          default: null,
        },
        {
          name: 'values_',
          type: { type: 'array', items: 'ValueNode' },
        },
      ],
    };
  }

  get value() {
    const msg = 'n2e.value';
    let { value_, values_ } = this;
    if (value_ instanceof Object) {
      let [k, v] = Object.entries(value_)[0];
      switch (k) {
        case 'int':
          if (v === 0) {
            // int 0 is a array value
            return values_.map((item) => item.value);
          }
          throw new Error(`${msg} invalid int:${v}`);
        default:
          return v;
      }
    } else {
      if (value_ == null) {
        return null;
      }
      throw new Error(`${msg} value_? ${value_}`);
    }
  }
}
