import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { 
  _MessageClock, _Runner, Kafka1, Producer, Consumer, Admin 
} = NameForma;
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
const heartbeatInterval = PRODUCTION ? 3000 : 50; 

describe('kafka', function () {
  this.timeout(4*heartbeatInterval);
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
    const dbg = 0;
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupId = 'tC6R.G1';
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
    await consumer.subscribe({ topics: [topicA] });

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
  it('k3a.send() _processConsumer', async () => {
    const msg = 'tk3a.send.1';
    const ka = new Kafka1();
    const dbg = 1;
    dbg && cc.tag1(msg + 0.1, 'BEGIN');
    const producer = ka.producer();
    const groupId1 = 'tS2D.G1';
    const groupId2 = 'tS2D.G2';
    const topicA = 'tS2D.TA';
    const topicB = 'tS2D.TB';
    const consumerA = ka.consumer({ groupId: groupId1 });
    const consumerB = ka.consumer({ groupId: groupId2 });
    const admin = ka.admin();
    const msgA1 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA1' };
    const msgA2 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA2' };
    const msgB1 = { key: 'k8dMsgKeyB', value: 'k8dMsgValueB1' };
    const received = {};
    await producer.connect();
    await consumerA.connect();
    await consumerB.connect();
    await admin.connect();

    // Step1: send msgA1
    await producer.send({ topic: topicA, messages: [msgA1] });
    should.deepEqual(await admin.listTopics(), [topicA]);
    await producer.send();
    should.deepEqual(await admin.listTopics(), [topicA, 'no-topic']);

    // NON_API_TEST: implementation only test!
    if (dbg) {
      let _privateTopicA = ka._topicOfName(topicA);
      should(_privateTopicA.partitions[0]._messages[0]).properties(msgA1);
    }

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

    // STEP2: consumerA subscribes AFTER msgA1 is sent but still gets it
    await consumerA.subscribe({ topics: [topicA], fromBeginning: true });
    let { committed: committed1 } = await consumerA._processConsumer({
      eachMessage: onEachMessage('A'),
    });
    should(received.A[0]).properties(msgA1);
    should(received.A.length).equal(1);
    should(committed1).equal(1);

    // STEP3: send msgA2
    await producer.send({ topic: topicA, messages: [msgA2] });
    let { committed: committed2 } = await consumerA._processConsumer({
      eachMessage: onEachMessage('A'),
    });
    should(received.A[0]).properties(msgA1);
    should(received.A.length).equal(2);
    should(received.A[1]).properties(msgA2);
    should(committed2).equal(1);

    await consumerA.stop();
    await consumerA.disconnect();
    await consumerB.disconnect();
    await producer.disconnect();
    await admin.disconnect();

    dbg && cc.tag1(msg + 0.9, 'END');
  });
  it('_Runner', async () => {
    const msg = 'tk3a.r4r';
    const dbg = 1;
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
    /* await */ r4r.start(); // do not await!
    await new Promise((res) => setTimeout(() => res(), msSleep * 3));
    should(r4r).properties({ running: true, eachMessage });
    await r4r.stop();
    should(r4r).properties({ running: false, eachMessage });
    should(r4r.iterations).above(1).below(4);
    should(consumed.length).equal(2);
    should.deepEqual(consumed, [msgA1, msgA2]);

    consumer.disconnect();
    producer.disconnect();
  });
  it('run', async () => {
    const msg = 'tk3a.run';
    const dbg = 0;
    const ka = new Kafka1();
    const groupId = 'trun.G1';
    const producer = ka.producer();
    const topic = 'tR4R.TA';
    const msgA1 = { key: 'tr4rMsgKeyA', value: 'tr4rMsgValueA1' };
    const msgA2 = { key: 'tr4rMsgKeyA', value: 'tr4rMsgValueA2' };
    const msgA3 = { key: 'tr4rMsgKeyA', value: 'tr4rMsgValueA3' };

    await producer.connect();

    // STEP1: send first two messages before consumer is created
    await producer.send({ topic, messages: [msgA1, msgA2] });

    // STEP2: create and run consumer to receive messages
    const consumer = ka.consumer({ groupId });
    await consumer.connect();
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
    let _msSleep = 1;
    consumer.run({ eachMessage, _msSleep });
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
    await consumer.stop();
    should(consumer).properties({ running: false });
    consumer.disconnect();
    producer.disconnect();
  });
  it('TESTTESTmessageClock', async () => {
    const msg = 'tMessageClock';
    const dbg = 1;
    let msIdle = heartbeatInterval / 2;
    let timestamp = Date.now();
    let stop = false;

    const clock = _MessageClock.create({msIdle});
    should(clock.timeIn).equal(0);
    should(clock.timeOut).equal(0);

    clock.update(1);
    should(clock.timeIn).equal(1);
    let res1 = await clock.next();
    should(res1).properties({done: false, value:1});

    let res2 = clock.next();
    clock.update(2);
    clock.update(3);
    should(clock.timeIn).equal(3);
    res2 = await(res2);
    should(res2).properties({done: false, value:3});
  });
});
