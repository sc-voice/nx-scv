import type { FuzzyId } from './identifiable.js';

/**
 * Command - Abstract base class for mutation commands
 * Carries data about a mutation operation to be applied to an IMutable instance.
 * IMutable implementations inspect the command type and properties to apply mutations.
 */
export abstract class Command {
  public id: FuzzyId;
  public value: any;

  constructor(id: FuzzyId, value: any) {
    this.id = id;
    this.value = value;
  }
}

/**
 * SetCommand - Set one or more fields to new values
 * Value is a Record of field:value pairs for atomic multi-field updates.
 */
export class SetCommand extends Command {
  public override value: Record<string, any>;

  constructor(id: FuzzyId, value: Record<string, any>) {
    super(id, value);
    this.value = value;
  }
}

/**
 * PushCommand - Append a value to an array field
 * Value is a Record with field:valueToAppend pair.
 */
export class PushCommand extends Command {
  public override value: Record<string, any>;

  constructor(id: FuzzyId, value: Record<string, any>) {
    super(id, value);
    this.value = value;
  }
}

/**
 * PopCommand - Remove element at index from an array field
 * Value is a Record with field:index pair. Index: positive from start (0=first), negative from end (-1=last).
 */
export class PopCommand extends Command {
  public override value: Record<string, number>;

  constructor(id: FuzzyId, value: Record<string, number>) {
    super(id, value);
    this.value = value;
  }
}

/**
 * ICommandMutable - Interface for single-command mutations
 * Implementations inspect the command type and apply the mutation.
 * Return value is implementation-specific (may be delta, null, or other data).
 */
export interface ICommandMutable {
  applyCommand(cmd: Command): any;
}

/**
 * Mutator - Translates transactional JSON into Command instances
 * Top-level operators: $set, $push, $pop. Throws on unknown operators.
 */
export class Mutator {
  private readonly _commands: Command[];

  private constructor(commands: Command[] = []) {
    this._commands = commands;
  }

  get commands(): readonly Command[] {
    return this._commands;
  }

  private static isRecord(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  static fromJson(json: any): Mutator {
    const ctx = 'Mutator.fromJson';
    if (!json || typeof json !== 'object') {
      throw new Error('Mutator.fromJson: input must be a non-null object');
    }

    const id = json.id;
    if (!id) {
      throw new Error('Mutator.fromJson: id field is required');
    }

    const commands: Command[] = [];
    const operators = ['$set', '$push', '$pop'];
    const implicitSet: Record<string, any> = {};
    let explicitSet: Record<string, any> | undefined;

    for (const [key, value] of Object.entries(json)) {
      if (key === 'id') continue;

      if (key.startsWith('$')) {
        if (!operators.includes(key)) {
          throw new Error(`Mutator.fromJson: unknown operator "${key}"`);
        }

        if (key === '$set') {
          explicitSet = value as Record<string, any>;
        } else if (key === '$push') {
          // IMutator will validate value
          commands.push(new PushCommand(id, value as any));
        } else if (key === '$pop') {
          if (!Mutator.isRecord(value)) {
            throw new Error(
              'Mutator.fromJson: $pop value must be an object',
            );
          }
          for (const [field, index] of Object.entries(
            value as Record<string, unknown>,
          )) {
            if (typeof index !== 'number') {
              throw new Error(
                `${ctx}: expected number $pop.${field} index: ${index}`,
              );
            }
          }
          commands.push(
            new PopCommand(id, value as Record<string, number>),
          );
        }
      } else {
        implicitSet[key] = value;
      }
    }

    if (explicitSet || Object.keys(implicitSet).length > 0) {
      const merged = { ...(explicitSet ?? {}) };
      for (const [field, value] of Object.entries(implicitSet)) {
        if (field in merged) {
          throw new Error(
            `${ctx}: field "${field}" set both explicitly and implicitly`,
          );
        }
        merged[field] = value;
      }
      commands.push(new SetCommand(id, merged));
    }

    // Validate for field conflicts across commands
    const fieldsSeen = new Set<string>();
    for (const cmd of commands) {
      if (cmd.value && typeof cmd.value === 'object') {
        for (const field of Object.keys(cmd.value)) {
          if (fieldsSeen.has(field)) {
            throw new Error(
              `${ctx}: field "${field}" modified by multiple commands`,
            );
          }
          fieldsSeen.add(field);
        }
      }
    }

    return new Mutator(commands);
  }
}
