import { Forma, type Constructor } from './forma.js';
import UUID64 from './uuid64.js';
import { Identifiable, type FuzzyId } from './identifiable.js';

const MIN_FUZZY_ID = 5;

/**
 * IReadOnlyNamespace - Read-only interface for UI and agent code.
 * Provides iteration and lookup of Forma within a namespace with masked FuzzyIds.
 */
export interface IReadOnlyNamespace {
  /**
   * Iterator yields [FuzzyId, Forma] tuples for UI rendering.
   */
  [Symbol.iterator](): Iterator<[FuzzyId, Forma]>;

  /**
   * Retrieve a Forma instance by fuzzy ID match.
   * @param fuzzyId - The fuzzy ID to match (full UUID64, partial, or fuzzy)
   * @returns The matching Forma, or undefined if not found or ambiguous
   */
  getForma(fuzzyId: FuzzyId): Forma | undefined;

  /**
   * Generate the masked FuzzyId for an ID in this namespace.
   * @param idInput - UUID64 instance or base64 string
   * @returns The computed FuzzyId, or the input if not in namespace
   */
  fuzzyIdOf(idInput: UUID64 | string): FuzzyId;

  findByClass<T extends Forma, C extends Constructor<T>>(
    targetClass: C,
    filter?: (element: T) => boolean,
  ): Generator<InstanceType<C>>;
}

/**
 * IMutableNamespace - Mutable interface for internal namespace management.
 * Extends IReadOnlyNamespace with write operations.
 */
export interface IMutableNamespace extends IReadOnlyNamespace {
  /**
   * Add a Forma instance to this namespace.
   */
  addForma(forma: Forma): void;

  /**
   * Remove a Forma instance from this namespace by fuzzy ID match.
   */
  removeForma(fuzzyId: FuzzyId): Forma | undefined;
}

/**
 * FuzzyNamespace - A namespace that maps Forma objects with their FuzzyID
 *
 * Supports low-entropy UI (LEUI) by computing minimal unique FuzzyIds for set members.
 * In practice, FuzzyIds are a unique and tiny (e.g., 5-6 characters) subset
 * of the high-entropy 32 chars for a GUID. FuzzyIds are only unique within
 * their namespace. Although primarily useful for LEUI, FuzzyNamespaces also
 * are an important resource for agents in discovery since they define a
 * "working set of objects".
 *
 * Design:
 * - Stores Forma objects in an internal set
 * - Caches computed FuzzyIds (Map: forma.id → FuzzyId)
 * - Invalidates cache when set mutates
 * - Iterator yields [FuzzyId, Forma] tuples for UI rendering
 */
export class FuzzyNamespace implements IMutableNamespace {
  #formas: Forma[] = [];
  #fuzzyIdCache: Map<string, FuzzyId> = new Map();
  #cachedPrefixLen: number | null = null;
  #cachedSuffixLen: number | null = null;

  constructor(that?: FuzzyNamespace) {
    if (that) {
      this.#formas = [...that.#formas];
      this.#fuzzyIdCache = new Map(that.#fuzzyIdCache);
      this.#cachedPrefixLen = that.#cachedPrefixLen;
      this.#cachedSuffixLen = that.#cachedSuffixLen;
    }
  }

