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

export class Logger {
  constructor(opts = {}) {
    let { sink = console, msBase = Date.now() } = opts;
    Object.assign(this, {
      history: [],
      sink,
      msBase,
    });
  }

  addEntry(level, args, fSink) {
    const msg = 'l4r.addEntry;';
    const dbg = DBG.L4R_ADD_ENTRY;
    let { history, sink, msBase } = this;
    let ms = Date.now() - msBase;
    let entry = LogEntry.fromArgs(level, args, ms);
    history.push(entry);
    if (sink) {
      dbg && console.log(msg, 'sink');
      fSink?.apply(sink, args);
    }
    return entry;
  }

  debug(...args) {
    return this.addEntry('D', args, this.sink?.debug);
  }

  info(...args) {
    return this.addEntry('I', args, this.sink?.info);
  }

  log(...args) {
    return this.addEntry('L', args, this.sink?.log);
  }

  warn(...args) {
    return this.addEntry('W', args, this.sink?.warn);
  }

  error(...args) {
    return this.addEntry('E', args, this.sink?.error);
  }
}
