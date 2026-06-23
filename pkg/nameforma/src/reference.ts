import { Forma, type ListItemStringCfg } from './forma.js';
import { DBG } from './defines.js';
import { Schema } from './schema.js';
import { NameFormaTheme } from './nameforma-theme.js';

import { Unicode, ColorConsole } from '@sc-voice/tools/text';
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { LIGHT_VERTICAL_BAR: UBAR } = Unicode;
const { REFERENCE: REF } = DBG;

/**
 * Reference - A link or citation with relevance scoring
 *
 * ## Features
 * 1. **Relevance Scoring**: Tracks relevance as a number [0..1]
 * 2. **Source**: Optional source URL or reference
 * 3. **Inheritance**: Extends Forma for unique ID, name, and summary
 * 4. **Avro Encoding**: Full Avro schema support for serialization
 */
export class Reference extends Forma {
  relevance: number;
  source: string;

  /**
   * Create a new Reference instance.
   *
   * @param cfg Configuration object with optional:
   *   - `id`: UUID64 for deserialized references (auto-generated if omitted)
   *   - `relevance`: Number [0..1] (default: 0)
   *   - `source`: Optional source URL or reference string (default: '')
   *
   * Calls super constructor to initialize Forma fields.
   */
  constructor(cfg: any = {}) {
    const msg = 'ref.ctor';
    const dbg = REF?.CTOR;
    super(cfg);

    let { relevance = 0, source = '' } = cfg;
    this.relevance = relevance;
    this.source = source;

    dbg &&
      cc.ok1(msg + UOK, {
        id: this.id,
        name: this.name,
        relevance,
        source,
      });
  }

  /**
   * Register this class's avroSchema into the avro registry and return AvroType.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static override registerAvro(opts: any = {}) {
    const msg = 'ref.registerAvro';
    const dbg = DBG.SCHEMA.ALL;
    Forma.registerAvro(opts);

    let { fullName } = Reference.avroSchema;
    dbg > 1 && cc.ok(msg, 'registerType:', fullName);
    let avroType = Schema.registerType(Reference, opts);
    dbg && cc.ok1(msg, 'schema:', fullName);
    return avroType;
  }

  /**
   * Schema wrapper for Reference avro schema record
   * @returns Schema
   */
  static override get avroSchema() {
    const formaSchema = Forma.avroSchema;
    return new Schema({
      name: 'Reference',
      namespace: this.AVRO_NAMESPACE,
      type: 'record',
      fields: [
        ...(formaSchema.fields || []),
        {
          name: 'relevance',
          type: 'double',
          default: 0,
        },
        {
          name: 'source',
          type: 'string',
          default: '',
        },
      ],
    });
  }

  /**
   * Patch (merge) properties on this instance.
   * Updates mutable fields (name, summary, relevance, source); immutable id is preserved.
   * @param update - Configuration object with properties to update
   * @return {any} prior values changed
   */
  override patch(update: any = {}): any {
    const changed:any = super.patch(update);
    let { source } = update;

    const relevance = this.patchableNumber(update, 'relevance', 0, 1);
    
    if (relevance != null && relevance !== this.relevance) {
      changed.relevance = this.relevance;
      this.relevance = relevance;
    }
    if (typeof source === 'string' && source !== this.source) {
      changed.source = this.source;
      this.source = source;
    }

    return changed;
  }

  /**
   * Return array of strings to be presented as a TUI row
   */
  override tuiRowStrings(cfg: ListItemStringCfg = {}): string[] {
    const msg = 't2k.tuiRowStrings';
    let { id, name, summary, relevance, source = '' } = this;
    let {
      theme=NameFormaTheme.shared, itemId = id.timeId(), bullet
    } = cfg;

    let linkId = theme.nfLink(itemId);
    const sep = theme.nfBoundary(UBAR);
    let row = [
      linkId,
      [relevance.toFixed(1), name, summary, source].join(sep),
    ];
    if (bullet) {
      row.unshift(bullet);
    }
    return row;
  }
}
