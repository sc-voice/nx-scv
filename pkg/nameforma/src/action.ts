import UUID64 from './uuid64.js';
import { Forma } from './forma.js';
import { DBG } from './defines.js';
import { Schema } from './schema.js';
import { Unicode, ColorConsole } from '@sc-voice/tools/text';

const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { LIGHT_VERTICAL_BAR: UBAR } = Unicode;
const { ACTION: A6N } = DBG;

export enum ActionStatus {
  req = 'req',
  spec = 'spec',
  work = 'work',
  test = 'test',
  manage = 'manage',
  done = 'done',
}

export const ActionTransitions: Record<ActionStatus, ActionStatus[]> = {
  [ActionStatus.req]:    [ActionStatus.spec, ActionStatus.done],
  [ActionStatus.spec]:   [ActionStatus.work, ActionStatus.test],
  [ActionStatus.work]:   [ActionStatus.test],
  [ActionStatus.test]:   [ActionStatus.work, ActionStatus.manage],
  [ActionStatus.manage]: [ActionStatus.req, ActionStatus.done],
  [ActionStatus.done]:   [ActionStatus.manage],
};

export const STATUS_ORDER: Record<ActionStatus, number> = {
  [ActionStatus.req]: 1,
  [ActionStatus.spec]: 2,
  [ActionStatus.work]: 3,
  [ActionStatus.test]: 4,
  [ActionStatus.manage]: 5,
  [ActionStatus.done]: 6,
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

    let { status = ActionStatus.req, statusNote = '' } = cfg;
    // Read-time compat: map legacy 'plan' status to 'req'
    if (status === 'plan') {
      status = ActionStatus.req;
    }
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
            symbols: ['req', 'spec', 'work', 'test', 'manage', 'done'],
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
   * Override tuiRowStrings to prepend status indicator with color
   */
  override tuiRowStrings(cfg: any = {}): string[] {
    let row = super.tuiRowStrings(cfg);
    let id = row.shift()!;
    let statusNote = this.statusNote ? `(${this.statusNote})` : '';
    const { BRIGHT_GREEN, GREEN, BRIGHT_RED, MAGENTA, BLUE, NO_COLOR } = Unicode.LINUX_COLOR;
    const statusColor: Record<string, string> = {
      done: BRIGHT_GREEN, test: GREEN, manage: BRIGHT_RED,
      req: MAGENTA, spec: BLUE,
    };
    const c = statusColor[this.status] ?? '';
    const coloredStatus = c ? `${c}${this.status}${NO_COLOR}` : this.status;
    return [id, [coloredStatus,  ...row, statusNote].join(UBAR)];
  }
}
