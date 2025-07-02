import { DBG } from './defines.mjs';
const { CLOCK: C3K } = DBG;
import { ColorConsole } from '../../src/text/color-console.mjs';
import { Unicode } from '../../src/text/unicode.mjs';
import { Forma } from './forma.mjs';
const { CHECKMARK: OK } = Unicode;
const { cc } = ColorConsole;

export class Clock extends Forma {
  #referenceBase;
  #referenceTime;
  #idle;
  #done = false;
  #timeIn = 0;
  #timeOut = 0;
  #generator;
  #running = false;

  constructor(cfg = {}) {
    const msg = 'c3k.ctor';
    super(cfg);
    const dbg = C3K.CTOR;
    let {
      referenceTime = () => Date.now(),
      idle = () => new Promise((r) => setTimeout(() => r(), 500)),
    } = cfg;
    this.#idle = idle;
    this.#referenceTime = referenceTime;
    dbg && cc.ok1(msg + OK, ...cc.props(this));
  }

  get timeIn() {
    return this.#timeIn;
  }
  get timeOut() {
    return this.#timeOut;
  }
  get running() {
    return this.#running;
  }

  async *#createGenerator() {
    const msg = 'c3k.creatGenerator';
    const dbg = C3K.CREATE_GENERATOR;
    while (this.#running) {
      dbg > 1 && cc.ok(msg + 2.1, 'running', this.#timeOut);
      if (this.#timeIn === this.#timeOut) {
        dbg > 1 && cc.ok(msg + OK, 'idle...', this.#timeIn, this.#timeOut);
        await this.#idle();
        this.update(this.now());
        dbg && cc.ok1(msg + OK, '...idle', this.#timeIn, this.#timeOut);
      } else {
        dbg && cc.ok1(msg + OK, 'new', this.#timeIn, this.#timeOut);
      }
      this.#timeOut = this.#timeIn;
      yield this.#timeOut;
    }
    dbg && cc.ok1(msg + OK, 'stopped');
  }

  now() {
    return this.#referenceTime();
  }

  async start(cfg = {}) {
    const msg = 'c3k.start';
    const dbg = C3K.START;
    let { idle = this.#idle } = cfg;
    this.#idle = idle;
    let now = this.#referenceTime();
    if (this.#running) {
      dbg && cc.bad1(msg, 'ignored');
      return;
    }

    this.#referenceBase = now;
    this.update(this.now());
    this.#generator = this.#createGenerator();
    this.#running = true;
    dbg && cc.ok1(msg + OK, 'started:', this.id);

    return this;
  } // start

  async next() {
    const msg = 'c3k.next';
    const dbg = C3K.NEXT;
    let { timeOut } = this;
    if (!this.#running) {
      return { done: this.#done, value: timeOut };
    }

    dbg > 1 && cc.ok(msg + 2.1, ' g7r.next...');
    let result = await this.#generator.next();
    dbg && cc.ok1(msg + OK, '...g7r.next=>', result);

    return result;
  } // next

  async stop() {
    this.#running = false;
    this.#done = true;
    if (this.#generator) {
      this.#generator = null;
    }
  } // stop

  update(timestamp) {
    const msg = 'c3k.update';
    const dbg = C3K.UPDATE;
    if (timestamp == null) {
      throw new Error(`${msg} timestamp?`);
    }
    if (timestamp < this.#timeIn) {
      dbg && cc.bad1(msg + '?', 'ignored:', this.#timeIn, timestamp); // monotonic updates
      //dbg && cc.ok1(msg + '?', 'ignored:', this.#timeIn, timestamp); // monotonic updates
    } else {
      this.#timeIn = timestamp;
      dbg && cc.ok1(msg + OK, this.#timeIn, timestamp);
    }
  } // update
} // Clock
