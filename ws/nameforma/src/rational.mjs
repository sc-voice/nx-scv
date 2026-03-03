import { ScvMath, Text } from '@sc-voice/tools';
import { Schema } from './schema.mjs';
import { DBG } from './defines.mjs';

const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { CHECKMARK: UOK } = Unicode;
const { RATIONAL: R6L } = DBG;
const { cc } = ColorConsole;

export class Rational extends Fraction {
  #isNull;
  constructor(...args) {
    const msg = 'Rational.ctor:';
    const dbg = R6L.CTOR;
    super(...args);

    dbg && cc.ok1(msg + UOK);
  }

  static get SCHEMA() {
    return new Schema({
      name: 'Rational',
      type: 'record',
      fields: [
        { name: 'isNull', type: 'boolean', default: false },
        { name: 'numerator', type: 'double' },
        { name: 'denominator', type: 'double' },
        { name: 'units', type: 'string' },
      ],
    });
  }
}
