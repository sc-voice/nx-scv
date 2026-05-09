import { Text } from '@sc-voice/tools';
import * as math from '@sc-voice/tools/math';
import { Schema } from './schema.js';
import { DBG } from './defines.js';
import { NotImplementedError } from './errors.js';

const { Fraction, Units } = math;
const BaseFraction = Fraction;
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
   * Patch this Rational with new values.
   *
   * If value is a string, parses it via parsePatch() and merges.
   * If value is a number, updates numerator and sets denominator to 1.
   * If value is a Rational, copies its fields.
   *
   * @param value String, number, or Rational
   * @returns This instance (for chaining)
   * @throws NotImplementedError for unsupported types
   */
  override patch(value: any): Rational {
    let patchConfig: any = {};

    if (typeof value === 'string') {
      patchConfig = Rational.parsePatch(value);
    } else if (typeof value === 'number') {
      patchConfig = { numerator: value, denominator: 1 };
    } else if (value instanceof BaseFraction) {
      patchConfig = {
        numerator: value.numerator,
        denominator: value.denominator,
        units: value.units,
        isNull: (value as any).isNull,
      };
    } else {
      throw new NotImplementedError(
        `Rational.patch: unsupported value type`,
      );
    }

    // Use put() to apply patch, merging with existing values
    const putConfig: any = {
      numerator: patchConfig.numerator ?? this.numerator,
      denominator: patchConfig.denominator ?? this.denominator,
      units: patchConfig.units ?? this.units,
    };
    // Only pass isNull if it was explicitly in patch config
    if ('isNull' in patchConfig) {
      putConfig.isNull = patchConfig.isNull;
    }
    this.put(putConfig);

    return this;
  }

  /**
   * Parse a string into a partial config object.
   *
   * Handles formats like:
   * - "null" → {isNull: true}
   * - "5" → {numerator: 5}
   * - "5/60" → {numerator: 5, denominator: 60}
   * - "5/60hr" → {numerator: 5, denominator: 60, units: "hr"}
   * - "cm" → {units: "cm"}
   *
   * @param str Input string to parse
   * @returns Partial config object
   * @throws Error if format is invalid or units are unknown
   */
  static parsePatch(str: string): any {
    if (!str || typeof str !== 'string') {
      throw new Error(`Rational.parsePatch: invalid input "${str}"`);
    }

    const trimmed = str.trim();
    if (!trimmed) {
      throw new Error(`Rational.parsePatch: empty string`);
    }

    // Handle "null" keyword
    if (trimmed === 'null') {
      return { isNull: true };
    }

    const config: any = {};
    const units = new Units();

    // Try to match: [numerator]/[denominator][units]
    // Or: [numerator][units]
    const fractionMatch = trimmed.match(
      /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)(.*)$/,
    );
    if (fractionMatch) {
      const [, numStr, denomStr, unitsStr] = fractionMatch;
      config.numerator = parseFloat(numStr);
      config.denominator = parseFloat(denomStr);

      if (unitsStr.trim()) {
        const unitsTrimmed = unitsStr.trim();
        const normalized = units.abbreviation(unitsTrimmed);
        // Validate units exist in unitMap
        if (!(units as any).unitMap[normalized]) {
          throw new Error(
            `Rational.parsePatch: unknown units "${unitsTrimmed}"`,
          );
        }
        config.units = unitsTrimmed;
      }

      return config;
    }

    // Try to match: [numerator][units]
    const numberMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
    if (numberMatch) {
      const [, numStr, unitsStr] = numberMatch;
      const num = parseFloat(numStr);

      if (!isNaN(num)) {
        config.numerator = num;

        if (unitsStr.trim()) {
          const unitsTrimmed = unitsStr.trim();
          const normalized = units.abbreviation(unitsTrimmed);
          // Validate units exist in unitMap
          if (!(units as any).unitMap[normalized]) {
            throw new Error(
              `Rational.parsePatch: unknown units "${unitsTrimmed}"`,
            );
          }
          config.units = unitsTrimmed;
        }

        return config;
      }
    }

    // Try to match: just units
    const unitsTrimmed = trimmed;
    const normalized = units.abbreviation(unitsTrimmed);
    // Validate units exist in unitMap
    if (!(units as any).unitMap[normalized]) {
      throw new Error(`Rational.parsePatch: cannot parse "${str}"`);
    }
    config.units = unitsTrimmed;
    return config;
  }

  /**
   * Construct a Rational from a string.
   *
   * Calls parsePatch() and fills missing fields from defaults.
   *
   * @param str Input string
   * @param defaults Optional default values for missing fields
   * @returns New Rational instance
   */
  static fromString(str: string, defaults: any = {}): Rational {
    const patch = Rational.parsePatch(str);
    const config = { ...defaults, ...patch };
    return new Rational(config);
  }

  /**
   * Register Rational avroSchema into the avro registry and return AvroType.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static registerAvro(opts: any = {}) {
    const msg = 'r6l.registerAvro';
    const dbg = DBG.SCHEMA.ALL;

    let { fullName } = Rational.avroSchema;
    dbg && cc.ok(msg, 'registerType:', fullName);
    let avroType = Schema.registerType(Rational, opts);
    dbg && cc.ok1(msg, 'schema:', fullName);
    return avroType;
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
