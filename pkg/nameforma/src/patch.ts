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
 * object. It extends Identifiable (not Forma) to provide unique identification while
 * allowing all properties (including name and summary) to be patchable on Forma instances.
 * Only applies updates to properties that already exist in the destination object.
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
   * Two-phase transactional update:
   * 1. Validation phase: Check all fields are patchable before making changes
   * 2. Apply phase: Update all validated fields
   *
   * Only updates properties listed in the destination's patchableFields.
   * Prevents patching immutable 'id' property and non-patchable FormaCollection fields.
   *
   * @param {Object} dst - Destination object to apply patch to (mutated in-place)
   * @param {Object} [opts={}] - Options object (currently unused)
   * @param {Schema} [opts.schema] - Optional schema from dst.avroSchema
   * @throws {Error} If any field fails validation (id property or non-patchable)
   */
  apply(dst: any, opts: any = {}) {
    const msg = 'P3h.apply';
    const dbg = P3H.APPLY;
    const { schema = dst?.avroSchema } = opts;

    // Get patchable fields from destination's constructor
    const patchableFields = dst.constructor?.patchableFields || [];

    // Phase 1: Validation - check all fields before making any changes
    Object.entries(this).forEach((entry) => {
      const [k, vSrc] = entry;

      // Check id: allow if matches, throw if attempting to change
      if (k === 'id') {
        if (vSrc !== dst[k]) {
          throw new Error(`${msg} Cannot patch id: ${dst[k]} != ${vSrc}`);
        }
        return; // id matches, skip
      }

      // Check if field is patchable
      if (!patchableFields.includes(k)) {
        throw new Error(`${msg} Cannot patch '${k}'. Patchable fields: ${patchableFields.join(', ')}`);
      }

      // Check if field exists in destination
      if (dst[k] === undefined) {
        throw new Error(`${msg} Field '${k}' does not exist on destination object`);
      }
    });

    // Phase 2: Apply - all validation passed, now update all fields
    Object.entries(this).forEach((entry) => {
      const [k, vSrc] = entry;
      const vDst = dst[k];

      if (vSrc === vDst) {
        // Log unchanged properties at debug level 2
        dbg > 1 && cc.ok(msg, `unchanged ${k}: ${vSrc}`);
      } else {
        // Update destination property with patch value
        dst[k] = vSrc;
        dbg > 1 && cc.ok(msg, `changed ${k}: ${dst[k]}`);
      }
    });
  }
}
