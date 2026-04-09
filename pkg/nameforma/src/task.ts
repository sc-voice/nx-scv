import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';
import { Forma } from './forma.js';
import { Rational } from './rational.js';
import { Schema, type AvroType } from './schema.js';
import { Action } from './action.js';
import { FormaList } from './forma-list.js';
import { NotImplementedError } from './errors.js';

const { ColorConsole, Unicode } = Text;
const { TASK: T2K } = DBG;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const RATIONAL = Rational.avroSchema;
const FORMA = Forma.avroSchema;

/**
 * Task extends Forma with task-specific fields and action management.
 *
 * ## Fields
 * - `duration`: Task time estimate as Rational with units (e.g., "2 s")
 * - `actions`: FormaList<Action> for managing task actions (progress derived from action status)
 *
 * ## Usage
 * ```typescript
 * const task = new Task({
 *   name: 'Implement feature',
 *   duration: new Rational(2, 1, 's'),
 *   actions: [
 *     { status: 'todo' },
 *     { status: 'done' }
 *   ]
 * });
 *
 * // Access actions via FormaList API
 * task.actions.addItem({ status: 'todo' });
 * task.actions.deleteItem(id);
 * task.actions.patchItem(id, { status: 'done' });
 * ```
 *
 * ## Serialization
 * Tasks serialize to Avro format with all fields including nested actions array.
 * Empty actions array serializes as `[]`.
 *
 * ## put() vs patch()
 * - `put()`: Replaces all fields including actions (initializes from cfg.actions array)
 * - `patch()`: Updates only duration. Throws NotImplementedError if actions field provided.
 *   Use task.actions.* methods for action mutations instead.
 */
export class Task extends Forma {
  static override readonly patchableFields = [...Forma.patchableFields, 'duration'];

  duration: any = new Rational(null, 1, 's');
  rawActions: Array<Action> = [];

  /**
   * Create a new Task instance.
   *
   * @param cfg Configuration object with optional:
   *   - `id`: UUID64 for deserialized tasks (auto-generated if omitted)
   *   - `name`: Task name (inherited from Forma)
   *   - `duration`: Rational or plain object {numerator, denominator, units}
   *   - `actions`: Array of action configs (auto-constructed via FormaList)
   *
   * Calls put() to initialize all fields from cfg.
   */
  constructor(cfg: any = {}) {
    const msg = 't2k.ctor';
    const dbg = T2K.CTOR;
    super({ id: cfg.id }); // for deserialized tasks
    this.put(cfg);

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Readonly access to task actions as a FormaList.
   * Use FormaList API for mutations:
   * - addItem(cfg): Create new action
   * - deleteItem(id): Remove action
   * - patchItem(id, cfg): Update action fields
   * - getItem(id): Retrieve action
   * - items(filter): List all actions
   */
  get actions(): FormaList<Action> {
    return new FormaList(this.rawActions, Action, this.id);
  }

  /**
   * Register Task schema into the avro registry and return AvroType.
   *
   * TWO-REGISTRY SYSTEM:
   * - Schema.#registry: Prevents duplicate schema registrations
   * - avro registry: The avro-js library's type registry (passed to avro.parse())
   *
   * Registers dependencies (Forma parent, Rational, Action) first,
   * then registers Task type itself into BOTH registries.
   *
   * @param opts Optional schema registration options (avro instance, registry)
   * @returns Registered AvroType from avro.parse()
   */
  static override registerAvro(opts: any = {}) : AvroType {
    const msg = "t2k.registerAvro";
    const dbg = DBG.SCHEMA.ALL;

    dbg>1 && cc.ok(msg, 'dependencies');
    Forma.registerAvro(opts);
    Rational.registerAvro(opts);
    Action.registerAvro(opts);

    dbg && cc.ok(msg, 'task');
    let avroType = Schema.registerType(Task, opts);
    dbg && cc.ok1(msg, Task.avroSchema.fullName);
    return avroType
  }

  static entity = 'task';

  /**
   * Avro schema for Task serialization.
   *
   * Fields:
   * - id, name, summary: Inherited from Forma
   * - duration: Time estimate (Rational type with units)
   * - actions: Array of Action items (FormaList<Action>)
   *
   * Empty actions serialize as []. All fields are required.
   */
  static override get avroSchema(): Schema {
    return new Schema({
      name: 'Task',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...(FORMA as any).fields,
        { name: 'duration', type: (RATIONAL as any).fullName },
        //{ name: 'actions', type: (actionsSchema as any).fullName },
        { name: 'rawActions', type: { type: 'array', items: Action.avroSchema.fullName } },
      ],
    });
  }

  static fromJson(data: any): Task {
    return new Task(data);
  }

  /**
   * Convert Task to Avro-compatible value for serialization.
   * Returns plain object with actions serialized as array items.
   */
  toAvroValue(): any {
    return {
      id: this.id,
      name: this.name,
      summary: this.summary,
      duration: this.duration,
      //actions: this.rawActions.items(),
      rawActions: this.rawActions,
    };
  }

  /**
   * Replace all task fields including actions.
   *
   * Initializes Task from configuration object, replacing existing state entirely.
   * Converts progress/duration to Rational instances if needed.
   *
   * @param value Configuration object with properties to set:
   *   - `duration`: Rational or {numerator, denominator, units}
   *   - `rawActions`: Array of Action
   *
   * Called by constructor to initialize instance. Also used for deserialization.
   */
  put(value: any) {
    const msg = 't2k.put';
    const dbg = T2K.PUT;
    super.patch(value);
    let {
      duration = new Rational(null, 1, 's'),
      rawActions = [],
    } = value;
    if (!(duration instanceof Rational)) {
      duration = new Rational(duration);
    }
    Object.assign(this, { duration, rawActions:[...rawActions] });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Update task fields selectively without replacing actions.
   *
   * Only updates duration, etc. fields.
   * Use task.actions.* methods for action mutations instead.
   *
   * @param value Configuration object with fields to update:
   *   - `duration`: Rational or {numerator, denominator, units}
   *
   * Note: Uses patch() from parent Forma class for name/summary fields.
   */
  override patch(value: any = {}) {
    const msg = 't2k.patch';
    const dbg = T2K.PATCH;
    super.patch(value);
    let {
      duration = this.duration,
    } = value;
    Object.assign(this, { duration });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Format task as human-readable string.
   *
   * Format: `{name} ({time})`
   *
   * Time shows duration if not null.
   *
   * @returns Formatted task string
   */
  override toString() {
    const dbg = T2K.TO_STRING;
    let { name, duration } = this as any;
    let time = '';
    if (!duration.isNull) {
      time = duration.toString();
    }

    dbg;
    return time ? `${name} (${time})` : name;
  }
}
