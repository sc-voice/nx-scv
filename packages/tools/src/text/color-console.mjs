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
      tagColor1 = BRIGHT_MAGENTA,
      tagColor2 = MAGENTA,
      valueColor = CYAN,
      dateFormat = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
      }),
      precision = 3,
      write = (...args) => console.log.call(null, ...args),
    } = opts;

    Object.assign(this, {
      badColor1,
      badColor2,
      dateFormat,
      fyiColor1,
      fyiColor2,
      okColor1,
      okColor2,
      tagColor1,
      tagColor2,
      precision,
      valueColor,
      write,
    });
  }

  static get cc() {
    CC = CC || new ColorConsole();
    return CC;
  }

  valueOf(thing) {
    const msg = 'c10e.valueOf';
    let { precision } = this;
    switch (typeof thing) {
      case 'undefined':
        return 'undefined';
      case 'object': {
        if (thing == null) {
          return '' + thing;
        }
        if (thing instanceof Date) {
          return this.dateFormat.format(thing);
        }
        if (
          thing.constructor !== Object &&
          typeof thing.toString === 'function'
        ) {
          return thing.toString();
        }
        return thing;
      }
      case 'string':
        return thing;
      case 'number': {
        let v = thing.toFixed(precision);
        if (thing === Number(v)) {
          v = v.replace(/\.?0+$/, '');
        }
        return v;
      }
      default:
        return JSON.stringify(thing);
    }
  } // valueOf

  color(textColor, ...things) {
    let { valueColor } = this;
    let label = '';
    let endColor = NO_COLOR;
    let eol;
    return things.reduce((a, thing) => {
      let newLabel = '';
      let v = this.valueOf(thing);
      let aLast = a.at(-1);
      if (typeof aLast === 'string' && aLast.endsWith('\n' +  endColor)) {
        if (aLast === textColor + '\n' + endColor) {
          a.pop();
        } else {
          const iLast = aLast.lastIndexOf('\n');
          a.pop();
          a.push(aLast.substring(0, iLast) + aLast.substring(iLast + 1));
        }
        v = '\n' + v;
      } 
      switch (typeof thing) {
        case 'object': {
          if (
            thing == null ||
            (thing.constructor !== Object &&
              typeof thing.toString === 'function')
          ) {
            a.push(label + valueColor + v + endColor);
          } else {
            label && a.push(label + endColor);
            a.push(v);
          }
          break;
        }
        case 'string':
          if (thing.endsWith(':')) {
            newLabel = textColor + v;
          } else if (label) {
            a.push(label + valueColor + v + endColor);
          } else {
            a.push(textColor + v + endColor);
          }
          break;
        case 'number':
        default:
          a.push(label + valueColor + v + endColor);
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

  tag(...rest) {
    return this.tag2(...rest);
  }

  tag1(...rest) {
    this.write(...this.color(this.tagColor1, ...rest));
  }

  tag2(...rest) {
    this.write(...this.color(this.tagColor2, ...rest));
  }
}
