import { Unicode } from './unicode.mjs';

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

let CC;

export class ColorConsole {
  constructor(opts = {}) {
    let {
      colorBad1 = BRIGHT_RED,
      colorBad2 = RED,
      colorFyi1 = BRIGHT_WHITE,
      colorFyi2 = BRIGHT_BLACK,
      colorOk1 = BRIGHT_GREEN,
      colorOk2 = GREEN,
      colorTag1 = CYAN,
      colorTag2 = BRIGHT_CYAN,
      colorTag3 = MAGENTA,
      colorTag4 = BRIGHT_MAGENTA,
      precision = 3,
      write = (...args) => console.log.call(null, ...args),
    } = opts;

    Object.assign(this, {
      colorBad1,
      colorBad2,
      colorFyi1,
      colorFyi2,
      colorOk1,
      colorOk2,
      colorTag1,
      colorTag2,
      colorTag3,
      colorTag4,
      precision,
      write,
    });
  }

  static get cc() {
    CC = CC || new ColorConsole();
    return CC;
  }

  color(color, ...things) {
    let { precision } = this;
    let label = '';
    return things.reduce((a, thing) => {
      let newLabel = '';
      switch (typeof thing) {
        case 'object': {
          label && a.push(label);
          let s =
            thing &&
            thing.constructor !== Object &&
            typeof thing.toString === 'function'
              ? color + thing.toString() + NO_COLOR
              : thing;
          a.push(s);
          break;
        }
        case 'string':
          if (thing.endsWith(':')) {
            newLabel = NO_COLOR + thing;
          } else {
            a.push(label + color + thing + NO_COLOR);
          }
          break;
        case 'number': {
          let v = thing.toFixed(precision);
          if (thing === Number(v)) {
            v = v.replace(/\.?0+$/, '');
          }
          a.push(label + GREEN + v + NO_COLOR);
          break;
        }
        default:
          a.push(label + color + JSON.stringify(thing) + NO_COLOR);
          break;
      }
      label = newLabel;
      return a;
    }, []);
  }

  fyi(...rest) {
    return this.fyi2(...rest);
  }

  fyi1(...rest) {
    let color = this.colorFyi1;
    this.write(...this.color(color, ...rest));
  }

  fyi2(...rest) {
    let color = this.colorFyi2;
    this.write(...this.color(color, ...rest));
  }

  ok(...rest) {
    return this.ok2(...rest);
  }

  ok1(...rest) {
    let color = this.colorOk1;
    this.write(...this.color(color, ...rest));
  }

  ok2(...rest) {
    let color = this.colorOk2;
    this.write(...this.color(color, ...rest));
  }

  bad(...rest) {
    return this.bad2(...rest);
  }

  bad1(...rest) {
    let color = this.colorBad1;
    this.write(...this.color(color, ...rest));
  }

  bad2(...rest) {
    let color = this.colorBad2;
    this.write(...this.color(color, ...rest));
  }

  tag1(...rest) {
    let color = this.colorTag1;
    this.write(...this.color(color, ...rest));
  }

  tag2(...rest) {
    let color = this.colorTag2;
    this.write(...this.color(color, ...rest));
  }

  tag3(...rest) {
    let color = this.colorTag3;
    this.write(...this.color(color, ...rest));
  }

  tag4(...rest) {
    let color = this.colorTag4;
    this.write(...this.color(color, ...rest));
  }
}
