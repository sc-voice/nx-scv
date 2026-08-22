import UUID64 from './uuid64.js';
import { Schema } from './schema.js';
import { Text } from '@sc-voice/tools';
import { Levenshtein } from '@sc-voice/tools/text';
import { ISchemaClass } from './schema.js';
import { DBG } from './defines.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { IReadOnlyNamespace } from './fuzzy-namespace.js';
import {
  MonoJSON,
  IMonoJSONFacade,
  MonoJSONBuilder,
} from './mono-json.js';
import {
  ZenoStep,
  ZENO_1_ROW_TERSE,
  ZENO_1_ROW_VERBOSE,
  ZENO_2_ROWS,
} from './navigable-view.js';

const { ColorConsole, Unicode } = Text;
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;

/**
 * FuzzyId - String ID for fuzzy matching against UUID64 identifiers
 *
 * FuzzyId can be:
 * - Full UUID64 base64 string (exact match)
 * - Partial UUID64 string (first N characters)
 * - Fuzzy variant with Levenshtein distance tolerance
 *
 * Used throughout nameforma for flexible ID resolution:
 * - await world.loadFuzzy(EntityClass, fuzzyId)
 * - CLI commands accepting partial IDs
 *
 * Fuzzy matching uses Levenshtein distance with default tolerance of fuzzyId.length.
 * For stricter matching or custom tolerance, use items(filter) with Identifiable.idFilter().
 */
export type FuzzyId = string;

/**
 * IdentifiableConfig - Configuration for Identifiable constructor
 */
export interface IdentifiableConfig {
  id?: UUID64 | string;
  $parentId?: UUID64 | string;
  uuidv7?: Buffer;
}

/**
 * Identifiable - Base class for entities with UUID64 ids
 *
 * ## Overview
 * - Provides UUID64 generation and validation
 * - Immutable readonly `id` property
 * - Supports parent-child id relationships via $parentId
 * - Static methods: `uuid()`, `uuidToTime()`, `fromString()`, `validate()`
 *
 * ## Class Hierarchy
 * Identifiable is the base for:
 * - Forma (adds mutable name, patching, validation)
 * - Task extends Forma (adds title, progress, duration)
 * - Clock extends Forma (adds timing/scheduling)
 *
 * ## Design Rationale
 *
 * 1. ID STORAGE: readonly id is a UUID64 POJO (not string)
 *    - Immutable after construction (write-once in constructor)
 *    - Provides valuable methods: .toTime(), .toBuffer(), .base64 property
 *    - When serialized to JSON, uuid64.toJSON() returns OPB64 string
 *    - POJO flexibility available to all subclasses
 *
 * 2. ID GENERATION vs VALIDATION:
 *    - Constructor default: new UUID64() instance, inherently valid
 *      UUID64 constructor guarantees monotonic, time-ordered UUIDs
 *      No validation needed—UUID64 output is safe by construction
 *    - fromString(id): Validates untrusted strings (from JSON/files)
 *      Uses UUID64.fromString(id) to reconstruct validated UUID64
 *      Throws Error if validation fails
 *    - $parentId: Creates child id with parent's signature via UUID64.createRelatedId()
 *      Enables parent-child relationships encoded in id structure
 *
 * 3. TYPE SAFETY:
 *    - Constructor requires UUID64 instance (branded at runtime)
 *    - TypeScript enforces UUID64 type at compile-time
 *    - Runtime: UUID64 instance is the guarantee, not a string type
 *
 * 4. SERIALIZATION ROUND-TRIP:
 *    - JSON.stringify(Identifiable) calls uuid64.toJSON() → OPB64 string
 *    - JSON.parse() returns id as string, fromString() reconstructs UUID64 POJO
 *    - Deserialized id has all UUID64 methods available
 */
export class Identifiable implements IMonoJSONFacade {
  static readonly AVRO_NAMESPACE = 'scvoice.nameforma';

  readonly forma: string;
  readonly id: UUID64;

