import UUID64 from './uuid64.js';
import { Forma } from './forma.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { DBG } from './defines.js';
import { Schema } from './schema.js';
import { Unicode, ColorConsole } from '@sc-voice/tools/text';
import { ZENO_2_ROWS } from '@sc-voice/nameforma/unstable';
import { MonoJSONBuilder } from './mono-json.js';

const { cc } = ColorConsole;
const { RIGHT_ARROW: URAR, CHECKMARK: UOK } = Unicode;
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
  [ActionStatus.req]: [
    ActionStatus.spec,
    ActionStatus.done,
    ActionStatus.manage,
  ],
  [ActionStatus.spec]: [
    ActionStatus.work,
    ActionStatus.test,
    ActionStatus.manage,
    ActionStatus.req,
  ],
  [ActionStatus.work]: [
    ActionStatus.test,
    ActionStatus.manage,
    ActionStatus.spec,
  ],
  [ActionStatus.test]: [
    ActionStatus.work,
    ActionStatus.manage,
    ActionStatus.work,
  ],
  [ActionStatus.manage]: [
    ActionStatus.req,
    ActionStatus.spec,
    ActionStatus.work,
    ActionStatus.test,
    ActionStatus.done,
    ActionStatus.manage,
  ],
  [ActionStatus.done]: [ActionStatus.manage],
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
    super(cfg);

    let { status = ActionStatus.req, statusNote = '' } = cfg;
    // Read-time compat: map legacy 'plan' status to 'req'
    if (status === 'plan') {
      status = ActionStatus.req;
    }
    this.status = status;
    this.statusNote = statusNote;
  }

  /**
   * Re-instantiate with new content, preserving id.
   * IMPORTANT: subclasses MUST override
   * @param content - Object with properties to replace (name, summary, updateId, etc.)
   */
  override replace(content: Partial<Action> = {}): void {
    this._replaceFrom(new Action(content));
  }

  /**
   * Register this class's avroSchema into the avro registry and return AvroType.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static override registerAvro(opts: any = {}) {
    const msg = 'a4n.registerAvro';
    const dbg = DBG.SCHEMA.ALL;
    Forma.registerAvro(opts);

    let { fullName } = Action.avroSchema;
    dbg > 1 && cc.ok(msg, 'registerType:', fullName);
    let avroType = Schema.registerType(Action, opts);
    dbg && cc.ok1(msg, 'schema:', fullName);
    return avroType;
  }

  /**
   * Schema wrapper for Action avro schema record
   * @returns Schema
   */
  static override get avroSchema() {
    const formaSchema = Forma.avroSchema;
    return new Schema({
      name: 'Action',
      namespace: this.AVRO_NAMESPACE,
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
  override patch(cfg: any = {}): any {
    const msg = 'Action.patch';
    const dbg = (A6N as any)?.PATCH;
    super.patch(cfg);
    const { status, statusNote } = cfg;
    const changed: any = {};
    if (statusNote != null && statusNote != this.statusNote) {
      changed.statusNote = this.statusNote;
      this.statusNote = statusNote;
    }
    if (status != null && status !== this.status) {
      if (statusNote == null) {
        throw new Error(`${msg} statusNote is required`);
      }
      const allowed = ActionTransitions[this.status as ActionStatus] || [];
      if (!allowed.includes(status)) {
        throw new Error(
          `${msg} invalid transition: ${this.status} → ${status}`,
        );
      }
      changed.status = this.status;
      this.status = status as ActionStatus;
    }
    dbg && cc.ok1(msg, cfg);

    return changed;
  }

  /** Add MonoJSON KV pair on behalf of toMonoJSON() */
  override addKeyValues(
    builder: MonoJSONBuilder,
    opts: Record<string, any> = {},
  ): void {
    super.addKeyValues(builder, opts);
    const { theme, zeno, namespace } = opts;
    const { status, statusNote } = this;

    if (zeno >= ZENO_2_ROWS) {
      builder.addKeyValue('status', status);
      builder.addKeyValue('statusNote', statusNote);
    }
  }

  static shortDate(date: Date): string {
    const now = new Date();
    if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    ) {
      return Intl.DateTimeFormat(undefined, {
        timeStyle: 'short',
        hour12: false,
      }).format(date);
    }
    const fmt = Intl.DateTimeFormat(undefined, { dateStyle: 'short' });
    const s = fmt.format(date);
    const s4 = fmt.format(
      new Date(date.getFullYear() + 4, date.getMonth(), date.getDate()),
    );
    let start = -1,
      end = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== s4[i]) {
        if (start === -1) start = i;
        end = i;
      } else if (start !== -1) {
        return s;
      }
    }
    if (start === -1) return s;
    let ys = start,
      ye = end;
    while (ys > 0 && /\w/.test(s[ys - 1])) ys--;
    while (ye < s.length - 1 && /\w/.test(s[ye + 1])) ye++;
    if (ys > 0 && !/\w/.test(s[ys - 1])) ys--;
    else if (ye < s.length - 1 && !/\w/.test(s[ye + 1])) ye++;
    return s.slice(0, ys) + s.slice(ye + 1);
  }

  /**
   * Override tuiRowStrings to prepend status indicator with color
   */
  override tuiRowStrings(cfg: any = {}): string[] {
    let row = super.tuiRowStrings(cfg);
    let id = row.shift()!;
    let statusNote = this.statusNote ? `(${this.statusNote})` : '';
    const { theme = NameFormaTheme.shared } = cfg;
    const {
      BRIGHT_GREEN,
      BRIGHT_RED,
      BRIGHT_BLUE,
      BRIGHT_YELLOW,
      BRIGHT_MAGENTA,
      BLUE,
      RED,
      MAGENTA,
      YELLOW,
      NO_COLOR,
    } = Unicode.LINUX_COLOR;
    const statusColor: Record<string, string> = {
      req: BLUE,
      spec: BRIGHT_BLUE,
      work: YELLOW,
      test: BRIGHT_MAGENTA,
      manage: BRIGHT_RED,
      done: BRIGHT_GREEN,
    };
    const c = statusColor[this.status] ?? '';
    const dateStr = Action.shortDate(this.updatedAt) + URAR;
    const status = this.status;
    const coloredStatus = c ? `${c}${status}${NO_COLOR}` : status;
    const sep = theme.nfBoundary(UBAR);
    return [id, [dateStr + coloredStatus, ...row, statusNote].join(sep)];
  }
}
