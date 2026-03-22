import UUID64 from './uuid64.js';

/**
 * Entity interface - Contract for persistent entities in World
 */
export interface Entity {
  id: UUID64;
  patch(updates: any): void;
}

export interface EntityConstructor {
  entity: string;
  SCHEMA: any;
  new (cfg?: any): Entity;
}

/**
 * Verify class implements Entity contract
 */
export function validateEntity(EntityClass: any): EntityClass is EntityConstructor {
  if (!EntityClass.entity) {
    throw new Error(`${EntityClass.name} missing static entity property`);
  }
  if (!EntityClass.SCHEMA) {
    throw new Error(`${EntityClass.name} missing static SCHEMA property`);
  }
  return true;
}
