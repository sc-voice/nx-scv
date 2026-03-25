import UUID64 from './uuid64.js';
import { Forma, IFormaMatcher, LevenshteinMatcher } from './forma.js';
import { Levenshtein } from '@sc-voice/tools/dist/text/levenshtein.js';

/**
 * FormaArray - Typed array that finds elements by id
 */
export class FormaArray<T extends Forma> extends Array<T> {
  /**
   * Find element with highest similarity score
   * @param options - Either {pattern} for default fuzzy matching or {matcher} for custom matching
   * @returns Best matching element or undefined if array is empty
   * @throws Error if both or neither pattern/matcher provided
   */
  match(options: { pattern?: string; matcher?: IFormaMatcher<T> }): T | undefined {
    // Validate: exactly one must be provided
    const hasPattern = options.pattern !== undefined;
    const hasMatcher = options.matcher !== undefined;

    if (!hasPattern && !hasMatcher) {
      throw new Error('match() requires either pattern or matcher');
    }
    if (hasPattern && hasMatcher) {
      throw new Error('match() requires exactly one of pattern or matcher, not both');
    }

    if (this.length === 0) return undefined;

    const matcher = options.matcher ?? new LevenshteinMatcher<T>(options.pattern!);

    let bestItem: T | undefined = undefined;
    let maxSimilarity = -1;

    for (const item of this) {
      const sim = matcher.similarity(item);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestItem = item;
      }
    }

    return bestItem;
  }

  /**
   * Find element by id with optional fuzzy matching via Levenshtein distance.
   *
   * UUID64 base64 structure (UUID64.CHARS total):
   * - First UUID64.TIME_SEQ_CHARS chars: 48-bit timestamp + 12-bit sequence
   * - Last chars: random data
   *
   * @param id - The id to search for (can be partial or mutated string)
   * @param levenshtein - Optional fuzzy matching parameter:
   *   - undefined: Exact match on full UUID64.CHARS-char base64
   *   - 1 to UUID64.TIME_SEQ_CHARS: Fuzzy match on first UUID64.TIME_SEQ_CHARS chars
   *     max allowed distance = UUID64.TIME_SEQ_CHARS - levenshtein
   *   - (UUID64.TIME_SEQ_CHARS + 1) to UUID64.CHARS: Fuzzy match on full UUID64.CHARS chars
   *     max allowed distance = UUID64.CHARS - levenshtein
   *   - null, 0, negative, >UUID64.CHARS: Throws error (reserved for future use)
   * @param ignoreCase - If true (default), comparison is case-insensitive
   *
   * @returns First element matching the id with allowed distance, or undefined if not found
   * @throws Error if levenshtein is out of range
   */
  matchId(id: string, levenshtein?: number, ignoreCase: boolean = true): T | undefined {
    if (levenshtein !== undefined) {
      if (levenshtein < 1 || levenshtein > UUID64.CHARS) {
        throw new Error(`levenshtein out of range: ${levenshtein}`);
      }
    }

    const searchId = ignoreCase ? id.toLowerCase() : id;

    return this.find(item => {
      const itemId = item.id;
      let itemIdStr = typeof itemId === 'string' ? itemId : itemId.base64;
      itemIdStr = ignoreCase ? itemIdStr.toLowerCase() : itemIdStr;

      if (levenshtein === undefined) {
        // Exact match on full base64
        return itemIdStr === searchId;
      }

      let compareStr: string;
      let maxDistance: number;

      if (levenshtein >= 1 && levenshtein <= UUID64.TIME_SEQ_CHARS) {
        // Fuzzy match on first UUID64.TIME_SEQ_CHARS chars (time/sequence)
        compareStr = itemIdStr.substring(0, UUID64.TIME_SEQ_CHARS);
        maxDistance = UUID64.TIME_SEQ_CHARS - levenshtein;
      } else {
        // Fuzzy match on full UUID64.CHARS chars
        compareStr = itemIdStr;
        maxDistance = UUID64.CHARS - levenshtein;
      }

      const distance = Levenshtein.distance(searchId, compareStr);
      return distance <= maxDistance;
    });
  }
}
