// ============================================================================
// Levenshtein Distance - Calculates the minimum edit distance between strings
// ============================================================================

export class Levenshtein {
  /**
   * Calculates the Levenshtein distance between two strings.
   * The distance is the minimum number of single-character edits
   * (insertions, deletions, substitutions) required to change one
   * string into the other.
   *
   * @param a First string
   * @param b Second string
   * @returns The Levenshtein distance (non-negative integer)
   */
  static distance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Handle edge cases
    if (m === 0) return n;
    if (n === 0) return m;

    // Create distance matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first column and row
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          // Characters match: no operation needed
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          // Characters don't match: take minimum of three operations
          dp[i][j] =
            1 +
            Math.min(
              dp[i - 1][j], // deletion
              dp[i][j - 1], // insertion
              dp[i - 1][j - 1] // substitution
            );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculates the normalized Levenshtein distance between two strings.
   * Distance is normalized to a value between 0 and 1, where:
   * - 0 = identical strings
   * - 1 = completely different strings
   *
   * @param a First string
   * @param b Second string
   * @returns Normalized distance between 0 and 1
   */
  static normalizedDistance(a: string, b: string): number {
    const distance = this.distance(a, b);
    const maxLength = Math.max(a.length, b.length);

    if (maxLength === 0) return 0; // Both strings are empty
    return distance / maxLength;
  }
}
