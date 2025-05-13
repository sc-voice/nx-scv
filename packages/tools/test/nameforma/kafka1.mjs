import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { _Runner, Kafka1, Producer, Consumer, Admin } = NameForma;
import { Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole, List, ListFactory } = Text;
const { cc } = ColorConsole;
const { GREEN, BLUE, MAGENTA, NO_COLOR } = Unicode.LINUX_COLOR;
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
const TEST_DBG = 1;

describe('kafka', function () {
  this.timeout(4 * heartbeatInterval);
  it('k3a.ctor', async () => {
    let ka = new Kafka1();
    should(ka).properties({
      clientId: 'no-client-id',
    });

    let clientId = 'test-client-id';
    let kaTest = new Kafka1({ clientId });
    should(kaTest).properties({
      clientId,
      nodeId: '123',
    });
  });
  it('k3a.admin()', async () => {
    let ka = new Kafka1();
    let admin = ka.admin();
    should(admin).instanceOf(Admin);
    should.deepEqual(await admin.listTopics(), []);

    await admin.connect();
    should(admin.connections).equal(1);

    await admin.disconnect();
    should(admin.connections).equal(0);
  });
  it('k3a.listGroups()', async () => {
    const msg = 'tk3a.listGroups';
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupG1 = 'tL8S.G1';
    let groups1 = await admin.listGroups();
    should.deepEqual(groups1, []);
    let topicA = 'topicA';
    let consumerG1 = ka.consumer({ groupId: groupG1 });
    await await consumerG1.connect();
    let groups2 = await admin.listGroups();
    should.deepEqual(groups2, [
      {
        groupId: groupG1,
        protocolType: 'consumer',
      },
    ]);

    await admin.disconnect();
    await consumerG1.disconnect();
  });
  it('k3a.describeGroups()', async () => {
    const msg = 'k3a.describeGroups';
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupG1 = 'tD12S.G1';
    let groups1 = await admin.describeGroups();
    should.deepEqual(groups1, []);
    let topicA = 'topicA';
    let consumerG1 = ka.consumer({ groupId: groupG1 });
    await await consumerG1.connect();
    let groups2 = await admin.describeGroups();
    should.deepEqual(groups2, [
      {
        errorCode: 0,
        groupId: groupG1,
        protocolType: 'consumer',
        state: 'stable',
      },
    ]);

    await admin.disconnect();
    await consumerG1.disconnect();
  });
  it('k3a.producer()', async () => {
    let ka = new Kafka1();
    let producer = ka.producer();
    should(producer).instanceOf(Producer);

    await producer.connect();
    should(producer.connections).equal(1);

    await producer.disconnect();
    should(producer.connections).equal(0);
  });
  it('k3a.consumer()', async () => {
    const msg = 'tk3a.consumer';
    const dbg = TEST_DBG;
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupId = 'tC6R.G1';
    let groupOther = 'TC6R.GX';
    let topicA = 'tC6R.TA';

    let offsets1 = await admin.fetchOffsets({ groupId });
    should(offsets1.length).equal(0);
    dbg > 1 &&
      cc.fyi1(msg + 1, groupId, 'offsets1:', JSON.stringify(offsets1));

    let consumer = ka.consumer({ groupId });
    should(consumer).instanceOf(Consumer);
    should(consumer).properties({
      groupId,
      heartbeatInterval: 3000,
      sessionTimeout: 30000,
    });
    let offsets2 = await admin.fetchOffsets({ groupId });
    should(offsets2.length).equal(0);

    await consumer.connect();
    should(consumer.connections).equal(1);

    dbg > 1 &&
      cc.fyi1(msg + 2, groupId, 'offsets2:', JSON.stringify(offsets2));
    let t4A = ka._topicOfName(topicA);

    // _consumeMap is used to update consumer Clocks
    let consumerOther = ka.consumer({ groupId: groupOther });
    should(t4A._consumerMap.get(consumer)).equal(undefined);
    should.deepEqual([...t4A._consumerMap.keys()], []);
    await consumerOther.subscribe({ topics: [topicA] });
    should.deepEqual([...t4A._consumerMap.keys()], [consumerOther]);
    should(t4A._consumerMap.get(consumerOther)).equal(true);
    await consumer.subscribe({ topics: [topicA] });
    should.deepEqual(
      [...t4A._consumerMap.keys()],
      [consumerOther, consumer],
    );
    should(t4A._consumerMap.get(consumer)).equal(true);
    should(t4A._consumerMap.get(consumerOther)).equal(true);

    // consumer group offsets
    let group3 = JSON.stringify(consumer.group);
    let offsets3 = await admin.fetchOffsets({ groupId });
    dbg &&
      cc.fyi1(msg + 3, groupId, 'offsets3:', JSON.stringify(offsets3));
    should(offsets3.length).equal(1);
    should(offsets3[0]).properties({
      topic: topicA,
      partitions: [{ partition: 0, offset: 0 }],
    });

    await consumer.disconnect();
    should(consumer.connections).equal(0);

    await admin.disconnect();
  });
  it('k3a.send() _readTopics', async () => {
    const msg = 'tk3a.send.1';
    const ka = new Kafka1();
    const dbg = TEST_DBG; // enable implementation internal tests
    dbg && cc.tag1(msg + 0.1, 'BEGIN');
    const producer = ka.producer();
    const groupId1 = 'tS2D.G1';
    const groupId2 = 'tS2D.G2';
    const topicT = 'tS2D.TA';
    const consumerA = ka.consumer({ groupId: groupId1 });
    const consumerB = ka.consumer({ groupId: groupId2 });
    const admin = ka.admin();
    const msgA1 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA1' };
    const msgA2 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA2' };
    const msgA3 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA3' };
    const received = {};
    await producer.connect();
    await consumerA.connect();
    await consumerB.connect();
    await admin.connect();
    let t4a = dbg ? ka._topicOfName(topicT) : undefined;

    // Step1: consumerA subscribes before message is sent
    await consumerA.subscribe({ topics: [topicT], fromBeginning: true });
    dbg && should(t4a._consumerMap.get(consumerA)).equal(true);

    // Step2: send msgA1
    if (dbg) {
      let { _inboxClock: i8kA } = consumerA;
      should(i8kA.timeOut).equal(i8kA.timeIn);
    }
    let send1 = producer.send({ topic: topicT, messages: [msgA1] });
    await send1;
    let i8kA = dbg ? consumerA._inboxClock : undefined;
    if (dbg) {
      !i8kA.running && (await i8kA.start()); // simulate run()
      should(i8kA.timeIn).above(i8kA.timeOut);
      should(Date.now() - i8kA.timeIn)
        .above(-1)
        .below(10);
      cc.fyi(msg + 0.11, 'before next()');
      await i8kA.next();
      cc.fyi(msg + 0.12, 'after next()');
      should(i8kA.timeOut).equal(i8kA.timeIn);
    }
    should.deepEqual(await admin.listTopics(), [topicT]);
    let send2 = producer.send();
    await send2;
    should.deepEqual(await admin.listTopics(), [topicT, 'no-topic']);

    dbg && should(t4a.partitions[0]._messages[0]).properties(msgA1);

    let onEachMessage =
      (rProp) =>
      async (args = {}) => {
        const msg = 'eachMessage';
        let { topic, partition, message, heartbeat, pause } = args;
        received[rProp] = received[rProp] || [];
        received[rProp].push(message);
        dbg > 1 &&
          cc.fyi(msg, JSON.stringify({ topic, partition, message }));
        dbg > 1 &&
          cc.fyi1(
            msg + rProp,
            topic + '.' + partition,
            JSON.stringify(message),
          );
      };

    // STEP3: consumerB subscribes AFTER msgA1 is sent but does not know it
    await consumerB.subscribe({ topics: [topicT], fromBeginning: true });
    let i8kB = dbg ? consumerB._inboxClock : undefined;
    if (dbg) {
      i8kB.running === false && (await i8kB.start()); // simulate run()
    }
    let { committed: committedA1 } = await consumerA._readTopics({
      eachMessage: onEachMessage('TA'),
    });
    should(received?.TA?.length).equal(1);
    should(received.TA[0]).properties(msgA1);
    should(committedA1).equal(1);
    dbg && should(i8kB.timeOut).equal(0); // consumerB is not running

    // STEP4: send msgA2 and consumerB is "aware" of it but not running.
    let res4 = producer.send({ topic: topicT, messages: [msgA2] });
    await res4;
    let { committed: committedA2 } = await consumerA._readTopics({
      eachMessage: onEachMessage('TA'),
    });
    should(received.TA[0]).properties(msgA1);
    should(received.TA.length).equal(2);
    should(received.TA[1]).properties(msgA2);
    should(committedA2).equal(1);
    dbg && should(i8kB.timeIn).above(i8kB.timeOut); // aware but not running
    should(received.TB).equal(undefined);

    // STEP5: consumerB wakes up and processes both messages
    let { committed: committedB1 } = await consumerB._readTopics({
      eachMessage: onEachMessage('TB'),
    });
    should(received.TB[0]).properties(msgA1);
    should(received.TB[1]).properties(msgA2);
    should(committedB1).equal(2);
    // i8kB clock didn't change because there were no new messages
    dbg && should(i8kB.timeIn).above(i8kB.timeOut);

    // STEP6: third message is sent to both conumsers
    let res6 = producer.send({ topic: topicT, messages: [msgA3] });
    await res6;
    let { committed: committedA3 } = await consumerA._readTopics({
      eachMessage: onEachMessage('TA'),
    });
    should(received.TA.length).equal(3);
    should(received.TA[2]).properties(msgA3);
    let { committed: committedB2 } = await consumerB._readTopics({
      eachMessage: onEachMessage('TB'),
    });
    should(received.TB.length).equal(3);
    should(received.TB[2]).properties(msgA3);

    await consumerA.stop(); // release resources
    await consumerA.disconnect();
    await consumerB.disconnect();
    await producer.disconnect();
    await admin.disconnect();

    dbg && cc.tag1(msg + 0.9, 'END');
  });
  it('_Runner', async () => {
    const msg = 'tk3a.r4r';
    const dbg = 2 || TEST_DBG;
    dbg && cc.tag1(msg, 'START');
    const ka = new Kafka1();
    const groupId = 'tR4R.G1';
    const consumer = ka.consumer({ groupId });
    const producer = ka.producer();
    const topic = 'tR4R.TA';
    const msgA1 = { key: 'tr4rMsgKeyA', value: 'tr4rMsgValueA1' };
    const msgA2 = { key: 'tr4rMsgKeyA', value: 'tr4rMsgValueA2' };

    await consumer.connect();
    await producer.connect();

    await producer.send({ topic, messages: [msgA1, msgA2] });
    await consumer.subscribe({ topics: [topic], fromBeginning: true });

    let consumed = [];
    let eachMessage = async ({
      topic,
      partition,
      message,
      heartbeat,
      pause,
    }) => {
      consumed.push(message);
      dbg && cc.tag(msg, 'eachMessage', message);
    };
    let msSleep = 1; // throttle for testing (default is 0)
    let r4r = new _Runner({ eachMessage, consumer, msSleep });
    should(r4r).properties({ running: false, eachMessage, msSleep });
    dbg > 1 && cc.tag(msg, 'r4r.start');
    /* await */ r4r.start(); // do not await!
    dbg > 1 && cc.tag(msg, 'sleep...');
    await new Promise((res) => setTimeout(() => res(), msSleep * 3));
    dbg > 1 && cc.tag(msg, '...sleep');
    should(r4r).properties({ running: true, eachMessage });
    await r4r.stop(); // release resources
    should(r4r).properties({ running: false, eachMessage });
    should(consumed.length).equal(2);
    should.deepEqual(consumed, [msgA1, msgA2]);

    consumer.disconnect();
    producer.disconnect();
    dbg && cc.tag1(msg, 'END');
  }); // tk3a.rfr
  it('TESTTESTrun', async () => {
    const msg = 'tc6r_run';
    const dbg = 2 || TEST_DBG;
    const ka = new Kafka1();
    const groupId = `${msg}.G1`;
    const topic = `${msg}.TA`;
    const key = `${msg}.KA`;
    const msgA1 = { key, value: `${msg}.V1` };
    const msgA2 = { key, value: `${msg}.V2` };
    const msgA3 = { key, value: `${msg}.V3` };
    dbg && cc.tag1(msg, 'START');
    let consumed = []; // save each message consumed for testing
    let eachMessage = async (cfg = {}) => {
      let { topic, partition, message, heartbeat, pause } = cfg;
      consumed.push(message);
      dbg > 1 && cc.tag(msg, 'eachMessage', message);
    };

    // STEP1: send first two messages BEFORE consumer is created
    const producer = ka.producer();
    await producer.connect();
    await producer.send({ topic, messages: [msgA1, msgA2] });

    // STEP2: create and run consumer to receive messages
    let _msIdle = 100;
    const consumer = ka.consumer({ groupId, _msIdle });
    await consumer.connect();
    await consumer.subscribe({ topics: [topic], fromBeginning: true });
    let _msSleep = 1;
    await consumer.run({ eachMessage, _msSleep });
    should(consumer).properties({ running: true });
    await new Promise((res) => setTimeout(() => res(), _msSleep * 3));
    should(consumed.length).equal(2);
    should.deepEqual(consumed, [msgA1, msgA2]);

    // STEP3: send more messages
    await producer.send({ topic, messages: [msgA3] });
    await new Promise((res) => setTimeout(() => res(), _msSleep * 3));
    should(consumed.length).equal(3);
    should.deepEqual(consumed, [msgA1, msgA2, msgA3]);

    // STEP4: shutdown kafka
    await consumer.stop(); // release resources
    should(consumer).properties({ running: false });
    consumer.disconnect();
    producer.disconnect();
    dbg && cc.tag1(msg, 'END');
  });
});
