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
    const dbg = 1;
    dbg && cc.tag(msg, 'START');

    const clock = new Clock();
    should(clock).properties({ period: 1000, running: false });
    should(clock.id).match(/C3K[0-9]+/);

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
  it('TESTTESTperiod', async() => {
    const msg = 'tc3k.period';
    const dbg = 0;
    dbg && cc.tag1(msg, 'START');
    const period = 50;
    const clock = new Clock({period});
    const msTolerance = 5;

    let now = Date.now();
    should(clock).properties({ period, running: false });

    // started clocks know the current time
    let resStart = await clock.start();
    should(Math.abs(now - clock.now())).below(msTolerance);
    should(clock).properties({ period, running: true });
    should(resStart).equal(clock);

    // by default, started clocks return the current time
    await new Promise(res=>setTimeout(()=>res(), 10));
    dbg > 1 && cc.tag(msg, 'next...');
    let res1 = await clock.next();
    dbg > 1 && cc.tag(msg, '...next', 'res1:', res1);
    should(res1.done).equal(false);
    should(Math.abs(now - res1.value)).below(msTolerance);
    await new Promise(res=>setTimeout(()=>res(), 10));

    dbg && cc.tag(msg, 'next...');
    let res2 = await clock.next();
    dbg && cc.tag(msg, '...next', 'res2:', res2);
    should(Math.abs(now - res2.value)).below(msTolerance);

    dbg && cc.tag1(msg, 'END');
  });
  it('create', async () => {
    const msg = 'tc3k.create';
    const dbg = 1;
    dbg && cc.tag(msg, 'START');
    let period = 1000;
    let msIdle = 100;
    let running = false;

    const clock = new Clock();
    should(clock).properties({
      period,
      msIdle,
    });

    should(Date.now() - clock.created)
      .above(-1)
      .below(5);
    await clock.stop();
    dbg && cc.tag(msg, 'END');
  });
  it('custom ctor', async () => {
    const msg = 'tcustom_ctor';
    const dbg = 1;

    dbg && cc.tag(msg, 'START');
    let period = 10;
    let msIdle = 1;
    const clock = new Clock({ period, msIdle });
    should(clock).properties({ period, msIdle });

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

    // ignore state updates
    clock.update(2);
    should(clock.timeIn).equal(3);

    // automatically update timestamp (every period)
    await new Promise((res) => setTimeout(() => res(), 5 * period));
    let res3 = await clock.next();
    should(Date.now() - res3.value)
      .above(-1)
      .below(period);

    await clock.stop();
    should.deepEqual(await clock.next(), { done: true });
    dbg && cc.tag(msg, 'END');
  });
});
