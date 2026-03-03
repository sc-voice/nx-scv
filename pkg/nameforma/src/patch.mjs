import avro from 'avro-js';
import { Text } from '@sc-voice/tools';
import { DBG } from '../src/defines.mjs';
import { Rational } from './rational.mjs';
import { Schema } from './schema.mjs';
import { Identifiable } from './identifiable.mjs';

const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { PATCH: P3H } = DBG;

export class Patch extends Identifiable {
  constructor(cfg = {}) {
    super(cfg.id);
    Object.entries(cfg).forEach((entry) => {
      const [k, v] = entry;
      if (k !== 'id') {
        this[k] = v;
      }
    });
  }

  apply(dst, opts = {}) {
    const msg = 'P3h.apply';
    const dbg = P3H.APPLY;
    const { schema = dst?.SCHEMA } = opts;

    Object.entries(this).forEach((entry) => {
      const [k, vSrc] = entry;
      const vDst = dst[k];
      if (vDst !== undefined) {
        if (vSrc === vDst) {
          dbg > 1 && cc.ok(msg, `unchanged ${k}: ${vSrc}`);
        } else {
          if (k === 'id') {
            throw new Error(`${msg} patch.id? ${this.id}:${vVorma}`);
          }
          dst[k] = vSrc;
          dbg > 1 && cc.ok(msg, `changed ${k}: ${dst[k]}`);
        }
      }
    });
  }
}
