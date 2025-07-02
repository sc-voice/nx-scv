import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
import { DBG } from './defines.mjs';
import { Forma } from './forma.mjs';
import { Rational } from './rational.mjs';
import { Schema } from './schema.mjs';
const { TASK: T2K } = DBG;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;
const RATIONAL = Rational.SCHEMA;
const FORMA = Forma.SCHEMA;

export class Task extends Forma {
  constructor(cfg = {}) {
    const msg = 't2k.ctor';
    const dbg = T2K.CTOR;
    super({ id: cfg.id }); // for deserialized tasks
    this.put(cfg);

    dbg && cc.ok1(msg, ...cc.props(this));
  } // t2k.ctor

  static registerSchema(opts = {}) {
    Schema.register(Rational.SCHEMA, opts);
    return Schema.register(this.SCHEMA, opts);
  }

  static get SCHEMA() {
    return new Schema({
      name: 'Task',
      type: 'record',
      fields: [
        ...FORMA.fields,
        { name: 'title', type: 'string' },
        { name: 'progress', type: RATIONAL.fullName },
        { name: 'duration', type: RATIONAL.fullName },
      ],
    });
  }

  put(value) {
    const msg = 't2k.put';
    const dbg = T2K.PUT;
    super.patch(value);
    let {
      title = 'title?',
      progress = new Rational(0, 1, 'done'),
      duration = new Rational(null, 1, 's'),
    } = value;
    if (!(duration instanceof Rational)) {
      duration = new Rational(duration);
    }
    if (!(progress instanceof Rational)) {
      progress = new Rational(progress);
    }
    Object.assign(this, { title, progress, duration });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  patch(value = {}) {
    const msg = 't2k.patch';
    const dbg = T2K.PATCH;
    super.patch(value);
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
    let { name, title, progress, duration, started } = this;
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

    return `${name}${symbol} ${title} (${status}${time})`;
  } // t2k.toString
} // class Task
