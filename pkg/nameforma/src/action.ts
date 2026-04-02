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
  todo = 'todo',
  done = 'done',
}

/**
 * Action - A named task or action with status tracking
 *
 * ## Features
 * 1. **Status Tracking**: Tracks action state (todo, done) via mutable status field
 * 2. **Avro Encoding**: Status encoded as enum (0="todo", 1="done") in Avro schema
 * 3. **Inheritance**: Extends Forma for unique ID, name, and summary
 * 4. **Mutable Status**: Status can be updated via patch() method with validation
 */
export class Action extends Forma {
  status: ActionStatus;

  constructor(cfg: any = {}) {
    const msg = 'a6n.ctor';
    const dbg = (A6N as any)?.CTOR;
    super(cfg);

    let { status = ActionStatus.todo } = cfg;
    this.status = status;

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
    dbg && cc.ok(msg, "registerType:", fullName);
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
            symbols: ['todo', 'done'],
          } as any,
        }, // mutable
      ],
    });
  }

  /**
   * Patch (merge) properties on this instance.
   * Updates mutable fields (name, summary, status); immutable id is preserved.
   * @param cfg - Configuration object with properties to update
   * @throws {Error} If status is not 'todo' or 'done'
   */
  override patch(cfg: any = {}) {
    const msg = 'a6n.patch';
    const dbg = (A6N as any)?.PATCH;
    super.patch(cfg);
    let { status = this.status } = cfg;
    const validStatuses = Object.values(ActionStatus);
    if (!validStatuses.includes(status)) {
      throw new Error(`${msg} invalid status: ${status}`);
    }
    this.status = status as ActionStatus;
    dbg && cc.ok1(msg, { status });
  }
}
