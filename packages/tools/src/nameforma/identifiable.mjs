import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { Schema } from './schema.mjs';
import { DBG } from '../../src/defines.mjs';
import { Unicode } from '../text/unicode.mjs';
import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;

export class Identifiable {
  constructor(cfg = {}) {
    let { id = Identifiable.uuid() } = cfg;

    this.id = id;
  }
  static get SCHEMA_FIELDS() {
    return [{ name: 'id', type: 'string' }];
  }

  static get SCHEMA() {
    return new Schema({
      type: 'record',
      name: 'Identifiable',
      fields: [...Identifiable.SCHEMA_FIELDS],
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

