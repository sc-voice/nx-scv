import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: OK } = Unicode;
import { DBG } from '../defines.mjs';
import { Admin, Consumer, Kafka1, Producer } from './kafka1.mjs';

export class Timers {
  constructor(cfg = {}) {
    const msg = 't4s.ctor';
    const dbg = DBG.T4S_CTOR;
    let {
      kafka,
      groupId = 'g5d.timers',
      topic = 't3c.timers',
      timerMap = {},
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
      value: kafka.consumer({groupId}),
    });
    this.consumer.connect();
    dbg && cc.ok1(msg + OK);
  }

  async onList(message) {
    const msg = 't4s.onList';
    const dbg = DBG.T4S_ON_LIST;
    let { timerMap } = this;
    let { action } = message;
    let timers = Object.keys(timerMap);
    dbg && cc.ok1(msg+OK, JSON.stringify(timers));
  }

  async eachMessage(req) {
    const msg = 't4s.eachMessage';
    const dbg = DBG.T4S_EACH_MESSAGE;
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
      dbg && cc.ok1(msg + OK, {topic, action});
    } catch(e) {
      cc.bad1(msg, 'ERROR', e.message, message);
    }
  }

  async start() {
    const msg = 't4s.start';
    const dbg = DBG.T4S_START;
    let { topic, groupId, consumer } = this;

    dbg>1 && cc.fyi(msg+1.1, groupId, 'subscribe', topic);
    await consumer.subscribe({ topics: [topic] });

    dbg && cc.fyi(msg+1.2, 'run:', groupId, 'topic:', topic);
    return consumer.run({
      eachMessage: req=>this.eachMessage(req),
    });
  }
}
