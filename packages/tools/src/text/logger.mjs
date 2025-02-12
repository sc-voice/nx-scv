import { DBG } from '../defines.mjs';

export class LogEntry {
  constructor(opts = {}) {
    let { level = 'info', text = '', ms } = opts;
    Object.assign(this, { level, text, ms });
  }

  static args2String(args) {
    return args.reduce((a, arg) => {
      if (a) {
        a += ' ';
      }
      if (arg instanceof Array) {
        a += JSON.stringify(arg);
      } else if (typeof arg === 'object') {
        a += '{';
        Object.keys(arg).forEach((k, i) => {
          if (i) {
            a += ', ';
          }
          let ks = /[a-z0-9_$]+/i.test(k) ? k : `"${k}"`;
          let v = arg[k];
          a += ks + ':' + JSON.stringify(arg[k]);
        });
        a += '}';
      } else {
        a += arg;
      }
      return a;
    }, '');
  }

  static fromArgs(level, args, ms) {
    let entry = new LogEntry({
      level,
      text: LogEntry.args2String(args),
      ms,
    });
    return entry;
  }
}

const LEVEL_DEBUG = { id: 'D', priority: -1 };
const LEVEL_INFO = { id: 'I', priority: 0 };
const LEVEL_WARN = { id: 'W', priority: 1 };
const LEVEL_ERROR = { id: 'E', priority: 2 };
const LEVEL_LOG = { id: 'L', priority: 3 };

export class Logger {
  constructor(opts = {}) {
    let {
      sink = console,
      msBase = Date.now(),
      logLevel = Logger.LEVEL_WARN,
    } = opts;
    Object.assign(this, {
      history: [],
      sink,
      msBase,
      logLevel,
    });
  }

  static get LEVEL_DEBUG() {
    return LEVEL_DEBUG;
  }
  static get LEVEL_INFO() {
    return LEVEL_INFO;
  }
  static get LEVEL_WARN() {
    return LEVEL_WARN;
  }
  static get LEVEL_ERROR() {
    return LEVEL_ERROR;
  }
  static get LEVEL_LOG() {
    return LEVEL_LOG;
  }

  addEntry(level, args, fSink) {
    const msg = 'l4r.addEntry;';
    const dbg = DBG.L4R_ADD_ENTRY;
    let { logLevel, history, sink, msBase } = this;
    let ms = Date.now() - msBase;
    let entry = LogEntry.fromArgs(level, args, ms);
    history.push(entry);
    if (sink && level.priority >= logLevel.priority) {
      dbg && console.log(msg, 'sink');
      fSink?.apply(sink, args);
    }
    return entry;
  }

  debug(...args) {
    return this.addEntry(LEVEL_DEBUG, args, this.sink?.debug);
  }

  info(...args) {
    return this.addEntry(LEVEL_INFO, args, this.sink?.info);
  }

  warn(...args) {
    return this.addEntry(LEVEL_WARN, args, this.sink?.warn);
  }

  error(...args) {
    return this.addEntry(LEVEL_ERROR, args, this.sink?.error);
  }

  log(...args) {
    return this.addEntry(LEVEL_INFO, args, this.sink?.log);
  }
}
