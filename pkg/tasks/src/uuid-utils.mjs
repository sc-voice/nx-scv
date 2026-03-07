import { V7Generator } from 'uuidv7';

// Create a stateful generator for guaranteed monotonic ordering
const generator = new V7Generator();

/**
 * Convert UUID to URL-safe base64 string (full 24 chars)
 * Matches Swift implementation in Task.swift:300-320
 * @param {string} uuid - UUID string (with or without dashes)
 * @returns {string} URL-safe base64 encoded string
 */
export function uuidToBase64(uuid) {
  // Remove dashes from UUID
  const uuidString = uuid.replace(/-/g, '');

  // Convert hex string to bytes
  const bytes = [];
  for (let i = 0; i < uuidString.length; i += 2) {
    bytes.push(parseInt(uuidString.substr(i, 2), 16));
  }

  // Convert to base64 and make URL-safe
  const buffer = Buffer.from(bytes);
  return buffer.toString('base64')
    .replace(/=/g, '')   // Remove padding
    .replace(/\+/g, '-') // + → -
    .replace(/\//g, '_'); // / → _
}

/**
 * Convert UUID to filename (e.g., "T_AZvuCKoac")
 * Matches Swift implementation in Task.swift:294-297
 * @param {string} uuid - UUID string
 * @returns {string} Filename with T_ prefix and first 9 chars of base64
 */
export function uuidToFilename(uuid) {
  const base64 = uuidToBase64(uuid);
  return `T_${base64.substring(0, 9)}`;
}

/**
 * Generate short ID from UUID (8 chars from base64 encoding)
 * Matches Swift implementation in Task.swift:287-291
 * @param {string} [uuid] - Optional UUID string; generates new one if not provided
 * @returns {string} Short ID (8 characters)
 */
export function shortId(uuid = null) {
  const uuidStr = uuid || String(generator.generate());
  const base64 = uuidToBase64(uuidStr);
  return base64.substring(3, 11); // chars 3-10 inclusive (8 chars)
}
