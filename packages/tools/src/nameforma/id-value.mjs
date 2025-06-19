import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { DBG } from '../defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Schema } from './schema.mjs';
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;
const { SCHEMA: S4A } = DBG;

export class IdValue {
  constructor(cfg = {}) {
    let { id = IdValue.uuid(), value = null } = cfg;

    this.id = id;
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
