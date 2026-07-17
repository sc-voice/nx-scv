import { Forma } from './forma.js';
import { type IReadOnlyNamespace } from './fuzzy-namespace.js';

/**
 * IRegistry - Unified contract for entities that manage resources
 *
 * A registry is the authority for a domain of Forma objects.
 * @see World, Task
 */
export interface IRegistry extends Forma {
  /** Returns the read-only namespace managed by this registry.  */
  readonly namespace: IReadOnlyNamespace;
}
