import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: UOK } = Unicode;
import { DBG } from '../defines.mjs';
const { F3A } = DBG.N8A;
import { Admin, Consumer, Producer } from './kafka1.mjs';

export class Forma {
  static #instances = {};
  #prefix;

  constructor(cfg = {}) {
    const msg = 'f3a.ctor';
    const dbg = F3A.CTOR;

    let {
      prefix = Forma.abbreviateName(this.constructor.name).toUpperCase(),
    } = cfg;

    let instances = Forma.#instances[prefix] || 0;
    instances++;
    Forma.#instances[prefix] = instances;

    let { id = `${prefix}${('' + instances).padStart(3, '0')}` } = cfg;

    Object.defineProperty(this, 'prefix', {
      value: prefix,
    });
    Object.defineProperty(this, 'id', {
      enumerable: true,
      value: id,
    });

    dbg && cc.ok1(msg + UOK, id);
  }

  static abbreviateName(name) {
    let length = name.length;
    return [name[0], length - 2, name[length - 1]].join('');
  }

  toString() {
    return this.id;
  }
} // Forma
