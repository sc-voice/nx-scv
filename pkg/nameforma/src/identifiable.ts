import UUID64 from './uuid64.js';
import { Text } from '@sc-voice/tools';

const { ColorConsole, Unicode } = Text;
const { CHECKMARK: UOK } = Unicode;
const { cc } = ColorConsole;

/**
 * Identifiable - Base class for entities with UUID64 ids
 *
 * DESIGN:
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

  static validate(id: string): boolean {
    return UUID64.validate(id);
  }

  get id(): UUID64 {
    return this.#id;
  }
}
