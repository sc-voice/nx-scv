import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { 
  Timers,
  Kafka1, 
  Admin,
  Producer,
  Consumer,
} = NameForma;
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

describe('TESTTESTtimers', function () {
  it('ctor', ()=>{
    let t4s = new Timers({kafka});
    should(t4s).properties({
      groupId: 'g5d.timers',
      topic: 't3c.timers',
      timerMap: {},
    });
    should(t4s).properties([
      'groupId', 'topic', 'timerMap'
    ]);
    should(t4s.consumer).instanceOf(Consumer);
    should(t4s.producer).instanceOf(Producer);
  });
  it('list', async()=>{
    const msg = 'tt4s.list';
    const dbg = 1;
    const topic = 'tt4s.list';
    let t4s = new Timers({kafka, topic});
    dbg && cc.fyi(msg+1.1, 'start');
    t4s.start();
    dbg && cc.fyi(msg+1.2, 'list');
    let producer = kafka.producer();
    let msgList = { action: 'list', }
    await producer.send({topic, messages:[msgList]});
  });
});
