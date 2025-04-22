import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { Kafka, Producer, Consumer, Admin } = NameForma;
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
    let ka = new Kafka();
    should(ka).properties({
      clientId: 'no-client-id',
    });

    let clientId = 'test-client-id';
    let kaTest = new Kafka({clientId});
    should(kaTest).properties({
      clientId,
    });
  });
  it('k3a.admin()', async () => {
    let ka = new Kafka();
    let admin = ka.admin();
    should(admin).instanceOf(Admin);
    should.deepEqual(await admin.listTopics(), []);

    await admin.connect();
    should(admin.connections).equal(1);

    await admin.disconnect();
    should(admin.connections).equal(0);
  });
  it('k3a.producer()', async () => {
    let ka = new Kafka();
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
    let ka = new Kafka();
    let admin = await ka.admin().connect();
    let groupId = 'testGroupId';
    let topicA = 'testTopicA';

    let offsets1 = await admin.fetchOffsets({groupId});
    should(offsets1.length).equal(0);
    dbg>1 && cc.fyi1(msg+1, 'offsets:', JSON.stringify(offsets1));

    let consumer = ka.consumer({groupId});
    should(consumer).instanceOf(Consumer);
    should(consumer).properties({ groupId });
    let offsets2 = await admin.fetchOffsets({groupId});
    should(offsets2.length).equal(0);

    let resConnect = await consumer.connect();
    should(consumer.connections).equal(1);
    should(resConnect).equal(consumer);

    dbg>1 && cc.fyi1(msg+2, 'offsets:', JSON.stringify(offsets2));
    let resSubscribe = await consumer.subscribe({topics:[topicA]});
    should(resSubscribe).equal(consumer);

    // consumer group offsets
    let group3 = JSON.stringify(consumer.group);
    dbg && cc.fyi1(msg+3, 'consumer.group:', group3);
    let offsets3 = await admin.fetchOffsets({groupId});
    should(offsets3.length).equal(1);
    should.deepEqual(offsets3[0], {
      topic: topicA,
      partitions: [ {partition: 0, offset:0} ],
    });

    await consumer.disconnect();
    should(consumer.connections).equal(0);

    await admin.disconnect();
  });
  it('k3a.send()', async () => {
    let ka = new Kafka();
    let producer = ka.producer();
    let groupId = 'testConsumerGroup';
    let topicA = 'testTopicA';
    await producer.connect();
    let consumer = ka.consumer({groupId});
    await consumer.connect();
    let admin = ka.admin();
    await admin.connect();

    let request = {
      topic: topicA,
      messages: [{
        key: 'test-key',
        value: 'test-value',
      }],
    }
    await producer.send(request);
    should.deepEqual(await admin.listTopics(), [topicA]);
    await producer.send();
    should.deepEqual(await admin.listTopics(), [topicA, 'no-topic']);

    consumer.subscribe({topics: [topicA]});
    await consumer.run({
      eachMessage: async (args={})=>{
        const msg = 'eachMessage';
        let {
          topic, partition, message, heartbeat, pause,
        } = args;
        cc.fyi(msg, {topic, partition, message});
      },
    });

    await consumer.disconnect();
    await producer.disconnect();
    await admin.disconnect();
  });
});
