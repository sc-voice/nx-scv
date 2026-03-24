import { DBG } from './defines.js';
import { Text } from '@sc-voice/tools';
import { Forma } from './forma.js';

const { CLOCK: C3K } = DBG;
const { ColorConsole, Unicode } = Text;
const { CHECKMARK: OK } = Unicode;
const { cc } = ColorConsole;

/**
 * Clock - Async generator-based timing control
 *
 * ## Overview
 * - Tracks time-in and time-out for scheduling
 * - Supports start/stop and async iteration
 * - Used by Kafka1 Consumer for message polling
 * - Extends Forma (inherits id and name)
 *
 * ## State Machine
 * Idle → Running: start()
 * Running → Polling: next() called
 * Polling → Idle_Wait: when timeIn == timeOut (waits in idle() ~500ms)
 * Idle_Wait → Polling: idle() completes, update(timestamp)
 * Running → Stopped: stop()
 * Stopped → [*]
 */
export class Clock extends Forma {
  #referenceBase: any;
  #referenceTime: any;
  #idle: any;
  #done = false;
  #timeIn = 0;
  #timeOut = 0;
  #generator: any;
  #running = false;

  /**
   * Construct a Clock with optional timing configuration.
   * @param cfg - Configuration object
   *   - referenceTime: Function returning current time (default: Date.now)
   *   - idle: Async function for idle waits (default: 500ms setTimeout)
   */
  constructor(cfg: any = {}) {
    const msg = 'c3k.ctor';
    super(cfg);
    const dbg = C3K.CTOR;
    let {
      referenceTime = () => Date.now(),
      idle = () => new Promise<void>((r) => setTimeout(() => r(), 500)),
    } = cfg;
    this.#idle = idle;
    this.#referenceTime = referenceTime;
    dbg && cc.ok1(msg + OK, ...cc.props(this));
  }

  /**
   * Current scheduled time (updated via update() calls).
   * @returns timeIn timestamp value
   */
  get timeIn() {
    return this.#timeIn;
  }

  /**
   * Last processed time (equals timeIn after polling).
   * Drives state machine: idle when timeIn == timeOut, active when timeIn > timeOut.
   * @returns timeOut timestamp value
   */
  get timeOut() {
    return this.#timeOut;
  }

  /**
   * Check if Clock is actively running.
   * @returns true if started and not stopped
   */
  get running() {
    return this.#running;
  }

  /**
   * Async generator polling loop. Yields timestamps and manages state transitions.
   * - When timeIn == timeOut: Awaits idle(), then updates with current time
   * - When timeIn > timeOut: Immediately processes new timestamp
   * - Continues until running is false
   */
  async *#createGenerator() {
    const msg = 'c3k.creatGenerator';
    const dbg = C3K.CREATE_GENERATOR;
    while (this.#running) {
      dbg > 1 && cc.ok(msg + 2.1, 'running', this.#timeOut);
      if (this.#timeIn === this.#timeOut) {
        // Idle wait when no new time scheduled
        dbg > 1 && cc.ok(msg + OK, 'idle...', this.#timeIn, this.#timeOut);
        await this.#idle();
        this.update(this.now());
        dbg && cc.ok1(msg + OK, '...idle', this.#timeIn, this.#timeOut);
      } else {
        // New time available
        dbg && cc.ok1(msg + OK, 'new', this.#timeIn, this.#timeOut);
      }
      this.#timeOut = this.#timeIn;
      yield this.#timeOut;
    }
    dbg && cc.ok1(msg + OK, 'stopped');
  }

  /**
   * Get current time via referenceTime function.
   * @returns Current timestamp
   */
  now() {
    return this.#referenceTime();
  }

  /**
   * Start the Clock state machine. Initializes generator and sets running = true.
   * @param cfg - Optional configuration with idle function override
   * @returns this Clock instance for chaining, or undefined if already running
   */
  async start(cfg: any = {}) {
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

  /**
   * Advance the Clock to next scheduled time. Part of async iteration protocol.
   * Delegates to async generator's next() method.
   * @returns Promise with { done: boolean, value: timestamp }
   */
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

  /**
   * Stop the Clock state machine. Sets running = false and cleans up generator.
   */
  async stop() {
    this.#running = false;
    this.#done = true;
    if (this.#generator) {
      this.#generator = null;
    }
  } // stop

  /**
   * Update scheduled time (timeIn). Only accepts monotonic increases.
   * Driving method for state machine: when timeIn > timeOut, next() will process immediately.
   * @param timestamp - New scheduled time (must be >= current timeIn)
   * @throws Error if timestamp is null
   */
  update(timestamp: any) {
    const msg = 'c3k.update';
    const dbg = C3K.UPDATE;
    if (timestamp == null) {
      throw new Error(`${msg} timestamp?`);
    }
    if (timestamp < this.#timeIn) {
      // Monotonic constraint: ignore backward time
      dbg && cc.bad1(msg + '?', 'ignored:', this.#timeIn, timestamp); // monotonic updates
      //dbg && cc.ok1(msg + '?', 'ignored:', this.#timeIn, timestamp); // monotonic updates
    } else {
      this.#timeIn = timestamp;
      dbg && cc.ok1(msg + OK, this.#timeIn, timestamp);
    }
  } // update
} // Clock
