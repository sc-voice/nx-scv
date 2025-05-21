import { Forma } from './forma.mjs';
const SRC = '../../src';
const MATH = `${SRC}/math`;
const TEXT = `${SRC}/text`;
import { DBG } from '../../src/defines.mjs';
import { Fraction } from '../../src/math/fraction.mjs';
import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
const { T2K, S6E } = DBG.N8A;
const { cc } = ColorConsole;
const { ELLIPSIS, CHECKMARK: UOK } = Unicode;

export class Task extends Forma {
  constructor(cfg = {}) {
    const msg = 't2k.ctor';
    const dbg = T2K.CTOR;
    super({ id: cfg.id });
    let {
      title = `${this.id}-title?`,
      progress = new Fraction(0, 1, 'done'),
    } = cfg;
    if (!(progress instanceof Fraction)) {
      progress = new Fraction(progress);
    }
    Object.assign(this, { title, progress });

    dbg && cc.ok1(msg, ...cc.props(this));
  } // t2k.ctor

  static get SCHEMA() {
    let sFraction = Fraction.SCHEMA;
    return {
      name: 'Task',
      namespace: 'scVoice.tools.nameforma',
      type: 'record',
      fields: [
        ...Forma.SCHEMA_FIELDS,
        { name: 'title', type: 'string' },
        { name: 'progress', type: sFraction },
      ],
    };
  }

  update(value) {
    const msg = 't2k.update';
    const dbg = T2K.UPDATE;
    const now = Date.now();
    let { msStart, msEnd, progress } = this;
    if (this.msStart == null) {
      this.msStart = now;
      dbg > 1 && cc.ok(msg, 'msStart:', now);
    }
    progress.numerator = value;
    if (msEnd == null && progress.value >= 1) {
      this.msEnd = Date.now();
      dbg > 1 && cc.ok(msg, 'msStart:', now);
    }
    dbg && cc.ok(msg + UOK, this.toString());
  } // t2k.update

  toString() {
    const dbg = T2K.TO_STRING;
    let { id, title, progress, msStart, msEnd, done, started } = this;
    let time = '';
    let now = Date.now();
    let symbol = '.';
    let status = progress.toString({ asRange: '/' });
    if (done) {
      symbol = UOK;
      status = '' + progress.denominator + progress.units;
    } else if (started) {
      symbol = Unicode.RIGHT_GUILLEMET;
    }
    if (msStart != null) {
      let elapsed = (((msEnd || now) - msStart) / 1000).toFixed(1);
      time = ' ' + elapsed + 's';
    }

    return `${id}${symbol} ${title} (${status}${time})`;
  } // t2k.toString
} // class Task
