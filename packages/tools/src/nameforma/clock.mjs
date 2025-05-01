import { DBG } from '../../src/defines.mjs';
const { C3K } = DBG.N8A;
import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
const { CHECKMARK: OK } = Unicode;
const { cc } = ColorConsole;

let HEARTBEAT_INTERVAL = 3000; // default

export class Clock {
  static #privateCtor = false;
  constructor(cfg = {}) {
    const msg = 'c3k.ctor';
    const dbg = C3K.CTOR;
    if (!Clock.#privateCtor) {
      throw Error(`${msg} create()!`);
    }
    let { msIdle = HEARTBEAT_INTERVAL / 2 } = cfg;
    this.running = false;
    this.timeIn = 0;
    this.timeOut = 0;
    this.msIdle = msIdle;
    Object.defineProperty(this, 'generator', {
      writable: true,
      value: null,
    });
    dbg && cc.ok1(msg + OK, ...cc.props(this));
  }

  static create(cfg) {
    Clock.#privateCtor = true;
    let clock = new Clock(cfg);
    Clock.#privateCtor = false;
    clock.generator = Clock.#generator(clock);
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
    return clock;
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

  stop() {
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
