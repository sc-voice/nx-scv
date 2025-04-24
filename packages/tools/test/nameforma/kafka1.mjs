import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { Kafka1, Producer, Consumer, Admin } = NameForma;
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

describe('TESTTESTkafka', () => {
  it('k3a.ctor', async () => {
    let ka = new Kafka1();
    should(ka).properties({
      clientId: 'no-client-id',
    });

    let clientId = 'test-client-id';
    let kaTest = new Kafka1({clientId});
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
  it('k3a.listGroups()', async() =>{
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupG1 = 'groupG1';
    let groups1 = await admin.listGroups();
    should.deepEqual(groups1, []);
    let topicA = 'topicA';
    let consumerG1 = ka.consumer({groupId:groupG1});
    await await consumerG1.connect();
    let groups2 = await admin.listGroups();
    should.deepEqual(groups2, [{
      groupId: groupG1,
      protocolType: 'consumer',
    }]);

    await admin.disconnect();
    await consumerG1.disconnect();
  });
  it('k3a.describeGroups()', async() =>{
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupG1 = 'groupG1';
    let groups1 = await admin.describeGroups();
    should.deepEqual(groups1, []);
    let topicA = 'topicA';
    let consumerG1 = ka.consumer({groupId:groupG1});
    await await consumerG1.connect();
    let groups2 = await admin.describeGroups();
    should.deepEqual(groups2, [{
      errorCode: 0,
      groupId: groupG1,
      protocolType: 'consumer',
      state: 'stable',
    }]);

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
    const dbg = 1;
    let ka = new Kafka1();
    let admin = ka.admin();
    await admin.connect();
    let groupId = 'c6rGroup';
    let topicA = 'c6rTopicA';

    let offsets1 = await admin.fetchOffsets({groupId});
    should(offsets1.length).equal(0);
    dbg>1 && cc.fyi1(msg+1, groupId, 'offsets1:', JSON.stringify(offsets1));

    let consumer = ka.consumer({groupId});
    should(consumer).instanceOf(Consumer);
    should(consumer).properties({ groupId });
    let offsets2 = await admin.fetchOffsets({groupId});
    should(offsets2.length).equal(0);

    await consumer.connect();
    should(consumer.connections).equal(1);

    dbg>1 && cc.fyi1(msg+2, groupId, 'offsets2:', JSON.stringify(offsets2));
    await consumer.subscribe({topics:[topicA]});

    // consumer group offsets
    let group3 = JSON.stringify(consumer.group);
    let offsets3 = await admin.fetchOffsets({groupId});
    dbg && cc.fyi1(msg+3, groupId, 'offsets3:', JSON.stringify(offsets3));
    should(offsets3.length).equal(1);
    should(offsets3[0]).properties({
      topic: topicA,
      partitions: [ {partition: 0, offset:0} ],
    });

    await consumer.disconnect();
    should(consumer.connections).equal(0);

    await admin.disconnect();
  });
  it('TESTTESTk3a.send()', async () => {
    const msg = 'k3a.send';
    const ka = new Kafka1();
    const dbg = 0;
    const producer = ka.producer();
    const groupId = 'k8dGroup1';
    const topicA = 'k8dTopicA';
    const topicB = 'k8dTopicB';
    const consumerA = ka.consumer({groupId});
    const consumerB = ka.consumer({groupId});
    const admin = ka.admin();
    const msgA1 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA1' };
    const msgA2 = { key: 'k8dMsgKeyA', value: 'k8dMsgValueA2' };
    const msgB1 =  { key: 'k8dMsgKeyB', value: 'k8dMsgValueB1' };
    const receivedA = [];
    const receivedB = [];
    await producer.connect();
    await consumerA.connect();
    await consumerB.connect();
    await admin.connect();

    // Step1: send msgA1
    await producer.send({topic: topicA, messages: [msgA1]});
    should.deepEqual(await admin.listTopics(), [topicA]);
    await producer.send();
    should.deepEqual(await admin.listTopics(), [topicA, 'no-topic']);

    // NON_API_TEST: implementation only test!
    if (dbg) {
      let _privateTopicA = ka._topicOfName(topicA);
      should(_privateTopicA.partitions[0]._messages[0]).properties(msgA1);
    }

    let onEachMessage = (received) => (async (args={})=>{
      const msg = 'eachMessage';
      let {
        topic, partition, message, heartbeat, pause,
      } = args;
      receivedA.push(message);
      cc.fyi(msg, {topic, partition, message});
    });

    // STEP2: consumerA subscribes AFTER msgA1 is sent but still gets it
    await consumerA.subscribe({topics: [topicA], fromBeginning: true});
    consumerA.run({ eachMessage: onEachMessage(receivedA) });
    should(receivedA[0]).properties(msgA1);
    should(receivedA.length).equal(1);

    // STEP3: send msgA2
    await producer.send({topic: topicA, messages: [msgA2]});
    should(receivedA[0]).properties(msgA1);
    //should(receivedA[1]).properties(msgA2);
    //should(receivedA.length).equal(2);

    await consumerA.stop();
    await consumerA.disconnect();
    await consumerB.disconnect();
    await producer.disconnect();
    await admin.disconnect();
  });
});
