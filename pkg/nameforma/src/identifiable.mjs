import UUID64 from '../dist/uuid64.js';
import { Text } from '@sc-voice/tools';
const { ColorConsole, Unicode, } = Text;
import { DBG } from './defines.mjs';
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

  static uuid() {
    return new UUID64().base64;
  }

  static validate(id) {
    return UUID64.validate(id);
  }

  get id() {
    return this.#id;
  }
}
