import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { DBG } from '../../src/defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Schema } from './schema.mjs';
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

export class Identifiable {
  constructor(cfg = {}) {
    let { id = Identifiable.uuid(), value = null } = cfg;

    this.id = id;

    if (value instanceof Array) {
      value = value.map((item) => {
        if (item instanceof Identifiable) {
          return item;
        }

        return new Identifiable(item);
      });
    } else if (value instanceof Object) {
      value = Object.values(value)[0];
    }
    this.value = value;
  }

  toAvroJson() {
    let { id, value } = this;
    let type;

    if (value instanceof Array) {
      value = value.map((item) => (item) => item.toAvroJson());
    } else {
      if (value != null) {
        switch (typeof value) {
          case 'number':
            value = { double: value };
            break;
          case 'string':
            value = { string: value };
            break;
          case 'boolean':
            value = { boolean: value };
            break;
        }
      }
    }
    return { id, value };
  }

  static get ID_FIELD() {
    return { name: 'id', type: 'string' };
  }

  static get VALUE_FIELD() {
    return {
      name: 'value',
      type: [
        'null',
        'string',
        'double',
        'boolean',
        { type: 'array', items: 'Identifiable', default: [] },
      ],
    };
  }

  static get ID_VALUE_FIELDS() {
    return [Identifiable.ID_FIELD, Identifiable.VALUE_FIELD];
  }

  static get SCHEMA() {
    return new Schema({
      type: 'record',
      name: 'Identifiable',
      fields: [
        ...Identifiable.ID_VALUE_FIELDS,
        /*
        {
          type: 'array', 
          name: 'values', 
          items: {
            type: 'record',
            name: 'IdentifiableRecord',
            fields: [
              ...Identifiable.ID_VALUE_FIELDS,
            ],
          },
          default: [] 
        },
        */
      ],
    });
  }

  static uuid(opts) {
    return uuidV7(opts);
  }

  static uuidToTime(id) {
    const msg = 'f3a.uuidToDate';
    if (!uuidValidate(id)) {
      throw new Error(`${msg} invalid uuid:${id}`);
    }
    if (uuidVersion(id) !== 7) {
      throw new Error(`${msg} expected v7 uuid:${id}`);
    }

    let time = Number.parseInt(id.replace(/-/, '').substring(0, 12), 16);
    return time;
  }
}
