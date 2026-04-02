import { ScvMath, Text } from '@sc-voice/tools';
import { Schema } from './schema.js';
import { DBG } from './defines.js';

const { Fraction } = ScvMath;
const { Unicode, ColorConsole } = Text;
const { CHECKMARK: UOK } = Unicode;
const { RATIONAL: R6L } = DBG;
const { cc } = ColorConsole;

export class Rational extends Fraction {
  #isNull?: boolean;

  constructor(...args: any[]) {
    const msg = 'Rational.ctor:';
    const dbg = R6L.CTOR;
    super(...args);

    dbg && cc.ok1(msg + UOK);
  }

  /**
   * Register Rational avroSchema into the avro registry and return AvroType.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static registerAvro(opts: any = {}) {
    const msg = "r6l.registerAvro";
    const dbg = DBG.SCHEMA.ALL;

    let { fullName } = Rational.avroSchema;
    dbg && cc.ok(msg, "registerType:", fullName);
    let avroType = Schema.registerType(Rational, opts);
    dbg && cc.ok1(msg, "schema:", fullName);
    return avroType
  }

  static get avroSchema() {
    return new Schema({
      name: 'Rational',
      namespace: 'scvoice.nameforma',
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
