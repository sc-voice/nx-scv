import UUID64 from './uuid64.js';
import { Text } from '@sc-voice/tools';

const { ColorConsole, Unicode } = Text;
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;

export class Identifiable {
  #id: string;

  constructor(id: string = Identifiable.uuid()) {
    this.#id = id;

    Object.defineProperty(this, 'id', {
      enumerable: true,
      get() {
        return this.#id;
      },
    });
  }

  static uuid(): string {
    return new UUID64().base64;
  }

  static validate(id: string): boolean {
    return UUID64.validate(id);
  }

  get id(): string {
    return this.#id;
  }
}
