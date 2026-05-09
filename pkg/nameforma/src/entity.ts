import { Forma } from './forma.js';
import { Task } from './task.js';

/**
 * Entity interface - Contract for persistent entities in World
 * All entities must extend Forma
 */
export interface Entity extends Forma {
  patch(updates: any): void;
}

export interface EntityConstructor {
  entity: string;
  avroSchema: any;
  fromJson(data: any): Entity;
}

/**
 * Verify class implements Entity contract
 */
export function validateEntity(
  EntityClass: any,
): EntityClass is EntityConstructor {
  if (!EntityClass.entity) {
    throw new Error(`${EntityClass.name} missing static entity property`);
  }
  if (!EntityClass.avroSchema) {
    throw new Error(
      `${EntityClass.name} missing static avroSchema property`,
    );
  }
  if (typeof EntityClass.fromJson !== 'function') {
    throw new Error(`${EntityClass.name} missing static fromJson method`);
  }
  return true;
}

/**
 * Standard entities registered by default in World
 */
export const STANDARD_ENTITIES: EntityConstructor[] = [Task];
