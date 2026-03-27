import UUID64 from './uuid64.js';
import { Text } from '@sc-voice/tools';
import { Levenshtein } from '@sc-voice/tools/dist/text/levenshtein.js';

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
 * - FormaCollection.getItem(fuzzyId)
 * - world.loadFuzzy(EntityClass, fuzzyId)
 * - CLI commands accepting partial IDs
 *
 * Fuzzy matching uses Levenshtein distance with default tolerance of fuzzyId.length.
 * For stricter matching or custom tolerance, use items(filter) with Identifiable.idFilter().
 */
export type FuzzyId = string;

/**
 * Identifiable - Base class for entities with UUID64 ids
 *
 * ## Overview
 * - Provides UUID64 generation and validation
 * - Immutable `id` property with getter
 * - Static methods: `uuid()`, `uuidToTime()`, `fromString()`, `validate()`
 *
 * ## Class Hierarchy
 * Identifiable is the base for:
 * - Forma (adds mutable name, patching, validation)
 * - Task extends Forma (adds title, progress, duration)
 * - Clock extends Forma (adds timing/scheduling)
 * - Patch (adds patch application logic)
 *
 * ## Design Rationale
 *
 * 1. ID STORAGE: #id is a UUID64 POJO (not string)
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
export class Identifiable {
  #id: UUID64;

  /**
   * Constructor accepts UUID64 instance, string, Avro deserialized buffer, or default new UUID64.
   * @param cfg - UUID64 instance, OPB64/UUID string, Avro record with uuidv7 Buffer, or undefined (generates new)
   * @throws Error if cfg is invalid type
   *
   * Handles three input modes:
   * 1. String (OPB64 or UUID): Validated via UUID64.fromString()
   * 2. UUID64 instance: Used directly (trusted)
   * 3. Avro deserialized record: Reconstructed from uuidv7 Buffer
   */
  constructor(cfg: UUID64 | string | any = new UUID64()) {
    let uuid64Id: UUID64;

    if (typeof cfg === 'string') {
      // String input: validate and reconstruct from OPB64 or UUID format
      uuid64Id = UUID64.fromString(cfg);
    } else if (cfg instanceof UUID64) {
      // UUID64 instance: use directly
      uuid64Id = cfg;
    } else if (cfg && typeof cfg === 'object' && (cfg as any).uuidv7 instanceof Buffer) {
      // Avro deserialized UUID64 record: has uuidv7 Buffer but isn't our UUID64 class
      uuid64Id = UUID64.fromBuffer((cfg as any).uuidv7);
    } else {
      throw new Error(`Identifiable constructor: invalid cfg type`);
    }

    this.#id = uuid64Id;

    Object.defineProperty(this, 'id', {
      enumerable: true,
      get() {
        return this.#id;
      },
    });
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
    ignoreCase: boolean = true
  ): (itemId: string) => boolean {
    if (levenshtein === undefined) {
      levenshtein = fuzzyId.length;
    }

    if (levenshtein < 1 || levenshtein > UUID64.CHARS) {
      throw new Error(`idFilter: levenshtein out of range: ${levenshtein}`);
    }

    const normalizedSearchId = ignoreCase ? fuzzyId.toLowerCase() : fuzzyId;

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

      const distance = Levenshtein.distance(normalizedSearchId, compareStr);
      return distance <= maxDistance;
    };
  }

  /**
   * Immutable id property - exposes UUID64 POJO with all its methods.
   * @returns UUID64 instance with methods like .toTime(), .toBuffer(), .base64
   */
  get id(): UUID64 {
    return this.#id;
  }
}
