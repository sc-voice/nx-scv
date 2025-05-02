import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { Timer, Timers, Kafka1, Admin, Producer, Consumer } = NameForma;
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { GREEN, BLUE, MAGENTA, NO_COLOR } = Unicode.LINUX_COLOR;
const { CHECKMARK: OK } = Unicode;
const {
  UNDERLINE,
  NO_UNDERLINE,
  STRIKETHROUGH,
  NO_STRIKETHROUGH,
  BOLD,
  NO_BOLD,
} = Unicode.LINUX_STYLE;

const PRODUCTION = false;
const heartbeatInterval = PRODUCTION ? 3000 : 1000;

const kafka = new Kafka1({
  clientId: 'test-timers',
});

describe('timers', () => {
  it('t3r.ctor', () => {
    let created = Date.now();
    let t1 = new Timer();
    should(t1.name).match(/T3R-[0-9]+/);
    should(t1).properties({
      count: 0,
      delay: 0,
      duration: 1000,
      iterations: 1,
      topic: 't3r.event',
    });
    should(t1.created)
      .above(created - 1)
      .below(created + 2);
  });
  it('t3r.update', async () => {
    let iterations = 4;
    let created = 1000;
    let name = 'tt3r.update.name';
    let topic = 'tt3r.update';
    let key = 'test-key';
    let count = 1;
    let delay = 2;
    let duration = 3;
    let t3r = new Timer({
      name,
      created,
      count,
      delay,
      duration,
      iterations,
      topic,
    });
    let events = [];
    let producer = {
      send: (event) => {
        events.push(event);
      },
    };

    // nothing happens for a previously handled update
    await t3r.update({ producer, now: created + 9 });
    should(events.length).equal(0);

    // new update triggers 1 message
    await t3r.update({ producer, key, now: created + 10 });
    should(events.length).equal(1);
    should(events[0].topic).equal(topic);
    should(events[0].messages.length).equal(1);
    should(events[0].messages[0].key).equal(key);
    should(events[0].messages[0].value).properties({
      count: 2,
      created,
      delay,
      duration,
      iterations,
      name,
    });

    // new, delayed update triggers all remaining messages
    await t3r.update({ producer, key, now: created + 100 });
    should(events.length).equal(2);
    should(events[1].topic).equal(topic);
    should(events[1].messages.length).equal(2);
    should(events[1].messages[0].key).equal(key);
    should(events[1].messages[0].value).properties({ count: 3 });
    should(events[1].messages[1].key).equal(key);
    should(events[1].messages[1].value).properties({ count: 4 });
  });
  it('t4s.ctor', () => {
    let t4s = new Timers({ kafka });
    should(t4s).properties({
      groupId: 'g5d.timers',
      topic: 't3c.timers',
      timerMap: {},
    });
    should(t4s).properties(['groupId', 'topic', 'timerMap']);
    should(t4s.consumer).instanceOf(Consumer);
    should(t4s.producer).instanceOf(Producer);
  });
  it('list', async () => {
    const msg = 'tt4s.list';
    const dbg = 0;
    const topic = 'tt4s.list';
    dbg && cc.tag1(msg, 'begin');
    let t4s = new Timers({ kafka, topic });
    dbg > 1 && cc.fyi(msg + 1.1, 'start');
    t4s.start(); // do not await
    dbg > 1 && cc.fyi(msg + 1.2, 'list');
    let producer = kafka.producer();
    await producer.connect();
    let msgList = { action: 'list' };
    await producer.send({ topic, messages: [msgList] });
    dbg && cc.tag1(msg, 'end');
    await t4s.stop();
    await producer.disconnect();
  });
});
