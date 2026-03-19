declare module '@sc-voice/tools' {
  export interface ColorConsole {
    ok1(msg: string, ...args: any[]): void;
    ok(msg: string, ...args: any[]): void;
    bad1(msg: string, ...args: any[]): void;
    props(obj: any): any[];
  }

  export interface Unicode {
    CHECKMARK: string;
    RIGHT_GUILLEMET: string;
  }

  export interface Text {
    ColorConsole: {
      cc: ColorConsole;
    };
    Unicode: Unicode;
  }

  export interface Fraction {
    new(...args: any[]): Fraction;
    value: number;
    denominator: number;
    numerator: number;
    toString(opts?: any): string;
  }

  export interface ScvMath {
    Fraction: any;
  }

  export const Text: Text;
  export const ScvMath: ScvMath;
}
