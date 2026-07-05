import { NavigableView } from './navigable-view.js';
import { Forma } from './forma.js';
import type { IRegistry } from './registry.js';

/**
 * IView implementation for viewing a specific Entity.
 * Anchor is the Entity (e.g., Task), pivot semantics not yet in effect.
 */
export class EntityView extends NavigableView {
  constructor(entity: IRegistry) {
    super();
    this._anchor = entity;
    this._pivot = entity as Forma;
  }

  override setPivot(value: Forma): void {
    throw new Error('setPivot not yet supported in EntityView');
  }
}
