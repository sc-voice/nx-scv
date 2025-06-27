import should from 'should';
import { NameForma } from '../../index.mjs';
const { Clock } = NameForma;
import { Text } from '../../index.mjs';
const { ColorConsole } = Text;
const { cc } = ColorConsole;

describe('clock', () => {
  const msg = 'tclock';
  it('ctor', async () => {
    const msg = 'tc3k.ctor';
    const dbg = 0;
    dbg && cc.tag(msg, 'START');

    const clock = new Clock();
    should(clock).properties({ running: false });
    should(clock.id).match(/C3K[-0-9a-z]+/);

    // Clocks are distinguishable
    const clock2 = new Clock();
    should(clock2.id).not.equal(clock.id);

    // A stopped clock does not change
    let res1 = await clock.next();
    should.deepEqual(res1, { done: false, value: 0 });
    let res2 = await clock.next();
    should.deepEqual(res2, res1);

    dbg && cc.tag(msg, 'END');
  });
  it('referenceTime default', async () => {
    const msg = 'tc3k.referenceTime-default';
    const dbg = 0;
    dbg && cc.tag1(msg, 'START');
    const clock = new Clock({});
    const msTolerance = 5;

    let now = Date.now();
    should(clock).properties({ running: false });

    dbg && cc.tag(msg, 'started clocks know the current time');
    let resStart = await clock.start();
    should(Math.abs(now - clock.now())).below(msTolerance);
    should(clock).properties({ running: true });
    should(resStart).equal(clock);

    dbg && cc.tag(msg, 'started clocks return the start reference time');
    await new Promise((res) => setTimeout(() => res(), 10));
    dbg > 1 && cc.tag(msg, 'next...');
    let { value: value1 } = await clock.next();
    dbg && cc.tag(msg, '...next', { value1 });
    should(Math.abs(now - value1)).below(msTolerance);

    dbg && cc.tag(msg, 'clocks with consumers sync up with referenceTime');
    await new Promise((res) => setTimeout(() => res(), 10));
    let { value: value2 } = await clock.next();
    dbg && cc.tag(msg, '...next', { value2 });
    should(value2).above(value1);
    should(Math.abs(Date.now() - value2)).below(msTolerance);

    await clock.stop();
    dbg && cc.tag1(msg, 'END');
  });
  it('referenceTime-custom', async () => {
    const msg = 'tc3k.referenceTime-custom';
    const dbg = 0;

    dbg && cc.tag(msg, 'START');
    let refNow = 0;
    let referenceTime = () => refNow;
    const clock = new Clock({ referenceTime });
    should(refNow).equal(0);

    await clock.start();
    should(clock.timeIn).equal(0);
    should(clock.timeOut).equal(0);

    // manually update timestamp (single value)
    clock.update(1);
    should(clock.timeIn).equal(1);
    let res1 = await clock.next();
    should(res1).properties({ done: false, value: 1 });

    // manually update timestamp (multiple values)
    let res2 = clock.next();
    clock.update(2);
    clock.update(3);
    res2 = await res2;
    should(clock.timeIn).equal(3);
    should(res2).properties({ done: false, value: 3 });

    // ignore stale updates
    clock.update(2);
    should(clock.timeIn).equal(3);
    should(res2).properties({ done: false, value: 3 });

    await clock.stop();
    should.deepEqual(await clock.next(), { done: true, value: 3 });
    dbg && cc.tag(msg, 'END');
  });
  it('idle', async () => {
    let msg = 'tc3k.idle';
    let dbg = 0;
    let msIdle = 50;
    let nIdle = 0;
    let idle = async () => {
      nIdle++;
      return new Promise((r5e) => setTimeout(() => r5e(), msIdle));
    };
    let tolerance = 10;
    let msStart = Date.now();
    dbg && cc.tag1(msg, 'START');
    let c3k = new Clock();

    // started clocks are not idle and offer the start time
    await c3k.start({ idle });
    should(c3k.timeIn).not.equal(c3k.timeOut);
    let { value: value1 } = await c3k.next();
    should(value1).equal(c3k.timeIn);
    should(Math.abs(msStart - value1)).below(tolerance);
    dbg &&
      cc.tag(msg, 'Clocks are idle after the external update is consumed');
    should(c3k.timeIn).equal(c3k.timeOut);
    should(nIdle).equal(0);

    dbg && cc.tag(msg, 'idle clocks with listeners are updated', value1);
    let { value: value2 } = await c3k.next();
    should(c3k.timeIn).equal(c3k.timeOut);
    should(nIdle).equal(1);
    should(Date.now() - msStart).above(msIdle);
    should(value2 - value1).above(msIdle);
    should(Math.abs(value2 - msStart - msIdle)).below(tolerance);

    dbg && cc.tag(msg, 'clocks without consumers are NOT updated', value2);
    // IMPORTANT:
    // Idle clocks BLOCK after yielding a value that awaits a consumer.
    // Even that the yielded value becomes stale, future consumers will catch up.
    let msLongIdle = 2 * msIdle;
    await new Promise((r) => setTimeout(() => r(), msLongIdle));
    should(c3k.timeIn).equal(value2); // stale value
    should(nIdle).equal(1);
    let { value: value3 } = await c3k.next();
    should(c3k.timeIn).equal(c3k.timeOut);
    should(value2 - value1)
      .above(msIdle)
      .below(msLongIdle); // stale value

    dbg && cc.tag(msg, 'clocks offer external updates immediately');
    await new Promise((r) => setTimeout(() => r(), 10));
    let msExternal = Date.now();
    should(msExternal).above(value3);
    c3k.update(msExternal);
    should(c3k.timeIn).equal(msExternal);
    should(nIdle).equal(2);
    let { value: value4 } = await c3k.next();
    should(c3k.timeOut).equal(msExternal);
    should(nIdle).equal(2);
    should(value4).equal(msExternal);

    await c3k.stop();
    let elapsed = Date.now() - msStart;
    dbg && cc.tag1(msg, 'END', elapsed);
  });
});
