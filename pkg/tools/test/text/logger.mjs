import { describe, it, expect } from 'vitest';
import { Text } from '../../index.mjs';
const { LogEntry, Logger } = Text;
let sinkOut;
const TEST_SINK = {
  debug: (...args) => {
    sinkOut = args;
  },
  log: (...args) => {
    sinkOut = args;
  },
  info: (...args) => {
    sinkOut = args;
  },
  warn: (...args) => {
    sinkOut = args;
  },
  error: (...args) => {
    sinkOut = args;
  },
};
const ABC = { a: 1, b: 'red', c: [1, 2, 3] };
const ABC_EXPECTED = /ok.*c:\[1,2,3\]/;

describe('logger', () => {
  it('default ctor', () => {
    let msg = 'tl4r.ctor:';
    let now = Date.now();
    let logger = new Logger();
    expect(logger.sink).toBe(console);
    expect(logger.logLevel).toBe(Logger.LEVEL_WARN);
    expect(logger.history).toEqual([]);
    expect(logger.msBase).toBeGreaterThan(now - 1);
    expect(logger.msBase).toBeLessThan(now + 10);
  });
  it('custom ctor', () => {
    let msg = 'tl4r.custom-ctor:';
    let msPast = 12345; // simulate at old logger
    let msBase = Date.now() - msPast; // timestamp basis in milliseconds
    let sink = TEST_SINK;
    let logLevel = Logger.LEVEL_DEBUG;
    let logger = new Logger({ sink, msBase, logLevel });
    expect(logger.sink).toBe(sink);
    expect(logger.logLevel).toBe(logLevel);
    expect(logger.history).toEqual([]);
    let entry = logger.info(msg, 'ok', ABC);
    expect(entry).toBeInstanceOf(LogEntry);
    expect(entry.level).toBe(Logger.LEVEL_INFO);
    expect(entry.text).toMatch(ABC_EXPECTED);
    expect(entry.ms).toBeGreaterThan(msPast - 1);
    expect(entry.ms).toBeLessThan(msPast + 10);
    expect(logger.history.at(-1)).toBe(entry);
  });
  it('debug', () => {
    let msg = 'tl4r.debug:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.debug(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_DEBUG);
    expect(entry.text).toMatch(ABC_EXPECTED);
  });
  it('log', () => {
    const msg = 'tl4r.log:';
    const dbg = 0;

    let logger = new Logger({ sink: TEST_SINK });

    // Default suppresses LEVEL_DEBUG, LEVEL_INFO
    expect(sinkOut[0]).not.toBe(msg);
    let entry = logger.log(msg, 'ok', ABC);
    expect(sinkOut[0]).not.toBe(msg);

    // Allow all messages
    logger.logLevel = Logger.LEVEL_DEBUG;
    entry = logger.debug(msg, 'debug', ABC);
    expect(sinkOut[0]).toBe(msg);
    expect(sinkOut[1]).toBe('debug');
    entry = logger.info(msg, 'ok', ABC);
    expect(sinkOut[0]).toBe(msg);
    expect(sinkOut[1]).toBe('ok');

    dbg && console.log(msg, { sinkOut });
    expect(entry.level).toBe(Logger.LEVEL_INFO);
    expect(entry.text).toMatch(ABC_EXPECTED);
  });
  it('warn', () => {
    let msg = 'tl4r.warn:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.warn(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_WARN);
    expect(entry.text).toMatch(ABC_EXPECTED);
  });
  it('error', () => {
    let msg = 'tl4r.error:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.error(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_ERROR);
    expect(entry.text).toMatch(ABC_EXPECTED);
  });
  it('no-sink', () => {
    let msg = 'tl4r.no-sink:';
    let logger = new Logger({ sink: null });
    let entry = logger.debug(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_DEBUG);

    entry = logger.info(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_INFO);
    entry = logger.log(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_INFO);
    entry = logger.warn(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_WARN);
    entry = logger.error(msg, 'ok', ABC);
    expect(entry.level).toBe(Logger.LEVEL_ERROR);
  });
});
