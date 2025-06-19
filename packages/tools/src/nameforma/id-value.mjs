import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Schema } from './schema.mjs';
import { Fraction } from '../math/fraction.mjs';
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { SCHEMA: S4A } = DBG;

export class Identifiable {
  #id;
  constructor(id = Identifiable.uuid()) {
    this.#id = id;

    Object.defineProperty(this, 'id', {
      enumerable: true,
      get() { return this.#id; },
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

  get id() { return this.#id };
}

export class Patch extends Identifiable {
  constructor(cfg = {}) {
    let { id, value = null } = cfg;
    super(id);

    if (value) {
      if (value instanceof Array) {
        value = { array: value };
      } else if (value instanceof Fraction) {
        value = { Fraction: value };
      } else {
        switch (typeof value) {
          case 'number':
            value = {double: value};
            break;
          case 'string':
            value = {string: value};
            break;
          case 'boolean':
            value = {boolean: value};
            break;
        }
      }
    }
    this.value = value;
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
            Fraction.SCHEMA,
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

export class IdValue extends Identifiable {
  constructor(cfg = {}) {
    let { id , value = null } = cfg;
    super(id);

    this.value = value;
  }

  static get SCHEMA() {
    return new Schema({
      type: 'record',
      name: 'IdValue',
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
            {
              type: 'array',
              items: 'IdValue',
              default: [],
            },
          ],
        },
      ], // fields
    });
  }

}