  /**
   * Constructor accepts config with id and optional $parentId.
   * @param cfg - Configuration object with optional id, $parentId, uuidv7
   *   - id: UUID64 instance or OPB64/UUID string (uses existing id)
   *   - $parentId: UUID64 instance or string (creates child id with parent signature)
   *   - uuidv7: Buffer from Avro deserialization
   *   - If none provided: generates new UUID64
   * @throws Error if $parentId signature doesn't match resulting id
   */
  constructor(cfg: IdentifiableConfig = {}) {
    const { id, $parentId, uuidv7 } = cfg;
    let uuid64Id: UUID64;

    if (uuidv7 instanceof Buffer) {
      // Avro deserialized UUID64 record
      uuid64Id = UUID64.fromBuffer(uuidv7);
    } else if (id) {
      // Use provided id (UUID64 instance, string, or Buffer)
      if (typeof id === 'string') {
        uuid64Id = UUID64.fromString(id);
      } else if (id instanceof UUID64) {
        uuid64Id = id;
      } else if ((id as any) instanceof Buffer) {
        uuid64Id = UUID64.fromBuffer(id as Buffer);
      } else if ((id as any).uuidv7 instanceof Buffer) {
        // Avro deserialized UUID64: { uuidv7: Buffer }
        uuid64Id = UUID64.fromBuffer((id as any).uuidv7);
      } else {
        throw new Error(`Identifiable: invalid id type`);
      }
    } else if ($parentId) {
      // Create child id with parent's signature
      const parent =
        typeof $parentId === 'string'
          ? UUID64.fromString($parentId)
          : $parentId;
      uuid64Id = UUID64.createRelatedId(parent);
    } else {
      // Generate new independent id
      uuid64Id = new UUID64();
    }

    // Validate parent relationship if provided
    if ($parentId) {
      const parent =
        typeof $parentId === 'string'
          ? UUID64.fromString($parentId)
          : $parentId;
      if (uuid64Id.getSignature() !== parent.getSignature()) {
        throw new Error(
          `Identifiable: $parentId signature mismatch (${uuid64Id.getSignature()} vs ${parent.getSignature()})`,
        );
      }
    }

    this.forma = this.constructor.name;
    this.id = uuid64Id;
  }

  /**
   * Create an Identifiable instance from a UUID64 string (OPB64 or UUID format).
   * Validates and reconstructs the UUID64 POJO from string representation.
   *
   * @param id UUID64 string (OPB64 or UUID format)
   * @returns Identifiable instance with validated id as UUID64 POJO
   * @throws Error if id is invalid
   */
  static fromString(id: string): Identifiable {
    return new Identifiable(UUID64.fromString(id));
  }

  /**
   * @deprecated Use `new UUID64()` directly instead. This method is a redundant alias.
   */
  static uuid(): UUID64 {
    return new UUID64();
  }

  /**
   * Validate UUID v7 format (OPB64 or UUID string).
   * @param id - UUID string to validate
   * @returns true if valid UUID v7, false otherwise
   */
  static validate(id: string): boolean {
    return UUID64.validate(id);
  }

  /**
   * Convert a word to numeronym format.
   * Format: [first letter][count of middle letters][last letter]
   * Example: "NameForma" -> "n7a"
   *
   * @param word - The word to convert
   * @returns The numeronym string, or undefined if word cannot produce valid numeronym
   * @throws Error if word is less than 2 characters
   */
  static numeronym(word: string): string | undefined {
    if (!word || word.length < 2) {
      throw new Error('Word must be at least 2 characters long');
    }

    const first = word.charAt(0);
    const last = word.charAt(word.length - 1);
    const middleCount = word.length - 2;

    const numeronym = `${first}${middleCount}${last}`;

    // Return undefined if the result is not a valid numeronym
    if (!this.isNumeronym(numeronym)) {
      return undefined;
    }

    return numeronym;
  }

  /**
   * Check if a string is a valid numeronym.
   * Format: [uppercase letter][1+ digits][lowercase letter]
   * Example: "F13n" is a valid numeronym
   *
   * @param id - The string to check
   * @returns true if valid numeronym format, false otherwise
   */
  static isNumeronym(id: string): boolean {
    return /^[a-zA-Z]\d+[a-z]$/.test(id);
  }

  /**
   * Schema wrapper for Identifiable avro schema record
   * @returns Schema
   */
  static get avroSchema(): Schema {
    return new Schema({
      name: 'Identifiable',
      namespace: Identifiable.AVRO_NAMESPACE,
      type: 'record',
      fields: [{ name: 'id', type: UUID64.avroSchema.fullName }],
    });
  }

