import should from 'should';
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
    should(logger.sink).equal(console);
    should(logger.logLevel).equal(Logger.LEVEL_WARN);
    should.deepEqual(logger.history, []);
    should(logger.msBase)
      .above(now - 1)
      .below(now + 10);
  });
  it('custom ctor', () => {
    let msg = 'tl4r.custom-ctor:';
    let msPast = 12345; // simulate at old logger
    let msBase = Date.now() - msPast; // timestamp basis in milliseconds
    let sink = TEST_SINK;
    let logLevel = Logger.LEVEL_DEBUG;
    let logger = new Logger({ sink, msBase, logLevel });
    should(logger.sink).equal(sink);
    should(logger.logLevel).equal(logLevel);
    should.deepEqual(logger.history, []);
    let entry = logger.info(msg, 'ok', ABC);
    should(entry).instanceOf(LogEntry);
    should(entry.level).equal(Logger.LEVEL_INFO);
    should(entry.text).match(ABC_EXPECTED);
    should(entry.ms)
      .above(msPast - 1)
      .below(msPast + 10);
    should(logger.history.at(-1)).equal(entry);
  });
  it('debug', () => {
    let msg = 'tl4r.debug:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.debug(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_DEBUG);
    should(entry.text).match(ABC_EXPECTED);
  });
  it('log', () => {
    const msg = 'tl4r.log:';
    const dbg = 0;

    let logger = new Logger({ sink: TEST_SINK });

    // Default suppresses LEVEL_DEBUG, LEVEL_INFO
    should(sinkOut[0]).not.equal(msg);
    let entry = logger.log(msg, 'ok', ABC);
    should(sinkOut[0]).not.equal(msg);

    // Allow all messages
    logger.logLevel = Logger.LEVEL_DEBUG;
    entry = logger.debug(msg, 'debug', ABC);
    should(sinkOut[0]).equal(msg);
    should(sinkOut[1]).equal('debug');
    entry = logger.info(msg, 'ok', ABC);
    should(sinkOut[0]).equal(msg);
    should(sinkOut[1]).equal('ok');

    dbg && console.log(msg, { sinkOut });
    should(entry.level).equal(Logger.LEVEL_INFO);
    should(entry.text).match(ABC_EXPECTED);
  });
  it('warn', () => {
    let msg = 'tl4r.warn:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.warn(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_WARN);
    should(entry.text).match(ABC_EXPECTED);
  });
  it('error', () => {
    let msg = 'tl4r.error:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.error(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_ERROR);
    should(entry.text).match(ABC_EXPECTED);
  });
  it('no-sink', () => {
    let msg = 'tl4r.no-sink:';
    let logger = new Logger({ sink: null });
    let entry = logger.debug(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_DEBUG);

    entry = logger.info(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_INFO);
    entry = logger.log(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_INFO);
    entry = logger.warn(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_WARN);
    entry = logger.error(msg, 'ok', ABC);
    should(entry.level).equal(Logger.LEVEL_ERROR);
  });
});
