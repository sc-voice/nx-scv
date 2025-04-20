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
  });
  it('k3a.send()', async () => {
    let ka = new Kafka();
    let producer = ka.producer();
    should(producer).instanceOf(Producer);
    await producer.connect();
    let consumer = ka.consumer();
    should(consumer).instanceOf(Consumer);
    await consumer.connect();
    let admin = ka.admin();
    should(admin).instanceOf(Admin);
    await admin.connect();

    should.deepEqual(await admin.listTopics(), []);
    let request = {
      topic: 'test-topic',
    }
    await producer.send(request);
    should.deepEqual(await admin.listTopics(), ['test-topic']);
    await producer.send();
    should.deepEqual(await admin.listTopics(), ['test-topic', 'no-topic']);

    await consumer.disconnect();
    should(consumer.connections).equal(0);
    await producer.disconnect();
    should(producer.connections).equal(0);
    await admin.disconnect();
    should(admin.connections).equal(0);
  });
});