  get avroSchema(): Schema {
    return (this.constructor as typeof Identifiable).avroSchema;
  }

  /**
   * Register this class's avroSchema into the avro registry and return AvroType.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static registerAvro(opts: any = {}) {
    const msg = 'i10e.registerAvro';
    const dbg = DBG.SCHEMA.ALL;
    let { fullName } = Identifiable.avroSchema;
    dbg > 1 && cc.ok(msg, 'dependency:', 'UUID64');
    UUID64.registerAvro(opts);
    dbg > 1 && cc.ok(msg, 'registerType:', fullName);
    let avroType = Schema.registerType(Identifiable, opts);
    dbg && cc.ok1(msg, 'schema:', fullName);
    return avroType;
  }

  /**
   * Create a filter function for fuzzy ID matching with Levenshtein distance.
   *
   * UUID64 base64 structure (UUID64.CHARS total):
   * - First UUID64.TIME_SEQ_CHARS chars: 48-bit timestamp + 12-bit sequence
   * - Last chars: random data
   *
   * @param fuzzyId - The fuzzy ID to search for (can be partial or mutated string)
   * @param levenshtein - Optional fuzzy matching parameter (default: fuzzyId.length):
   *   - 1 to UUID64.TIME_SEQ_CHARS: Fuzzy match on first UUID64.TIME_SEQ_CHARS chars
   *     max allowed distance = UUID64.TIME_SEQ_CHARS - levenshtein
   *   - (UUID64.TIME_SEQ_CHARS + 1) to UUID64.CHARS: Fuzzy match on full UUID64.CHARS chars
   *     max allowed distance = UUID64.CHARS - levenshtein
   * @param ignoreCase - If true (default), comparison is case-insensitive
   *
   * @returns Filter function that returns true if base64 id string matches with allowed distance
   * @throws Error if levenshtein is out of range
   */
  static idFilter(
    fuzzyId: FuzzyId,
    levenshtein?: number,
    ignoreCase: boolean = true,
  ): (itemId: string) => boolean {
    if (levenshtein === undefined) {
      levenshtein = fuzzyId.length;
    }

    if (levenshtein < 1 || levenshtein > UUID64.CHARS) {
      throw new Error(
        `idFilter: levenshtein out of range: ${levenshtein}`,
      );
    }

    const normalizedSearchId = ignoreCase
      ? fuzzyId.toLowerCase()
      : fuzzyId;

    return (itemIdStr: string) => {
      let idStr = ignoreCase ? itemIdStr.toLowerCase() : itemIdStr;

      let compareStr: string;
      let maxDistance: number;

      if (levenshtein! >= 1 && levenshtein! <= UUID64.TIME_SEQ_CHARS) {
        compareStr = idStr.substring(0, UUID64.TIME_SEQ_CHARS);
        maxDistance = UUID64.TIME_SEQ_CHARS - levenshtein!;
      } else {
        compareStr = idStr;
        maxDistance = UUID64.CHARS - levenshtein!;
      }

      const distance = Levenshtein.distance(
        normalizedSearchId,
        compareStr,
      );
      return distance <= maxDistance;
    };
  }

  /** @returns class type name */
  static get typeName(): string {
    return (this as typeof Identifiable).avroSchema.name ?? 'typeName?';
  }

  /** @returns Instance type name */
  get typeName(): string {
    return (this.constructor as typeof Identifiable).typeName;
  }

  toMonoJSON(
    builder: MonoJSONBuilder,
    opts: Record<string, any>,
  ): MonoJSON {
    const {
      theme = NameFormaTheme.shared,
      zeno = ZENO_1_ROW_TERSE,
      namespace,
    } = opts;
    builder.reset({});
    const { id } = this;

    // id, zid
    const zid = (namespace && namespace.fuzzyIdOf(id)) || null;
    zid && builder.set('zid', theme.nfLink(zid));
    if (zid == null || zeno > ZENO_1_ROW_TERSE) {
      builder.set('id', theme.nfLink(id.base64));
    }

    return builder.build();
  } // toMonoJSON
} // Identifiable
