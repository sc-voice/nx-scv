import should from 'should';
import { NameForma } from '../../index.mjs';
const { Clock } = NameForma;
import { Text } from '../../index.mjs';
const { ColorConsole } = Text;
const { cc } = ColorConsole;

describe('TESTTESTclock', () => {
  const msg = 'tclock';
  it('ctor', async () => {
    const msg = 'tc3k.ctor';
    const dbg = 1;
    dbg && cc.tag(msg, "START");
    let period = 1000;
    let msIdle = 100;

    const clock = new Clock();
    should(Date.now() - clock.created)
      .above(-1)
      .below(5);
    should(clock).properties({ period, msIdle });
    await clock.stop();
    dbg && cc.tag(msg, "END");
  });
  it('custom ctor', async () => {
    const msg = 'tcustom_ctor';
    const dbg = 1;

    dbg && cc.tag(msg, "START");
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
    should(Date.now()-res3.value).above(-1).below(period);

    await clock.stop();
    should.deepEqual(await clock.next(), { done: true });
    dbg && cc.tag(msg, "END");
  });
});
