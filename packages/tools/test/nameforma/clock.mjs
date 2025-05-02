import util from 'node:util';
import should from 'should';
import { NameForma } from '../../index.mjs';
const { Clock, _Runner, Kafka1, Producer, Consumer, Admin } = NameForma;
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

describe('clock', function () {
  this.timeout(4 * heartbeatInterval);
  it('ctor', async () => {
    const msg = 'ctor';
    const dbg = 1;
    let msIdle = heartbeatInterval / 2;
    let timestamp = Date.now();
    let stop = false;

    const clock = Clock.create({ msIdle });
    should(clock.timeIn).equal(0);
    should(clock.timeOut).equal(0);

    clock.update(1);
    should(clock.timeIn).equal(1);
    let res1 = await clock.next();
    should(res1).properties({ done: false, value: 1 });

    let res2 = clock.next();
    clock.update(2);
    clock.update(3);
    should(clock.timeIn).equal(3);
    res2 = await res2;
    should(res2).properties({ done: false, value: 3 });

    await clock.stop();
    should.deepEqual(await clock.next(), { done: true });
  });
});
