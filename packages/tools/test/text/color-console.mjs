import should from 'should';
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { Unicode, ColorConsole, Corpus } = Text;
const { Interval } = ScvMath;

const dbg = DBG.COLOR_CONSOLE;

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

const VALUE_COLOR = CYAN;

describe('TESTTESTtext/color-console', () => {
  it('default ctor', () => {
    const msg = 'tc10e.ctor';
    let cc = new ColorConsole();
    should(cc.precision).equal(3);
    should(cc.valueColor).equal(CYAN);
    should.deepEqual(ColorConsole.cc, cc);
    let value = 1.23456789;
    dbg && cc.ok1(msg, 'test-ok', value);
    dbg && cc.ok2(msg, 'test-ok', value);
    dbg && cc.ok(msg, 'test-ok', value);
    dbg && cc.bad1(msg, 'test-bad1', value);
    dbg && cc.bad2(msg, 'test-bad2', value);
    dbg && cc.bad(msg, 'test-bad', value);
    dbg && cc.fyi1(msg, 'test-fyi1', value);
    dbg && cc.fyi2(msg, 'test-fyi2', value);
    dbg && cc.fyi(msg, 'test-fyi', value);
  });
  it('custom ctor', () => {
    const msg = 'tc10e.custom-ctor';
    let precision = 7;
    let okColor1 = BRIGHT_BLUE;
    let okColor2 = BLUE;
    let badColor1 = BRIGHT_WHITE;
    let badColor2 = WHITE;
    let fyiColor1 = BRIGHT_RED;
    let fyiColor2 = RED;
    let valueColor = BRIGHT_CYAN;
    let dateFormat = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
    });
    let cc = new ColorConsole({
      dateFormat,
      precision,
      valueColor,
      okColor1,
      okColor2,
      badColor1,
      badColor2,
      fyiColor1,
      fyiColor2,
    });
    should(cc.precision).equal(precision);
    should(cc.valueColor).equal(valueColor);
    should(cc.okColor1).equal(okColor1);
    should(cc.okColor2).equal(okColor2);
    should(cc.badColor1).equal(badColor1);
    should(cc.badColor2).equal(badColor2);
    should(cc.fyiColor1).equal(fyiColor1);
    should(cc.fyiColor2).equal(fyiColor2);
    should(cc.dateFormat).equal(dateFormat);
    let value = 1.23456789;
    let date = new Date(2025, 3, 1);
    dbg && cc.ok1(msg, 'test-ok', value, date);
    dbg && cc.ok2(msg, 'test-ok', value, date);
    dbg && cc.ok(msg, 'test-ok', value, date);
    dbg && cc.bad1(msg, 'test-bad1', value, date);
    dbg && cc.bad2(msg, 'test-bad2', value, date);
    dbg && cc.bad(msg, 'test-bad', value, date);
    dbg && cc.fyi1(msg, 'test-fyi1', value, date);
    dbg && cc.fyi2(msg, 'test-fyi2', value, date);
    dbg && cc.fyi(msg, 'test-fyi', value, date);
  });
  it('color()', () => {
    const msg = 'tc10e.color';
    let cc = new ColorConsole();
    let label = 'label:';
    let endColor = NO_COLOR;

    let text = 'test-text';
    let value = 'test-value';
    let cText = cc.color(RED, text, label, value);
    dbg && cc.write(msg, ...cText);
    should.deepEqual(cText, [
      RED + text + endColor,
      RED + label + VALUE_COLOR + value + endColor,
    ]);

    let number = 1.23456789;
    let cNumber = cc.color(RED, number, label, number);
    let sNumber = number.toFixed(3);
    dbg && cc.write(msg, ...cNumber);
    should.deepEqual(cNumber, [
      VALUE_COLOR + sNumber + endColor,
      RED + label + VALUE_COLOR + sNumber + endColor,
    ]);

    let cNull = cc.color(RED, null, label, null);
    dbg && cc.write(msg, ...cNull);
    should.deepEqual(cNull, [
      VALUE_COLOR + 'null' + endColor,
      RED + label + VALUE_COLOR + 'null' + endColor,
    ]);

    let cUndefined = cc.color(RED, undefined, label, undefined);
    dbg && cc.write(msg, ...cUndefined);
    dbg && console.log(msg, ...cUndefined);
    should.deepEqual(cUndefined, [
      VALUE_COLOR + 'undefined' + endColor,
      RED + label + VALUE_COLOR + 'undefined' + endColor,
    ]);

    let object = { a: 1, b: 'text' };
    let cObject = cc.color(RED, object, label, object);
    dbg && cc.write(msg, ...cObject);
    should.deepEqual(cObject, [
      object,
      RED + label + endColor,
      object,
    ]);

    class Obj2Str {
      toString() {
        return 'test-Obj2String';
      }
    }
    let obj2Str = new Obj2Str();
    let sObj2Str = obj2Str.toString();
    let cObj2Str = cc.color(RED, obj2Str, label, obj2Str);
    dbg && cc.write(msg, ...cObj2Str);
    should.deepEqual(cObj2Str, [
      VALUE_COLOR + sObj2Str + endColor,
      RED + label + VALUE_COLOR + sObj2Str + endColor,
    ]);

    let cFalse = cc.color(RED, false, label, false);
    dbg && cc.write(msg, ...cFalse);
    should.deepEqual(cFalse, [
      VALUE_COLOR + 'false' + endColor,
      RED + label + VALUE_COLOR + 'false' + endColor,
    ]);
  });
  it('valueOf()', () => {
    const msg = 'tc10e.valueOf';
    let cc = new ColorConsole();
    should(cc.valueOf(1.0)).equal('1');
    should(cc.valueOf(1.2)).equal('1.2');
    should(cc.valueOf(1.02)).equal('1.02');
    should(cc.valueOf(1.002)).equal('1.002');
    should(cc.valueOf(1.0002)).equal('1.000');
    should(cc.valueOf(-1.0)).equal('-1');
    should(cc.valueOf(-1.2)).equal('-1.2');
    should(cc.valueOf(-1.02)).equal('-1.02');
    should(cc.valueOf(-1.002)).equal('-1.002');
    should(cc.valueOf(-1.0002)).equal('-1.000');
    should(cc.valueOf(undefined)).equal('undefined');
    should(cc.valueOf(null)).equal('null');
    should(cc.valueOf(false)).equal('false');
    should(cc.valueOf(true)).equal('true');
    let obj = { a: 1 };
    should(cc.valueOf(obj)).equal(obj);
    let date = new Date(2025, 2, 1);
    dbg && cc.fyi(msg, date);
    should(cc.valueOf(date)).equal(cc.dateFormat.format(date));
  });
});
