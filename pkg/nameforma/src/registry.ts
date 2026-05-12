import { Forma } from './forma.js';
import { type IFuzzyNamespace } from './fuzzy-namespace.js';

/**
 * IRegistry - Unified contract for entities that manage resources
 *
 * Consolidates overlapping architectural patterns:
 * - Forma identity and rendering (extends Forma)
 * - Namespace management
 * - Event handling (from IEventBus) - to be added
 * - Patching (from IEntity) - to be added
 *
 * Single responsibility: Registry is the authority for a domain of Forma objects.
 * Callers depend on IRegistry (not specific implementations like World or Task).
 */
export interface IRegistry extends Forma {
  /**
   * Returns the FuzzyNamespace managed by this registry.
   * Callers receive the read-only IFuzzyNamespace interface.
   */
  namespace(): IFuzzyNamespace;
}
