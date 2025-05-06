import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: OK } = Unicode;
import { DBG } from '../defines.mjs';
const { T3R, T4S } = DBG.N8A;
import { Admin, Consumer, Producer } from './kafka1.mjs';

let timerInstances = 0;

export class Timer {
  constructor(cfg = {}) {
    const msg = 't3r.ctor';
    const dbg = T3R.CTOR;
    let {
      count = 0, // iterations completed
      created = Date.now(),
      delay = 0, // ms
      duration = 1000, // ms
      iterations = 1, // # iterations
      name,
      topic = 't3r.event', // consumer
    } = cfg;

    timerInstances++;
    name = name || `T3R-${('' + timerInstances).padStart(3, '0')}`;

    Object.assign(this, {
      count,
      created,
      delay,
      duration,
      iterations,
      name,
      topic,
    });

    // biome-ignore format:
    dbg && cc.ok1(msg + OK, name, 'ms:', delay + '+' + duration,
      'n:', count + '/' + iterations, 'topic:', topic);
  }

  async update(cfg = {}) {
    const msg = 't3r.update';
    const dbg = T3R.UPDATE;
    let { count, created, delay, duration, iterations, name, topic } =
      this;
    let { now = Date.now(), key = name, producer } = cfg;
    let elapsed = now - created;
    let period = delay + duration;
    let countActual = Math.min(iterations, Math.floor(elapsed / period));

    let messages = [];
    while (count < countActual) {
      count++;
      messages.push({
        key,
        value: { name, created, delay, duration, count, iterations },
      });
      dbg > 1 &&
        cc.fyi1(msg + 2.1, {
          elapsed,
          count,
          countActual,
          period,
          messages: messages.length,
        });
    }

    if (messages.length) {
      if (producer) {
        await producer.send({ topic, messages });
      }
      this.count = count;
    }

    dbg && cc.ok1(msg + OK, { topic, messages: messages.length });
  } // t3r.update
} // Timer

export class Timers {
  constructor(cfg = {}) {
    const msg = 't4s.ctor';
    const dbg = T4S.CTOR;
    let {
      kafka,
      groupId = 'g5d.timers',
      topic = 't3c.timers',
      timerMap = {},
      period = 500, // sampling period in ms
    } = cfg;
    if (kafka == null) {
      cc.bad1(msg + -1.1, 'kafka?');
      throw new Error(`${msg} kafka?`);
    }

    Object.assign(this, {
      groupId,
      topic,
      timerMap,
    });
    Object.defineProperty(this, 'kafka', {
      value: kafka,
    });
    Object.defineProperty(this, 'producer', {
      value: kafka.producer(),
    });
    this.producer.connect();
    Object.defineProperty(this, 'consumer', {
      value: kafka.consumer({ groupId }),
    });
    this.consumer.connect();
    dbg && cc.ok1(msg + OK);
  }

  async onList(message) {
    const msg = 't4s.onList';
    const dbg = T4S.ON_LIST;
    let { timerMap } = this;
    let { action } = message;
    let timers = Object.keys(timerMap);
    dbg && cc.ok1(msg + OK, JSON.stringify(timers));
  }

  async eachMessage(req) {
    const msg = 't4s.eachMessage';
    const dbg = T4S.EACH_MESSAGE;
    let { timerMap } = this;
    let { topic, partition, message } = req;
    let { action } = message;
    let timers = Object.keys(timerMap);
    try {
      switch (action) {
        case 'list':
          this.onList(message);
          break;
        default:
          break;
      }
      dbg && cc.ok1(msg + OK, { topic, action });
    } catch (e) {
      cc.bad1(msg, 'ERROR', e.message, message);
    }
  }

  async start(cfg = {}) {
    const msg = 't4s.start';
    const dbg = T4S.START;
    let { topic, groupId, consumer } = this;
    let { _msSleep } = cfg;

    dbg > 1 && cc.fyi(msg + 1.1, groupId, 'subscribe', topic);
    await consumer.subscribe({ topics: [topic] });

    dbg && cc.fyi(msg + 1.2, 'run:', groupId, 'topic:', topic);
    return consumer.run({
      eachMessage: (req) => this.eachMessage(req),
      _msSleep,
    });
  }

  async stop() {
    const msg = 't4s.stop';
    const dbg = T4S.STOP;
    await this.consumer.stop();
    this.consumer.disconnect();
    this.producer.disconnect();
  }
} // Timers
