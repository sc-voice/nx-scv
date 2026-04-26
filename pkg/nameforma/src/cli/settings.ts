/**
 * CLI Settings - holds runtime configuration
 */
import { IS_CLAUDE } from './env.js';

export class Settings {
  isAgent: boolean;

  constructor(options?: { isAgent?: boolean }) {
    this.isAgent = options?.isAgent !== undefined ? options.isAgent : IS_CLAUDE;
  }
}

export const settings = new Settings();
