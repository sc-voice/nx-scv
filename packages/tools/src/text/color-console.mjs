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
      colorFYI1 = BRIGHT_BLACK,
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
      colorFYI1,
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

  msgLvl(color, msg, lvl, rest) {
    return this.color(color, msg + (lvl ? `@${lvl}` : ''), ...rest);
  }

  ok1(msg, lvl, ...rest) {
    let color = this.colorOk1;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  ok2(msg, lvl, ...rest) {
    let color = this.colorOk2;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  bad1(msg, lvl, ...rest) {
    let color = this.colorBad1;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  bad2(msg, lvl, ...rest) {
    let color = this.colorBad2;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  tag1(msg, lvl, ...rest) {
    let color = this.colorTag1;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  tag2(msg, lvl, ...rest) {
    let color = this.colorTag2;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  tag3(msg, lvl, ...rest) {
    let color = this.colorTag3;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }

  tag4(msg, lvl, ...rest) {
    let color = this.colorTag4;
    this.write(...this.msgLvl(color, msg, lvl, rest));
  }
}
