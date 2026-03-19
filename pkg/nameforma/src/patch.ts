import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';
import { Rational } from './rational.js';
import { Schema } from './schema.js';
import { Identifiable } from './identifiable.js';

const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { PATCH: P3H } = DBG;

/**
 * Patch class for applying partial updates to objects.
 *
 * A patch represents a set of property changes that can be applied to a destination
 * object. It extends Identifiable to provide unique identification and only applies
 * updates to properties that already exist in the destination object.
 *
 * @extends Identifiable
 */
export class Patch extends Identifiable {
  [key: string]: any;

  /**
   * Create a new Patch instance.
   *
   * @param {Object} cfg - Configuration object containing properties to patch
   * @param {string} [cfg.id] - Optional ID; generates UUID64 if not provided
   * @param {...*} cfg - Additional properties to include in the patch
   */
  constructor(cfg: any = {}) {
    super(cfg.id);
    Object.entries(cfg).forEach((entry) => {
      const [k, v] = entry;
      if (k !== 'id') {
        this[k] = v;
      }
    });
  }

  /**
   * Apply this patch to a destination object.
   *
   * Iterates through all properties in this patch and updates matching properties
   * in the destination object if they already exist. Properties that match existing
   * values are logged but not modified. Attempting to patch the 'id' property
   * throws an error.
   *
   * @param {Object} dst - Destination object to apply patch to (mutated in-place)
   * @param {Object} [opts={}] - Options object (currently unused)
   * @param {Schema} [opts.schema] - Optional schema from dst.SCHEMA
   * @throws {Error} If attempting to patch the 'id' property
   */
  apply(dst: any, opts: any = {}) {
    const msg = 'P3h.apply';
    const dbg = P3H.APPLY;
    const { schema = dst?.SCHEMA } = opts;

    Object.entries(this).forEach((entry) => {
      const [k, vSrc] = entry;
      const vDst = dst[k];
      // Only update properties that exist in destination
      if (vDst !== undefined) {
        if (vSrc === vDst) {
          // Log unchanged properties at debug level 2
          dbg > 1 && cc.ok(msg, `unchanged ${k}: ${vSrc}`);
        } else {
          // Prevent patching the id property
          if (k === 'id') {
            throw new Error(`${msg} patch.id? ${this.id}:${vSrc}`);
          }
          // Update destination property with patch value
          dst[k] = vSrc;
          dbg > 1 && cc.ok(msg, `changed ${k}: ${dst[k]}`);
        }
      }
    });
  }
}
