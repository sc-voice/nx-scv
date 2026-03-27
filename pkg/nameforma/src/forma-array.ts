import UUID64 from './uuid64.js';
import { Forma, IFormaMatcher, LevenshteinMatcher } from './forma.js';
import { Levenshtein } from '@sc-voice/tools/dist/text/levenshtein.js';

/**
 * FormaArray - Utility class with static matching methods for Forma arrays
 *
 * Note: This is NOT an Array extension. Use FormaCollection for managed arrays.
 * This class provides static utility methods for searching/matching Forma items.
 */
export class FormaArray {
  /**
   * Find element with highest similarity score
   * @param items - Array of items to search
   * @param options - Either {pattern} for default fuzzy matching or {matcher} for custom matching
   * @returns Best matching element or undefined if array is empty
   * @throws Error if both or neither pattern/matcher provided
   */
  static match<T extends Forma>(
    items: T[],
    options: { pattern?: string; matcher?: IFormaMatcher<T> }
  ): T | undefined {
    // Validate: exactly one must be provided
    const hasPattern = options.pattern !== undefined;
    const hasMatcher = options.matcher !== undefined;

    if (!hasPattern && !hasMatcher) {
      throw new Error('match() requires either pattern or matcher');
    }
    if (hasPattern && hasMatcher) {
      throw new Error('match() requires exactly one of pattern or matcher, not both');
    }

    if (items.length === 0) return undefined;

    const matcher = options.matcher ?? new LevenshteinMatcher<T>(options.pattern!);

    let bestItem: T | undefined = undefined;
    let maxSimilarity = -1;

    for (const item of items) {
      const sim = matcher.similarity(item);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestItem = item;
      }
    }

    return bestItem;
  }

  /**
   * Create a filter function for id matching with fuzzy matching via Levenshtein distance.
   *
   * UUID64 base64 structure (UUID64.CHARS total):
   * - First UUID64.TIME_SEQ_CHARS chars: 48-bit timestamp + 12-bit sequence
   * - Last chars: random data
   *
   * @param searchId - The id to search for (can be partial or mutated string)
   * @param levenshtein - Optional fuzzy matching parameter (default: searchId.length):
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
    searchId: string,
    levenshtein?: number,
    ignoreCase: boolean = true
  ): (itemId: string) => boolean {
    // Default levenshtein to searchId length if not provided
    if (levenshtein === undefined) {
      levenshtein = searchId.length;
    }

    if (levenshtein < 1 || levenshtein > UUID64.CHARS) {
      throw new Error(`levenshtein out of range: ${levenshtein}`);
    }

    const normalizedSearchId = ignoreCase ? searchId.toLowerCase() : searchId;

    return (itemIdStr: string) => {
      let idStr = ignoreCase ? itemIdStr.toLowerCase() : itemIdStr;

      let compareStr: string;
      let maxDistance: number;

      if (levenshtein! >= 1 && levenshtein! <= UUID64.TIME_SEQ_CHARS) {
        // Fuzzy match on first UUID64.TIME_SEQ_CHARS chars (time/sequence)
        compareStr = idStr.substring(0, UUID64.TIME_SEQ_CHARS);
        maxDistance = UUID64.TIME_SEQ_CHARS - levenshtein!;
      } else {
        // Fuzzy match on full UUID64.CHARS chars
        compareStr = idStr;
        maxDistance = UUID64.CHARS - levenshtein!;
      }

      const distance = Levenshtein.distance(normalizedSearchId, compareStr);
      return distance <= maxDistance;
    };
  }

  /**
   * Find element by id with fuzzy matching via Levenshtein distance.
   *
   * @param items - Array of items to search
   * @param id - The id to search for (can be partial or mutated string)
   * @param levenshtein - Optional fuzzy matching parameter (default: id.length, see idFilter for details)
   * @param ignoreCase - If true (default), comparison is case-insensitive
   *
   * @returns First element matching the id with allowed distance, or undefined if not found
   * @throws Error if levenshtein is out of range
   */
  static matchId<T extends Forma>(
    items: T[],
    id: string,
    levenshtein?: number,
    ignoreCase: boolean = true
  ): T | undefined {
    const filter = FormaArray.idFilter(id, levenshtein, ignoreCase);
    return items.find(item => filter(item.id.base64));
  }
}
