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
      msIdle = 100,
      period = 1000, // ms
    } = cfg;
    Object.assign(this, {
      id,
      running: false,
      timeIn: 0,
      timeOut: 0,
      msIdle,
      created: Date.now(),
      period,
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
      if (clock.timeIn === clock.timeOut) {
        dbg > 1 && cc.fyi(msg + 0.1, 'idle:', clock.msIdle);
        await new Promise((res) => setTimeout(() => res(), clock.msIdle));
      } else {
        clock.timeOut = clock.timeIn;
        dbg > 1 && cc.ok1(msg + OK, 'before yield', clock.timeOut);
        yield clock.timeOut;
      }
    }
    dbg && cc.ok1(msg + OK, 'stopped');
  }

  async start() {
    const msg = 'c3k.start';
    const dbg = C3K.START;
    if (this.running) {
      cc.bad1(msg, 'running?');
      throw new Error(`${msg} running?`);
    }
    this.running = true;
    this.generator = Clock.#generator(this);
    if (this.period > 0) {
      dbg > 1 && cc.fyi1(msg + 2.1, 'setInterval:', Date.now());
      this.interval = setInterval(() => {
        let now = Date.now();
        dbg > 1 && cc.fyi1(msg + 2, 'autoUpdate:', now);
        this.update(now);
      }, this.period);
    }
    dbg && cc.ok1(msg + OK, 'started:', this.id);
  }

  async next() {
    const msg = 'c3k.next';
    const dbg = C3K.NEXT;
    let { generator } = this;
    let result = { done: true };
    if (generator) {
      result = await (generator && generator.next());
      dbg && cc.ok1(msg + 9.1 + OK, result);
    } else {
      dbg && cc.ok1(msg + 9.2 + OK, result);
    }
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
