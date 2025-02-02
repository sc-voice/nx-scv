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

describe('TESTTESTlogger', () => {
  it('default ctor', () => {
    let msg = 'tl4r.ctor:';
    let logger = new Logger();
    let now = Date.now();
    should(logger.sink).equal(console);
    should.deepEqual(logger.history, []);
    should(logger.msBase).above(now-1).below(now+10);
  });
  it('custom ctor', () => {
    let msg = 'tl4r.custom-ctor:';
    let msPast = 12345; // simulate at old logger
    let msBase = Date.now() - msPast; // timestamp basis in milliseconds
    let sink = TEST_SINK;
    let logger = new Logger({ sink, msBase });
    should(logger.sink).equal(sink);
    should.deepEqual(logger.history, []);
    let entry = logger.info(msg, 'ok', ABC);
    should(entry).instanceOf(LogEntry);
    should(entry.level).equal('I');
    should(entry.text).match(ABC_EXPECTED);
    should(entry.ms).above(msPast - 1).below(msPast + 10);
    should(logger.history.at(-1)).equal(entry);
  });
  it('debug', () => {
    let msg = 'tl4r.debug:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.debug(msg, 'ok', ABC);
    should(entry.level).equal('D');
    should(entry.text).match(ABC_EXPECTED);
  });
  it('log', () => {
    let msg = 'tl4r.log:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.log(msg, 'ok', ABC);
    should(entry.level).equal('L');
    should(entry.text).match(ABC_EXPECTED);
  });
  it('warn', () => {
    let msg = 'tl4r.warn:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.warn(msg, 'ok', ABC);
    should(entry.level).equal('W');
    should(entry.text).match(ABC_EXPECTED);
  });
  it('error', () => {
    let msg = 'tl4r.error:';
    let logger = new Logger({ sink: TEST_SINK });
    let entry = logger.error(msg, 'ok', ABC);
    should(entry.level).equal('E');
    should(entry.text).match(ABC_EXPECTED);
  });
  it('no-sink', ()=>{
    let msg = 'tl4r.no-sink:';
    let logger = new Logger({ sink: null });
    let entry = logger.debug(msg, 'ok', ABC);
    should(entry.level).equal('D');

    entry = logger.info(msg, 'ok', ABC);
    should(entry.level).equal('I');
    entry = logger.log(msg, 'ok', ABC);
    should(entry.level).equal('L');
    entry = logger.warn(msg, 'ok', ABC);
    should(entry.level).equal('W');
    entry = logger.error(msg, 'ok', ABC);
    should(entry.level).equal('E');
  });
});
