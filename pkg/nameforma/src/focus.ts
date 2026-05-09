import UUID64 from './uuid64.js';
import { Forma } from './forma.js';
import { Schema } from './schema.js';
import { DBG } from './defines.js';

const { FORMA: F3A } = DBG;

/**
 * Focus - Represents a user's focus on an object in the focus stack
 *
 * Each Focus entry has its own unique UUID64 (related to the object id)
 * and captures the object's name/summary at focus time.
 *
 * Properties:
 * - id: own unique UUID64, related to formaId
 * - formaId: UUID64 of the entity being focused (the object of focus)
 * - formaType: type name of the object entity (e.g., 'task')
 * - name, summary: copied from object entity at focus time
 */
export class Focus extends Forma {
  formaId: UUID64;
  formaType: string;

  constructor(cfg: any = {}) {
    super(cfg);
    this.formaId = cfg.formaId;
    this.formaType = cfg.formaType;
  }

  static entity = 'focus';

  static override get avroSchema(): Schema {
    const formaSchema = Forma.avroSchema;
    return new Schema({
      name: 'Focus',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...(formaSchema.fields || []),
        { name: 'formaId', type: (UUID64.avroSchema as any).fullName },
        { name: 'formaType', type: 'string' },
      ],
    });
  }

  static fromJson(data: any): Focus {
    // Reconstruct formaId as UUID64 if it's a string
    if (data.formaId && typeof data.formaId === 'string') {
      data.formaId = UUID64.fromString(data.formaId);
    }
    return new Focus(data);
  }

  /**
   * Create a Focus entry from an object entity
   * @param {Forma} objectEntity - Entity to focus (the object of focus)
   * @returns {Focus} - New Focus instance with related id
   */
  static fromEntity(objectEntity: any): Focus {
    const formaId = objectEntity.id;
    const formaType =
      (objectEntity.constructor as any).entity ||
      objectEntity.constructor.name;

    // Create Focus id as related to object id
    const focusId = UUID64.createRelatedId(formaId);

    return new Focus({
      id: focusId,
      formaId,
      formaType,
      name: objectEntity.name,
      summary: objectEntity.summary,
    });
  }
}
