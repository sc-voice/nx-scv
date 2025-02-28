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

export class ColorConsole {
  constructor(opts = {}) {
    let {
      write = (...args) => console.log.call(null, ...args),
      colorOk1 = BRIGHT_GREEN,
      colorOk2 = GREEN,
      colorFyi1 = BRIGHT_BLACK,
      colorBad1 = BRIGHT_RED,
      colorBad2 = RED,
      colorTag1 = CYAN,
      colorTag2 = BRIGHT_CYAN,
      colorTag3 = MAGENTA,
      colorTag4 = BRIGHT_MAGENTA,
    } = opts;

    Object.assign(this, {
      write,
      colorOk1,
      colorOk2,
      colorFyi1,
      colorBad1,
      colorBad2,
      colorTag1,
      colorTag2,
      colorTag3,
      colorTag4,
    });
  }

  color(color, ...things) {
    return things.map((thing) => {
      switch (typeof thing) {
        case 'object':
          // TODO: pretty objects like console
          return thing;
        case 'string':
          return `${color}${thing}${NO_COLOR}`;
        case 'number':
          return `${GREEN}${thing}${NO_COLOR}`;
        default:
          return `${color}${JSON.stringify(thing)}${NO_COLOR}`;
      }
    });
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

  tag3(msg, lvl, ...rest) {
    let color = this.colorTag3;
    this.write(...this.color(color, ...rest));
  }

  tag4(msg, lvl, ...rest) {
    let color = this.colorTag4;
    this.write(...this.color(color, ...rest));
  }
}
