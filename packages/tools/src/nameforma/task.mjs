import { DBG } from '../../src/defines.mjs';
import { Fraction } from '../../src/math/fraction.mjs';
import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
import { Forma } from './forma.mjs';
import { Schema } from './schema.mjs';
const { T2K } = DBG.N8A;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;
const FRACTION = Fraction.SCHEMA;
const FORMA = Forma.SCHEMA;

export class Task extends Forma {
  constructor(cfg = {}) {
    const msg = 't2k.ctor';
    const dbg = T2K.CTOR;
    super({ id: cfg.id });
    this.put(cfg);

    dbg && cc.ok1(msg, ...cc.props(this));
  } // t2k.ctor

  static register(opts = {}) {
    Forma.registerSchema(FRACTION, opts);
    return Forma.registerSchema(Task.SCHEMA);
  }

  static get SCHEMA() {
    return new Schema({
      name: 'Task',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...FORMA.fields,
        { name: 'title', type: 'string' },
        { name: 'progress', type: FRACTION.fullName },
        { name: 'duration', type: FRACTION.fullName },
      ],
    });
  }

  put(value) {
    const msg = 't2k.put';
    const dbg = T2K.PUT;
    let {
      title = 'title?',
      progress = new Fraction(0, 1, 'done'),
      duration = new Fraction(null, 1, 's'),
    } = value;
    if (!(duration instanceof Fraction)) {
      duration = new Fraction(duration);
    }
    if (!(progress instanceof Fraction)) {
      progress = new Fraction(progress);
    }
    Object.assign(this, { title, progress, duration });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  patch(value = {}) {
    const msg = 't2k.patch';
    const dbg = T2K.PATCH;
    let {
      title = this.title,
      progress = this.progress,
      duration = this.duration,
    } = value;
    Object.assign(this, { title, progress, duration });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  toString() {
    const dbg = T2K.TO_STRING;
    let { id, title, progress, duration, started } = this;
    let time = '';
    let now = Date.now();
    let symbol = '.';
    let status = progress.toString({ asRange: '/' });
    let done = progress.value >= 1;
    if (done) {
      symbol = UOK;
      status = '' + progress.denominator + progress.units;
    } else if (started) {
      symbol = Unicode.RIGHT_GUILLEMET;
    }
    if (!duration.isNull) {
      time = ' ' + duration.toString();
    }

    return `${id}${symbol} ${title} (${status}${time})`;
  } // t2k.toString
} // class Task
