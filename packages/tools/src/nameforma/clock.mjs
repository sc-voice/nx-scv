import { DBG } from '../../src/defines.mjs';
const { C3K } = DBG.N8A;
import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
const { CHECKMARK: OK } = Unicode;
const { cc } = ColorConsole;

let HEARTBEAT_INTERVAL = 3000; // default

export class Clock {
  static #instances = 0;
  constructor(cfg = {}) {
    const msg = 'c3k.ctor';
    const dbg = C3K.CTOR;
    Clock.#instances++;
    let {
      id = 'C3K' + String(Clock.#instances).padStart(3, '0'),
      period = 1000, // ms
      msIdle = period/2,
    } = cfg;
    Object.assign(this, {
      id,
      running: false,
      timeIn: 0,
      timeOut: 0,
      msIdle,
      period,
      startTime: undefined,
    });
    Object.defineProperty(this, 'interval', {
      writable: true,
      value: null,
    });
    Object.defineProperty(this, 'generator', {
      writable: true,
      value: null,
    });
    dbg && cc.ok1(msg + OK, ...cc.props(this));
  }

  static async *#generator(clock) {
    const msg = 'c3k.generator';
    const dbg = C3K.GENERATOR;
    while (clock.running) {
      dbg > 1 && cc.ok(msg + 2.1, 'running', clock.timeOut);
      if (clock.timeIn === clock.timeOut) {
        yield new Promise((res) => {
          setTimeout(() => {
            dbg && cc.ok1(msg + OK, '==timeOut:', clock.timeOut);
            res(clock.timeOut);
          });
        }, clock.msIdle);
      } else {
        clock.timeOut = clock.timeIn;
        dbg && cc.ok1(msg+OK, '++timeOut:', clock.timeOut);
        yield clock.timeOut;
      }
    }
    dbg && cc.ok1(msg + OK, 'stopped');
  }

  async start(cfg={}) {
    const msg = 'c3k.start';
    const dbg = C3K.START;
    let { startTime = Date.now() } = this;
    if (this.running) {
      dbg && cc.bad1(msg, 'ignored');
      return;
    }

    if ( cfg.startTime != null) {
      startTime = cfg.startTime;
    }
    this.startTime = startTime;

    this.running = true;
    this.update(startTime);
    this.generator = Clock.#generator(this);
    if (this.period > 0) {
      dbg > 1 && cc.ok(msg + 2.1, 'setInterval:', Date.now());
      this.interval = setInterval(() => {
        let now = Date.now();
        dbg > 1 && cc.ok(msg + 2, 'autoUpdate:', now);
        this.update(now-startTime);
      }, this.period);
    }
    dbg && cc.ok1(msg + OK, 'started:', this.id);

    return this;
  }

  async next() {
    const msg = 'c3k.next';
    const dbg = C3K.NEXT;
    let { running, timeOut, generator } = this;
    if (!running) {
      return { done: false, value: timeOut }
    }
    if (generator == null) {
      dbg && cc.ok1(msg + 9.1 + OK, 'no-generator:', result);
      return { done: true };
    }

    dbg > 1 && cc.ok(msg + 2.1, ' g7r.next...');
    let result = await generator.next();
    dbg && cc.ok1(msg + 9.2 + OK, '...g7r.next=>', result);

    return result;
  }

  async stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    if (this.generator) {
      this.generator = null;
    }
  }

  update(timestamp = Date.now()) {
    const msg = 'c3k.update';
    const dbg = C3K.UPDATE;
    if (timestamp < this.timeIn) {
      dbg && cc.ok1(msg, 'ignored:', timestamp); // monotonic updates
    } else {
      this.timeIn = timestamp;
      dbg && cc.ok1(msg + OK, timestamp);
    }
  }
} // Clock