  /**
   * Add a Forma instance to this namespace.
   * Replaces any existing entry with the same exact id (last write wins) —
   * a namespace must never hold two entries for one id.
   * Invalidates cached FuzzyIds.
   * @param forma - The Forma instance to add.
   */
  addForma(forma: Forma): void {
    const idStr = forma.id.base64;
    const existingIndex = this.#formas.findIndex(
      (f) => f.id.base64 === idStr,
    );
    if (existingIndex !== -1) {
      this.#formas.splice(existingIndex, 1);
    }
    this.#formas.push(forma);
    this.#invalidateCache();
  }

  /**
   * Remove a Forma instance from this namespace by fuzzy ID match.
   * @param fuzzyId - The fuzzy ID to match
   * @returns The removed Forma, or undefined if not found
   */
  removeForma(fuzzyId: FuzzyId): Forma | undefined {
    const index = this.#findIndex(fuzzyId);
    if (index === -1) return undefined;
    const removed = this.#formas.splice(index, 1)[0];
    this.#invalidateCache();
    return removed;
  }

  /**
   * Retrieve a Forma instance from this namespace by fuzzy ID match.
   * Matches against forma.id.base64 using Levenshtein distance.
   * Masked fuzzyIds work via levenshtein: a 5-char masked ID allows ~5 edits against base64 prefix.
   * @param fuzzyId - The fuzzy ID to match (full UUID64, partial, masked, or fuzzy)
   * @returns The matching Forma
   * @throws Error if ambiguous (multiple matches) or not found
   */
  getForma(fuzzyId: FuzzyId): Forma | undefined {
    const formas = this.#formas;
    // TimeId filter exact match of fuzzyIdOf
    const timeIdMatches = formas.filter((f) =>
      f.id.timeId().includes(fuzzyId),
    );
    if (timeIdMatches.length === 1) {
      return timeIdMatches[0];
    }

    // Base64 substring match for partial IDs (e.g., "SXi002" in "0P-p-SXi002wdytaL0tJ7W")
    const base64Matches = formas.filter((f) =>
      f.id.base64.includes(fuzzyId),
    );
    if (base64Matches.length === 1) {
      return base64Matches[0];
    }
    if (base64Matches.length > 1) {
      const ids = base64Matches.map((m) => m.id.base64).join(', ');
      throw new Error(
        `getForma: ambiguous match for "${fuzzyId}": found ${base64Matches.length} matches [${ids}]`,
      );
    }

    // User generated fuzzyId may result in multiple matches
    const filter = Identifiable.idFilter(fuzzyId);
    const matches = this.#formas.filter((forma) =>
      filter(forma.id.base64),
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const ids = matches.map((m) => m.id.base64).join(', ');
      throw new Error(
        `getForma: ambiguous match for "${fuzzyId}": found ${matches.length} matches [${ids}]`,
      );
    }
    return undefined;
  }

  /**
   * Generate the masked FuzzyId for an ID in this namespace.
   * @param idInput - UUID64 instance or base64 string
   * @returns The computed FuzzyId, or the input if not in namespace
   */
  fuzzyIdOf(idInput: UUID64 | string): FuzzyId {
    const idStr = typeof idInput === 'string' ? idInput : idInput.base64;

    // Return unchanged if not in this namespace
    const exists = this.#formas.some((f) => f.id.base64 === idStr);
    if (!exists) return idStr;

    if (this.#fuzzyIdCache.has(idStr)) {
      return this.#fuzzyIdCache.get(idStr)!;
    }

    // Compute prefix/suffix if not cached
    if (this.#cachedPrefixLen === null || this.#cachedSuffixLen === null) {
      this.#computePrefixSuffixLengths();
    }

    // Mask the FuzzyId
    const timeId = idStr.substring(0, UUID64.TIME_SEQ_CHARS);
    const endIndex = timeId.length - this.#cachedSuffixLen!;
    const masked = timeId.substring(this.#cachedPrefixLen!, endIndex);

    this.#fuzzyIdCache.set(idStr, masked);
    return masked;
  }

  /**
   * Invalidate cached prefix/suffix lengths when set mutates.
   */
  #invalidateCache(): void {
    this.#fuzzyIdCache.clear();
    this.#cachedPrefixLen = null;
    this.#cachedSuffixLen = null;
  }

  /**
   * Compute and cache prefix/suffix lengths across all forma timeIds.
   * Ensures minimum FuzzyId length of MIN_FUZZY_ID characters.
   * Current implementation is limited to timeId(), but could
   * be upgraded to use signature chars if necessary.
   */
  #computePrefixSuffixLengths(): void {
    const timeIds = this.#formas.map((forma) => forma.id.timeId());

    if (timeIds.length === 0) {
      this.#cachedPrefixLen = 0;
      this.#cachedSuffixLen = 0;
      return;
    }

    if (timeIds.length === 1) {
      const suffixLen = 2;
      const prefixLen = UUID64.TIME_SEQ_CHARS - MIN_FUZZY_ID - suffixLen;
      this.#cachedPrefixLen = prefixLen;
      this.#cachedSuffixLen = suffixLen;
      return;
    }

    // Find common prefix
    let prefixLen = 0;
    for (let i = 0; i < UUID64.TIME_SEQ_CHARS; i++) {
      const char = timeIds[0][i];
      if (timeIds.every((id) => id[i] === char)) {
        prefixLen = i + 1;
      } else {
        break;
      }
    }

    // Find common suffix
    let suffixLen = 0;
    for (let i = 1; i <= UUID64.TIME_SEQ_CHARS - prefixLen; i++) {
      const char = timeIds[0][timeIds[0].length - i];
      if (timeIds.every((id) => id[id.length - i] === char)) {
        suffixLen = i;
      } else {
        break;
      }
    }

    // Ensure minimum FuzzyId length of MIN_FUZZY_ID
    const resultLen = UUID64.TIME_SEQ_CHARS - prefixLen - suffixLen;
    if (resultLen < MIN_FUZZY_ID) {
      const needed = MIN_FUZZY_ID - resultLen;
      if (suffixLen >= needed) {
        suffixLen -= needed;
      } else {
        prefixLen -= needed - suffixLen;
        suffixLen = 0;
      }
    }

    // Adjust prefix to avoid starting with "-" for any timeId
    while (prefixLen < UUID64.TIME_SEQ_CHARS) {
      if (timeIds.every((id) => id[prefixLen] !== '-')) {
        break;
      }
      prefixLen += 1;
    }

    this.#cachedPrefixLen = prefixLen;
    this.#cachedSuffixLen = suffixLen;
  }

  /**
   * Find index of Forma by fuzzy ID match.
   * @param fuzzyId - The fuzzy ID to match
   * @returns Index or -1 if not found
   */
  #findIndex(fuzzyId: FuzzyId): number {
    const filter = Identifiable.idFilter(fuzzyId);
    return this.#formas.findIndex((forma) => filter(forma.id.base64));
  }

  /**
   * Iterator yields [FuzzyId, Forma] tuples for UI rendering.
   * Both the masked ID and forma are available in a single pass.
   */
  [Symbol.iterator](): Iterator<[FuzzyId, Forma]> {
    const formas = this.#formas;
    let index = 0;
    const self = this;

    return {
      next(): IteratorResult<[FuzzyId, Forma]> {
        if (index < formas.length) {
          const forma = formas[index++];
          return {
            value: [self.fuzzyIdOf(forma.id), forma],
            done: false,
          };
        }
        return { done: true, value: undefined };
      },
    };
  }

  *findByClass<T extends Forma, C extends Constructor<T>>(
    targetClass: C,
    filter?: (element: T) => boolean,
  ): Generator<InstanceType<C>> {
    const resolvedFilter = filter ?? (() => true);
    for (const item of this.#formas) {
      if (
        item instanceof (targetClass as Function) &&
        resolvedFilter(item as T)
      ) {
        yield item as InstanceType<C>;
      }
    }
  }
}

/**
 * Check if a value is a record (not an array, not null).
 */
function isRecord(value: any): boolean {
  return (
    value !== null && typeof value === 'object' && !Array.isArray(value)
  );
}

/**
 * Return a copy of obj with `zid` siblings inserted before every `id` field,
 * at any depth. Non-mutating; the original is unchanged.
 * @param obj - Source value (record, array, or leaf)
 * @param cfg.namespace - Supplies fuzzyIdOf() for each id found
 * @returns Copy with zid fields inserted next to id fields
 */
export function zidify(
  obj: any,
  cfg: { namespace: IReadOnlyNamespace },
): any {
  const { namespace } = cfg;
  if (Array.isArray(obj)) {
    return obj.map((v) => zidify(v, cfg));
  }
  if (!isRecord(obj)) {
    return obj;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id') {
      result.zid = namespace.fuzzyIdOf(value as any);
    }
    result[key] = zidify(value, cfg);
  }
  return result;
}
