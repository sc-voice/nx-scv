import { describe, it, expect } from '@sc-voice/vitest';
import { Text } from '@sc-voice/tools';
import { NameForma } from '../index.mjs';
import { DBG } from '../src/defines.mjs';

const { CLOCK: C3K } = DBG;
const { Clock } = NameForma;
const { ColorConsole } = Text;
const { cc } = ColorConsole;
const dbg = C3K.TEST;

describe('clock', () => {
  const msg = 'tclock';
  it('ctor', async () => {
    const msg = 'tc3k.ctor';
    dbg && cc.tag(msg, 'START');

    const clock = new Clock();
    expect(clock).toMatchObject({ running: false });
    expect(clock.id).toMatch(/[-0-9a-z]+/);

    // Clocks are distinguishable
    const clock2 = new Clock();
    expect(clock2.id).not.toBe(clock.id);

    // A stopped clock does not change
    let res1 = await clock.next();
    expect(res1).toEqual({ done: false, value: 0 });
    let res2 = await clock.next();
    expect(res2).toEqual(res1);

    dbg && cc.tag(msg, 'END');
  });
  it('referenceTime default', async () => {
    const msg = 'tc3k.referenceTime-default';
    dbg && cc.tag1(msg, 'START');
    const clock = new Clock({});
    const msTolerance = 5;

    let now = Date.now();
    expect(clock).toMatchObject({ running: false });

    dbg && cc.tag(msg, 'started clocks know the current time');
    let resStart = await clock.start();
    expect(Math.abs(now - clock.now())).toBeLessThan(msTolerance);
    expect(clock).toMatchObject({ running: true });
    expect(resStart).toBe(clock);

    dbg && cc.tag(msg, 'started clocks return the start reference time');
    await new Promise((res) => setTimeout(() => res(), 10));
    dbg > 1 && cc.tag(msg, 'next...');
    let { value: value1 } = await clock.next();
    dbg && cc.tag(msg, '...next', { value1 });
    expect(Math.abs(now - value1)).toBeLessThan(msTolerance);

    dbg && cc.tag(msg, 'clocks with consumers sync up with referenceTime');
    await new Promise((res) => setTimeout(() => res(), 10));
    let { value: value2 } = await clock.next();
    dbg && cc.tag(msg, '...next', { value2 });
    expect(value2).toBeGreaterThan(value1);
    expect(Math.abs(Date.now() - value2)).toBeLessThan(msTolerance);

    await clock.stop();
    dbg && cc.tag1(msg, 'END');
  });
  it('referenceTime-custom', async () => {
    const msg = 'tc3k.referenceTime-custom';

    dbg && cc.tag(msg, 'START');
    let refNow = 0;
    let referenceTime = () => refNow;
    const clock = new Clock({ referenceTime });
    expect(refNow).toBe(0);

    await clock.start();
    expect(clock.timeIn).toBe(0);
    expect(clock.timeOut).toBe(0);

    // manually update timestamp (single value)
    clock.update(1);
    expect(clock.timeIn).toBe(1);
    let res1 = await clock.next();
    expect(res1).toMatchObject({ done: false, value: 1 });

    // manually update timestamp (multiple values)
    let res2 = clock.next();
    clock.update(2);
    clock.update(3);
    res2 = await res2;
    expect(clock.timeIn).toBe(3);
    expect(res2).toMatchObject({ done: false, value: 3 });

    // ignore stale updates
    clock.update(2);
    expect(clock.timeIn).toBe(3);
    expect(res2).toMatchObject({ done: false, value: 3 });

    await clock.stop();
    expect(await clock.next()).toEqual({ done: true, value: 3 });
    dbg && cc.tag(msg, 'END');
  });
  it('idle', async () => {
    let msg = 'tc3k.idle';
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
    expect(c3k.timeIn).not.toBe(c3k.timeOut);
    let { value: value1 } = await c3k.next();
    expect(value1).toBe(c3k.timeIn);
    expect(Math.abs(msStart - value1)).toBeLessThan(tolerance);
    dbg &&
      cc.tag(msg, 'Clocks are idle after the external update is consumed');
    expect(c3k.timeIn).toBe(c3k.timeOut);
    expect(nIdle).toBe(0);

    dbg && cc.tag(msg, 'idle clocks with listeners are updated', value1);
    let { value: value2 } = await c3k.next();
    expect(c3k.timeIn).toBe(c3k.timeOut);
    expect(nIdle).toBe(1);
    expect(Date.now() - msStart).toBeGreaterThan(msIdle);
    expect(value2 - value1).toBeGreaterThan(msIdle);
    expect(Math.abs(value2 - msStart - msIdle)).toBeLessThan(tolerance);

    dbg && cc.tag(msg, 'clocks without consumers are NOT updated', value2);
    // IMPORTANT:
    // Idle clocks BLOCK after yielding a value that awaits a consumer.
    // Even that the yielded value becomes stale, future consumers will catch up.
    let msLongIdle = 2 * msIdle;
    await new Promise((r) => setTimeout(() => r(), msLongIdle));
    expect(c3k.timeIn).toBe(value2); // stale value
    expect(nIdle).toBe(1);
    let { value: value3 } = await c3k.next();
    expect(c3k.timeIn).toBe(c3k.timeOut);
    expect(value2 - value1)
      .toBeGreaterThan(msIdle);
    expect(value2 - value1)
      .toBeLessThan(msLongIdle); // stale value

    dbg && cc.tag(msg, 'clocks offer external updates immediately');
    await new Promise((r) => setTimeout(() => r(), 10));
    let msExternal = Date.now();
    expect(msExternal).toBeGreaterThan(value3);
    c3k.update(msExternal);
    expect(c3k.timeIn).toBe(msExternal);
    expect(nIdle).toBe(2);
    let { value: value4 } = await c3k.next();
    expect(c3k.timeOut).toBe(msExternal);
    expect(nIdle).toBe(2);
    expect(value4).toBe(msExternal);

    await c3k.stop();
    let elapsed = Date.now() - msStart;
    dbg && cc.tag1(msg, 'END', elapsed);
  });
});
