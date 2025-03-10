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
      badColor1 = BRIGHT_RED,
      badColor2 = RED,
      fyiColor1 = BRIGHT_WHITE,
      fyiColor2 = BRIGHT_BLACK,
      okColor1 = BRIGHT_GREEN,
      okColor2 = GREEN,
      valueColor = CYAN,
      precision = 3,
      write = (...args) => console.log.call(null, ...args),
    } = opts;

    Object.assign(this, {
      badColor1,
      badColor2,
      fyiColor1,
      fyiColor2,
      okColor1,
      okColor2,
      valueColor,
      precision,
      write,
    });
  }

  static get cc() {
    CC = CC || new ColorConsole();
    return CC;
  }

  color(textColor, ...things) {
    let { precision, valueColor } = this;
    let label = '';
    let endColor = NO_COLOR;
    return things.reduce((a, thing) => {
      let newLabel = '';
      switch (typeof thing) {
        case 'object': {
          if (thing === null) {
            a.push(label + valueColor + 'null' + endColor);
          } else if (
            thing.constructor !== Object &&
            typeof thing.toString === 'function'
          ) {
            a.push(label + valueColor + thing.toString() + endColor);
          } else {
            label && a.push(label + endColor);
            a.push(thing);
          }
          break;
        }
        case 'string':
          if (thing.endsWith(':')) {
            newLabel = textColor + thing;
          } else if (label) {
            a.push(label + valueColor + thing + endColor);
          } else {
            a.push(textColor + thing + endColor);
          }
          break;
        case 'number': {
          let v = thing.toFixed(precision);
          if (thing === Number(v)) {
            v = v.replace(/\.?0+$/, '');
          }
          a.push(label + valueColor + v + endColor);
          break;
        }
        default:
          a.push(
            label + valueColor + JSON.stringify(thing) + endColor,
          );
          break;
      }
      label = newLabel;
      return a;
    }, []);
  } // color

  fyi(...rest) {
    return this.fyi2(...rest);
  }

  fyi1(...rest) {
    this.write(...this.color(this.fyiColor1, ...rest));
  }

  fyi2(...rest) {
    this.write(...this.color(this.fyiColor2, ...rest));
  }

  ok(...rest) {
    return this.ok2(...rest);
  }

  ok1(...rest) {
    this.write(...this.color(this.okColor1, ...rest));
  }

  ok2(...rest) {
    this.write(...this.color(this.okColor2, ...rest));
  }

  bad(...rest) {
    return this.bad2(...rest);
  }

  bad1(...rest) {
    this.write(...this.color(this.badColor1, ...rest));
  }

  bad2(...rest) {
    this.write(...this.color(this.badColor2, ...rest));
  }

}
