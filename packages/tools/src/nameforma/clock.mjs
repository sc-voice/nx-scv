import { DBG } from '../../src/defines.mjs';
const { C3K } = DBG.N8A;
import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
const { CHECKMARK: OK } = Unicode;
const { cc } = ColorConsole;

let HEARTBEAT_INTERVAL = 3000; // default

export class Clock {
  static #instances = 0;
  static #privateCtor = false;
  constructor(cfg = {}) {
    const msg = 'c3k.ctor';
    const dbg = C3K.CTOR;
    if (!Clock.#privateCtor) {
      throw Error(`${msg} create()!`);
    }
    Clock.#instances++;
    let {
      id = 'C3K' + String(Clock.#instances).padStart(3, '0'),
      msIdle = 100,
    } = cfg;
    Object.assign(this, {
      id,
      running: false,
      timeIn: 0,
      timeOut: 0,
      msIdle,
    });
    Object.defineProperty(this, 'generator', {
      writable: true,
      value: null,
    });
    dbg && cc.ok1(msg + OK, ...cc.props(this));
  }

  static create(cfg) {
    const msg = 'c3k.create';
    const dbg = C3K.CREATE;
    Clock.#privateCtor = true;
    let clock = new Clock(cfg);
    Clock.#privateCtor = false;
    clock.generator = Clock.#generator(clock);
    dbg && cc.ok1(msg + OK);
    return clock;
  }

  static async *#generator(clock) {
    const msg = 'c3k.generator';
    const dbg = C3K.GENERATOR;
    clock.running = true;
    dbg > 1 && cc.ok(msg, 'started...');
    while (clock.running) {
      if (clock.timeIn === clock.timeOut) {
        dbg > 2 && cc.fyi(msg + 0.1, 'zzzz', clock.msIdle);
        await new Promise((res) => setTimeout(() => res(), clock.msIdle));
      } else {
        clock.timeOut = clock.timeIn;
        dbg > 2 && cc.ok1(msg + OK, 'before yield', clock.timeOut);
        yield clock.timeOut;
      }
    }
    dbg && cc.ok1(msg + OK, 'stopped');
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
    if (this.generator) {
      this.generator = null;
    }
  }

  update(timestamp = Date.now()) {
    const msg = 'c3k.update';
    const dbg = C3K.UPDATE;
    this.timeIn = timestamp;
    dbg && cc.ok1(msg + OK, timestamp);
  }
} // Clock
