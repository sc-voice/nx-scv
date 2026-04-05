import { DBG } from '../defines.js';

export interface LogEntryOpts {
  level?: string;
  text?: string;
  ms?: number;
}

export class LogEntry {
  declare level: string;
  declare text: string;
  declare ms?: number;

  constructor(opts: LogEntryOpts = {}) {
    let { level = 'info', text = '', ms } = opts;
    Object.assign(this, { level, text, ms });
  }

  static args2String(args: any[]): string {
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

  static fromArgs(level: any, args: any[], ms?: number): LogEntry {
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

export interface LoggerOpts {
  sink?: any;
  msBase?: number;
  logLevel?: any;
}

export class Logger {
  declare history: LogEntry[];
  declare sink: any;
  declare msBase: number;
  declare logLevel: any;

  constructor(opts: LoggerOpts = {}) {
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

  addEntry(level: any, args: any[], fSink?: any): LogEntry {
    const msg = 'l4r.addEntry;';
    const dbg = (DBG as any).L4R_ADD_ENTRY;
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

  debug(...args: any[]): LogEntry {
    return this.addEntry(LEVEL_DEBUG, args, this.sink?.debug);
  }

  info(...args: any[]): LogEntry {
    return this.addEntry(LEVEL_INFO, args, this.sink?.info);
  }

  warn(...args: any[]): LogEntry {
    return this.addEntry(LEVEL_WARN, args, this.sink?.warn);
  }

  error(...args: any[]): LogEntry {
    return this.addEntry(LEVEL_ERROR, args, this.sink?.error);
  }

  log(...args: any[]): LogEntry {
    return this.addEntry(LEVEL_INFO, args, this.sink?.log);
  }
}
