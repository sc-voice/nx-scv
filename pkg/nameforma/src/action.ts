import UUID64 from './uuid64.js';
import { Forma } from './forma.js';
import { DBG } from './defines.js';
import { Schema } from './schema.js';

import { Text } from '@sc-voice/tools';
const { Unicode, ColorConsole } = Text;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { ACTION: A6N } = DBG;

export enum ActionStatus {
  plan = 'plan',
  spec = 'spec',
  work = 'work',
  test = 'test',
  manage = 'manage',
  done = 'done',
}

export const ActionTransitions: Record<ActionStatus, ActionStatus[]> = {
  [ActionStatus.plan]:   [ActionStatus.spec],
  [ActionStatus.spec]:   [ActionStatus.work, ActionStatus.test],
  [ActionStatus.work]:   [ActionStatus.test],
  [ActionStatus.test]:   [ActionStatus.work, ActionStatus.manage],
  [ActionStatus.manage]: [ActionStatus.plan, ActionStatus.done],
  [ActionStatus.done]:   [ActionStatus.manage],
};

/**
 * Action - A named task or action with status tracking
 *
 * @see doc/task-action.md
 *
 * ## Features
 * 1. **Status Tracking**: Tracks action state via mutable status field (see ActionStatus)
 * 2. **Avro Encoding**: Status encoded as enum in Avro schema
 * 3. **Inheritance**: Extends Forma for unique ID, name, and summary
 * 4. **Mutable Status**: Status can be updated via patch() method with validation
 */
export class Action extends Forma {
  status: ActionStatus;
  statusNote: string;

  constructor(cfg: any = {}) {
    const msg = 'a6n.ctor';
    const dbg = (A6N as any)?.CTOR;
    super(cfg);

    let { status = ActionStatus.plan, statusNote = '' } = cfg;
    this.status = status;
    this.statusNote = statusNote;

    dbg && cc.ok1(msg + UOK, { id: this.id, name: this.name, status });
  }

  /**
   * Register this class's avroSchema into the avro registry and return AvroType.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static override registerAvro(opts: any = {}) {
    const msg = "a4n.registerAvro";
    const dbg = DBG.SCHEMA.ALL;
    Forma.registerAvro(opts);

    let { fullName } = Action.avroSchema;
    dbg>1 && cc.ok(msg, "registerType:", fullName);
    let avroType = Schema.registerType(Action, opts);
    dbg && cc.ok1(msg, "schema:", fullName);
    return avroType
  }

  /**
   * Schema wrapper for Action avro schema record
   * @returns Schema
   */
  static override get avroSchema() {
    const formaSchema = Forma.avroSchema;
    return new Schema({
      name: 'Action',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...(formaSchema.fields || []),
        {
          name: 'status',
          type: {
            type: 'enum',
            name: 'ActionStatus',
            symbols: ['plan', 'spec', 'work', 'test', 'manage', 'done'],
          } as any,
        }, // mutable
        {
          name: 'statusNote',
          type: 'string',
          default: '',
        }, // mutable
      ],
    });
  }

  /**
   * Patch (merge) properties on this instance.
   * Updates mutable fields (name, summary, status, statusNote); immutable id is preserved.
   * @param cfg - Configuration object with properties to update
   * @throws {Error} If status transition is not permitted by ActionTransitions
   */
  override patch(cfg: any = {}) {
    const msg = 'a6n.patch';
    const dbg = (A6N as any)?.PATCH;
    super.patch(cfg);
    let { status = this.status, statusNote = this.statusNote } = cfg;
    if (status !== this.status) {
      const allowed = ActionTransitions[this.status as ActionStatus] || [];
      if (!allowed.includes(status)) {
        throw new Error(`${msg} invalid transition: ${this.status} → ${status}`);
      }
    }
    this.status = status as ActionStatus;
    this.statusNote = statusNote;
    dbg && cc.ok1(msg, { status, statusNote });
  }

  /**
   * Override tuiRowStrings to prepend status indicator
   */
  override tuiRowStrings(cfg: any = {}): string[] {
    let row = super.tuiRowStrings(cfg);
    let id = row.shift()!;
    return [id, this.status, ...row];
  }
}
