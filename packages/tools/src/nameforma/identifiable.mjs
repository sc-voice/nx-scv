import {
  v7 as uuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';
import { DBG } from './defines.mjs';
import { ColorConsole } from '../text/color-console.mjs';
import { Unicode } from '../text/unicode.mjs';
import { Schema } from './schema.mjs';
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;

export class Identifiable {
  #id;
  constructor(id = Identifiable.uuid()) {
    this.#id = id;

    Object.defineProperty(this, 'id', {
      enumerable: true,
      get() {
        return this.#id;
      },
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

  get id() {
    return this.#id;
  }
}
