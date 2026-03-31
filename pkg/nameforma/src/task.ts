import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';
import { Forma } from './forma.js';
import { Rational } from './rational.js';
import { Schema } from './schema.js';
import { Action } from './action.js';
import { FormaCollection } from './forma-collection.js';

const { ColorConsole, Unicode } = Text;
const { TASK: T2K } = DBG;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const RATIONAL = Rational.avroSchema;
const FORMA = Forma.avroSchema;

export class Task extends Forma {
  title: string = 'title?';
  progress: any = new Rational(0, 1, 'done');
  duration: any = new Rational(null, 1, 's');
  #actions: FormaCollection<Action>;

  constructor(cfg: any = {}) {
    const msg = 't2k.ctor';
    const dbg = T2K.CTOR;
    super({ id: cfg.id }); // for deserialized tasks
    this.#actions = new FormaCollection(this.id, Action);
    this.put(cfg);

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  get actions(): FormaCollection<Action> {
    return this.#actions;
  }

  // TODO: This method is unexpected and seems to be a hack
  static registerSchema(opts: any = {}) {
    Schema.registerType(Rational, opts);
    //Schema.registerType(FormaCollection.schemaOf(Action), opts);
    return Schema.registerType(this, opts);
  }

  static entity = 'task';

  static override get avroSchema() {
    return {
      name: 'Task',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...FORMA.fields,
        { name: 'title', type: 'string' },
        { name: 'progress', type: (RATIONAL as any).fullName },
        { name: 'duration', type: (RATIONAL as any).fullName },
     //   { name: 'actions', type: (FormaCollection.schemaOf(Action) as any).fullName },
      ],
    };
  }

  static fromJson(data: any): Task {
    return new Task(data);
  }

  put(value: any) {
    const msg = 't2k.put';
    const dbg = T2K.PUT;
    super.patch(value);
    let {
      title = 'title?',
      progress = new Rational(0, 1, 'done'),
      duration = new Rational(null, 1, 's'),
      actions = [],
    } = value;
    if (!(duration instanceof Rational)) {
      duration = new Rational(duration);
    }
    if (!(progress instanceof Rational)) {
      progress = new Rational(progress);
    }
    Object.assign(this, { title, progress, duration });

    // Replace actions FormaCollection entirely
    this.#actions = new FormaCollection(this.id, Action);
    if (actions?.length) {
      for (const actionCfg of actions) {
        this.#actions.addItem(actionCfg);
      }
    }

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  override patch(value: any = {}) {
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

  override toString() {
    const dbg = T2K.TO_STRING;
    let { name, title, progress, duration } = this as any;
    let time = '';
    let symbol = '.';
    let status = progress.toString({ asRange: '/' });
    let done = progress.value >= 1;
    if (done) {
      symbol = UOK;
      status = '' + progress.denominator + progress.units;
    } else if ((this as any).started) {
      symbol = Unicode.RIGHT_GUILLEMET;
    }
    if (!duration.isNull) {
      time = ' ' + duration.toString();
    }

    dbg;
    return `${name}${symbol} ${title} (${status}${time})`;
  }
}
