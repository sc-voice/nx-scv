import should from 'should';
import { Text } from '../../index.mjs';
const { Unicode, ColorConsole, Corpus } = Text;

const {
  BLACK,
  WHITE,
  RED,
  GREEN,
  BLUE,
  CYAN,
  MAGENTA,
  YELLOW,
  BRIGHT_BLACK,
  BRIGHT_WHITE,
  BRIGHT_RED,
  BRIGHT_GREEN,
  BRIGHT_BLUE,
  BRIGHT_CYAN,
  BRIGHT_MAGENTA,
  BRIGHT_YELLOW,
  NO_COLOR,
} = Unicode.LINUX_COLOR;


describe('TESTTESTtext/color-console', () => {
  it('default ctor', () => {
    let precision = 3; // default
    let cc = new ColorConsole({precision});
    let rest = [
      'abc', // string
      'pi:', // label
      1.1234, // show as 1.123 (round down)
      1.0009, // show as 1.001 (round up)
      1.1, // show as 1.1 (exact)
      1, // show as 1 (exact)
      {a:1, b:'red'}, // object
      true, // boolean
      null,
      undefined,
      CYAN+'cyan', // text color override
    ]

    cc.fyi('test_fyi', ...rest);
    cc.fyi1('test_fyi1', ...rest);
    cc.fyi2('test_fyi2', ...rest);

    cc.ok('test_ok1', ...rest);
    cc.ok1('test_ok1', ...rest);
    cc.ok2('test_ok2', ...rest);

    cc.bad('test_bad', ...rest);
    cc.bad1('test_bad1', ...rest);
    cc.bad2('test_bad2', ...rest);

    cc.tag1('test_tag1', ...rest);
    cc.tag2('test_tag2', ...rest);
    cc.tag3('test_tag3', ...rest);
    cc.tag4('test_tag4', ...rest);
  });
});
