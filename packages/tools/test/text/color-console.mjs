import util from 'node:util';
import should from 'should';
import { ScvMath, Text } from '../../index.mjs';
import { DBG } from '../../src/defines.mjs';
const { COLOR_CONSOLE:C10E } = DBG;
const { Unicode, ColorConsole, Corpus } = Text;
const { Fraction, Interval } = ScvMath;
const { cc } = ColorConsole;

const dbg = C10E.TEST;

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
let { CHECKMARK:UOK } = Unicode;

const {
  UNDERLINE,
  NO_UNDERLINE,
  STRIKETHROUGH,
  NO_STRIKETHROUGH,
  BOLD,
  NO_BOLD,
} = Unicode.LINUX_STYLE;

const VALUE_COLOR = CYAN;
const STARTTEST = '===================';

describe('text/color-console', () => {
  it('default ctor', () => {
    const msg = 'tc10e.ctor';
    let cc = new ColorConsole();
    should(cc.precision).equal(3);
    should(cc.valueColor).equal(CYAN);
    should.deepEqual(ColorConsole.cc, cc);
    let value = 1.23456789;
    let testObj = { a: true, b: 'two', c: 3, d: null, e: undefined };
    dbg && cc.ok1(msg, 'test-ok', value, testObj);
    dbg && cc.ok2(msg, 'test-ok', value, testObj);
    dbg && cc.ok(msg, 'test-ok', value, testObj);
    dbg && cc.bad1(msg, 'test-bad1', value, testObj);
    dbg && cc.bad2(msg, 'test-bad2', value, testObj);
    dbg && cc.bad(msg, 'test-bad', value, testObj);
    dbg && cc.tag1(msg, 'test-tag1', value, testObj);
    dbg && cc.tag2(msg, 'test-tag2', value, testObj);
    dbg && cc.tag(msg, 'test-tag', value, testObj);
    dbg && cc.fyi1(msg, 'test-fyi1', value, testObj);
    dbg && cc.fyi2(msg, 'test-fyi2', value, testObj);
    dbg && cc.fyi(msg, 'test-fyi', value, testObj);
  });
  it('multiline no leading blank', () => {
    const msg = 'tc10e.multiline-no-leading-blank';
    // console.log adds leading blanks even if
    // preceding arg ends with '\n'
    let cc = new ColorConsole();
    let c1 = cc.color(
      CYAN,
      'a',
      '\n',
      'b',
      '\n',
      3,
      '\n',
      true,
      '\n',
      'c',
    );
    should.deepEqual(c1, [
      CYAN + 'a' + NO_COLOR,
      CYAN + '\nb' + NO_COLOR,
      CYAN + '\n3' + NO_COLOR,
      CYAN + '\ntrue' + NO_COLOR,
      CYAN + '\nc' + NO_COLOR,
    ]);
    let c2 = cc.color(CYAN, 'a\nb\n', 3, '\n', true, '\nc');
    should.deepEqual(c2, [
      CYAN + 'a\nb' + NO_COLOR,
      CYAN + '\n3' + NO_COLOR,
      CYAN + '\ntrue' + NO_COLOR,
      CYAN + '\nc' + NO_COLOR,
    ]);
    let c3 = cc.color(CYAN, 'a\nb\n', 'c', 'd');
    should.deepEqual(c3, [
      CYAN + 'a\nb' + NO_COLOR,
      CYAN + '\nc' + NO_COLOR,
      CYAN + 'd' + NO_COLOR,
    ]);
  });
  it('custom ctor', () => {
    const msg = 'tc10e.custom-ctor';
    let precision = 7;
    let okColor1 = BRIGHT_BLUE;
    let okColor2 = BLUE;
    let tagColor1 = BRIGHT_YELLOW;
    let tagColor2 = YELLOW;
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
      tagColor1,
      tagColor2,
      fyiColor1,
      fyiColor2,
    });
    should(cc.precision).equal(precision);
    should(cc.valueColor).equal(valueColor);
    should(cc.okColor1).equal(okColor1);
    should(cc.okColor2).equal(okColor2);
    should(cc.badColor1).equal(badColor1);
    should(cc.badColor2).equal(badColor2);
    should(cc.tagColor1).equal(tagColor1);
    should(cc.tagColor2).equal(tagColor2);
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
    dbg && cc.tag1(msg, 'test-tag1', value, date);
    dbg && cc.tag2(msg, 'test-tag2', value, date);
    dbg && cc.tag(msg, 'test-tag', value, date);
    dbg && cc.fyi1(msg, 'test-fyi1', value, date);
    dbg && cc.fyi2(msg, 'test-fyi2', value, date);
    dbg && cc.fyi(msg, 'test-fyi', value, date);
  });
  it('color() text', () => {
    const msg = 'tc10e.color.text';
    let cc = new ColorConsole();
    let label = 'label:';
    let nolabel = 'nolabel';
    let color = cc.okColor1;
    let endColor = NO_COLOR;

    let text = 'test-text (unlabelled)';
    let value = 'test-value';
    let cText = cc.color(color, text, nolabel, value, label, value);
    dbg && cc.write(msg, ...cText);
    should.deepEqual(cText, [
      color + text + endColor,
      color + nolabel + endColor,
      color + value + endColor,
      color + label + VALUE_COLOR + value + endColor,
    ]);
  });
  it('color() number', () => {
    const msg = 'tc10e.color.number';
    let cc = new ColorConsole();
    let label = 'label:';
    let nolabel = 'nolabel';
    let endColor = NO_COLOR;
    let color = cc.okColor1;

    let number = 1.23456789;
    let cNumber = cc.color(color, nolabel, number, label, number);
    let sNumber = number.toFixed(3);
    dbg && cc.write(msg, ...cNumber);
    should.deepEqual(cNumber, [
      color + nolabel + endColor,
      VALUE_COLOR + sNumber + endColor,
      color + label + VALUE_COLOR + sNumber + endColor,
    ]);
  });
  it('color() null', () => {
    const msg = 'tc10e.color.null';
    let cc = new ColorConsole();
    let label = 'label:';
    let nolabel = 'nolabel';
    let endColor = NO_COLOR;
    let color = cc.okColor1;

    let cNull = cc.color(color, nolabel, null, label, null);
    dbg && cc.write(msg, ...cNull);
    should.deepEqual(cNull, [
      color + nolabel + endColor,
      VALUE_COLOR + 'null' + endColor,
      color + label + VALUE_COLOR + 'null' + endColor,
    ]);

    let cUndefined = cc.color(color, nolabel, undefined, label, undefined);
    dbg && cc.write(msg, ...cUndefined);
    should.deepEqual(cUndefined, [
      color + nolabel + endColor,
      VALUE_COLOR + 'undefined' + endColor,
      color + label + VALUE_COLOR + 'undefined' + endColor,
    ]);
  });
  it('color() boolean', () => {
    const msg = 'tc10e.color.boolean';
    let cc = new ColorConsole();
    let label = 'label:';
    let nolabel = 'nolabel';
    let endColor = NO_COLOR;
    let color = cc.okColor1;

    let cFalse = cc.color(color, nolabel, false, label, false);
    dbg && cc.write(msg, ...cFalse);
    should.deepEqual(cFalse, [
      color + nolabel + endColor,
      VALUE_COLOR + 'false' + endColor,
      color + label + VALUE_COLOR + 'false' + endColor,
    ]);
  });
  it('TESTTESTcolor() object', () => {
    const msg = 'tc10e.color.object';
    let cc = new ColorConsole();
    dbg > 1 && cc.tag(msg, STARTTEST);
    let label = 'label:';
    let nolabel = 'nolabel';
    let endColor = NO_COLOR;
    let color = cc.okColor1;

    let object = { a: 1, b: 'text' };
    let cObject = cc.color(color, nolabel, object, label, object);
    dbg > 2 && cc.write(msg, ...cObject);
    let sObject = cc.asString(object);
    should.deepEqual(cObject, [
      color + nolabel + endColor,
      sObject,
      color + label + endColor,
      sObject,
    ]);
    dbg > 1 && cc.tag(msg, 'cObject', cObject);

    class Obj2Str {
      toString() {
        return 'test-Obj2String';
      }
    }
    let obj2Str = new Obj2Str();
    let sObj2Str = obj2Str.toString();
    dbg > 1 && cc.tag(msg, 'sObj2Str:', sObj2Str);
    let cObj2Str = cc.color(color, nolabel, obj2Str, label, obj2Str);
    dbg > 1 && cc.tag(msg, 'cObj2Str:', cObj2Str);
    should.deepEqual(cObj2Str, [
      color + nolabel + endColor,
      VALUE_COLOR + sObj2Str + endColor,
      color + label + VALUE_COLOR + sObj2Str + endColor,
    ]);
    dbg && cc.tag1(msg+UOK, 'cObj2Str:', cObj2Str);
  });
  it('TESTTESTasString() object', () => {
    const msg = 'tc10e.asString.object';
    let cc = new ColorConsole();
    dbg > 1 && cc.tag(msg, STARTTEST);
    let obj = { a: 1 };
    let s = cc.asString(obj);
    should(s).equal('{a:1}');

    dbg && cc.tag1(msg+UOK, s);
  });
  it('TESTTESTasString()', () => {
    const msg = 'tc10e.asString';
    let cc = new ColorConsole();
    should(cc.asString(1.0)).equal('1');
    should(cc.asString(1.2)).equal('1.2');
    should(cc.asString(1.02)).equal('1.02');
    should(cc.asString(1.002)).equal('1.002');
    should(cc.asString(1.0002)).equal('1.000');
    should(cc.asString(-1.0)).equal('-1');
    should(cc.asString(-1.2)).equal('-1.2');
    should(cc.asString(-1.02)).equal('-1.02');
    should(cc.asString(-1.002)).equal('-1.002');
    should(cc.asString(-1.0002)).equal('-1.000');
    should(cc.asString(undefined)).equal('undefined');
    should(cc.asString(null)).equal('null');
    should(cc.asString(false)).equal('false');
    should(cc.asString(true)).equal('true');
    let date = new Date(2025, 2, 1);
    dbg && cc.fyi(msg, date);
    should(cc.asString(date)).equal(cc.dateFormat.format(date));
  });
  it('inspect', () => {
    const msg = 'tl2t.inspect';
    const dbg = C10E.INSPECT;
    let colors = true;
    let { styleText, inspect } = util;
    let { styles, defaultOptions } = inspect;
    defaultOptions.colors = colors;
    dbg && console.log(msg, 'defaultOptions', defaultOptions);
    dbg && console.log(msg, 'styles', styles);

    let tbl = [
      [true, '%c4', /7/],
      [2, 5, 8],
    ];
    styles.string = 'magenta';
    styles.name = 'magenta';
    dbg && console.table(msg + util.inspect(tbl));
    dbg && console.table(tbl);
    should(util.inspect(tbl)).equal(util.inspect(tbl, { colors }));

    let strikethrough = 'strikethrough';
    dbg && console.log(msg, styleText(strikethrough, strikethrough));
    let underline = 'underline';
    dbg && console.log(msg, styleText(underline, underline));
    let green = 'green';
    dbg && console.log(msg, styleText(green, green));
    let bold = 'bold';
    dbg && console.log(msg, styleText(bold, bold));

    let format = [bold, green, underline, strikethrough];
    let text = format.join('-');
    let style = styleText(format, text);
    dbg && console.log(msg, style);
    should(style).equal(
      BOLD +
        GREEN +
        UNDERLINE +
        STRIKETHROUGH +
        text +
        NO_STRIKETHROUGH +
        NO_UNDERLINE +
        NO_COLOR +
        NO_BOLD,
    );
  });
  it('isOk()', () => {
    const msg = 'tc10e.isOk';
    let { styleText, inspect } = util;

    let { okColor2: ok, badColor2: bad } = cc;

    dbg &&
      cc.fyi(
        msg + 0.1,
        'label:',
        cc.isOk(true),
        'label:',
        cc.isOk(false),
        'label:',
        'end',
      );

    // NOTE: the default value for the tf value is the first argument!
    // truthy
    should(cc.isOk(Math.PI))
      .equal(cc.isOk(Math.PI, undefined))
      .equal(cc.isOk(Math.PI, Math.PI))
      .equal(`${ok}3.142`);
    should(cc.isOk(Math.PI, true)).equal(`${ok}3.142`);
    should(cc.isOk(Math.PI)).equal(`${ok}3.142`);
    should(cc.isOk(Math.PI, undefined)).equal(`${ok}3.142`);

    // falsy
    let uninitialized;
    should(cc.isOk()).equal(`${bad}undefined`);
    should(cc.isOk(uninitialized)).equal(`${bad}undefined`);
    should(cc.isOk(uninitialized, undefined)).equal(`${bad}undefined`);
    should(cc.isOk(Math.PI, false)).equal(`${bad}3.142`);
    should(cc.isOk(Math.PI, null)).equal(`${bad}3.142`);
    should(cc.isOk(null)).equal(`${bad}null`);
  });
  it('props()', () => {
    let obj = {
      vstring: 'test-text',
      vnumber: 1.23,
      vboolean: true,
      vobj: { a: 1, b: 'one', c: false },
      vundefined: undefined,
      vnull: null,
    };
    let props = cc.props(obj);
    should.deepEqual(
      [...props],
      [
        'vstring:',
        'test-text',
        'vnumber:',
        1.23,
        'vboolean:',
        true,
        'vobj:',
        '{"a":1,"b":"one","c":false}',
        'vundefined:',
        undefined,
        'vnull:',
        null,
      ],
    );
  });
  it('props() function', () => {
    let obj = {
      vfun: () => Date.now(),
    };
    let props = cc.props(obj);
    should.deepEqual([...props], ['vfun:', '[Function vfun]']);
  });
  it('props() Fraction', () => {
    let obj = {
      vfrac: new Fraction(3, 10),
      vzero: new Fraction(0, 1),
    };
    let props = cc.props(obj);
    should.deepEqual([...props], ['vfrac:', '0.3', 'vzero:', '0']);
  });
  it('props() Array', () => {
    let obj = {
      varr: [1, 2, 3],
      vobj: [{ a: 1 }, { b: 2 }],
    };
    should(obj.vobj.toString).not.equal({}.toString);
    let props = cc.props(obj);
    should.deepEqual(
      [...props],
      ['varr:', '[1,2,3]', 'vobj:', JSON.stringify(obj.vobj)],
    );
  });
});
