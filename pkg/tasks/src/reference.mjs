import crypto from 'crypto';

/**
 * Reference - represents a documentation link or note with relevance scoring
 */
export class Reference {
  /**
   * @param {Object} options
   * @param {string} [options.text] - Optional note text
   * @param {URL|string} [options.url] - Optional URL (can be URL object or string)
   * @param {number} [options.relevance=0.5] - Relevance score (clamped to 0-1)
   */
  constructor({ text = null, url = null, relevance = 0.5 } = {}) {
    this.text = text;
    this.url = url ? (typeof url === 'string' ? new URL(url) : url) : null;
    this.relevance = Math.max(0, Math.min(1, relevance)); // Clamp to 0...1
  }

  /**
   * Computed id: first 4 chars of MD5 hash of text (if present) or url (if present)
   * @returns {string}
   */
  get id() {
    const content = this.text ?? this.url?.href ?? '';
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return hash.substring(0, 4);
  }

  /**
   * Convert to JSON-serializable object
   * @returns {Object}
   */
  toJSON() {
    return {
      text: this.text,
      url: this.url?.href ?? this.url,
      relevance: this.relevance
    };
  }

  /**
   * Create Reference from JSON data
   * @param {Object} data
   * @returns {Reference}
   */
  static fromJSON(data) {
    return new Reference({
      text: data.text,
      url: data.url,
      relevance: data.relevance ?? 0.5
    });
  }
}
