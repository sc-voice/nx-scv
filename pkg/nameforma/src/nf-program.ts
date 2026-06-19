import { World } from './world.js';
import { Forma } from './forma.js';
import type { FuzzyId } from './identifiable.js';

/**
 * NfProgram - Command orchestrator for nameforma operations
 * Encapsulates World and provides high-level methods for CLI commands
 */
export class NfProgram {
  constructor(private world: World) {}

  /**
   * Set a field value on a forma by resolving it and persisting via its entity
   * @param formaId - Fuzzy ID of the forma to update
   * @param fieldPath - Field to update (e.g., 'name', 'summary')
   * @param value - New value for the field
   * @returns The updated forma
   */
  setFieldValue(formaId: FuzzyId, fieldPath: string, value: any): Forma {
    const resolved = this.world.resolveFuzzyId(formaId);
    if (!resolved) {
      throw new Error(`Not found: ${formaId}`);
    }

    const { entity, forma } = resolved;
    forma.patch({ [fieldPath]: value });
    this.world.emit('change', {
      type: 'patch',
      item: forma,
      entity,
    });

    return forma;
  }
}
