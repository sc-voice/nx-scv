import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';
import { Forma } from './forma.js';
import { Rational } from './rational.js';
import { Schema } from './schema.js';
import { Action } from './action.js';
import { FormaCollection } from './forma-collection.js';
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
 * - `title`: Task description (string)
 * - `progress`: Task completion state as Rational (numerator/denominator)
 * - `duration`: Task time estimate as Rational with units (e.g., "2 s")
 * - `actions`: FormaCollection<Action> for managing task actions
 *
 * ## Usage
 * ```typescript
 * const task = new Task({
 *   title: 'Implement feature',
 *   progress: new Rational(1, 3, 'done'),
 *   duration: new Rational(2, 1, 's'),
 *   actions: [
 *     { status: 'todo' },
 *     { status: 'done' }
 *   ]
 * });
 *
 * // Access actions via FormaCollection API
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
 * - `patch()`: Updates only title/progress/duration. Throws NotImplementedError if actions field provided.
 *   Use task.actions.* methods for action mutations instead.
 */
export class Task extends Forma {
  title: string = 'title?';
  progress: any = new Rational(0, 1, 'done');
  duration: any = new Rational(null, 1, 's');
  #actions: FormaCollection<Action>;

  /**
   * Create a new Task instance.
   *
   * @param cfg Configuration object with optional:
   *   - `id`: UUID64 for deserialized tasks (auto-generated if omitted)
   *   - `name`: Task name (inherited from Forma)
   *   - `title`: Task description
   *   - `progress`: Rational or plain object {numerator, denominator, units}
   *   - `duration`: Rational or plain object {numerator, denominator, units}
   *   - `actions`: Array of action configs (auto-constructed via FormaCollection)
   *
   * Calls put() to initialize all fields from cfg.
   */
  constructor(cfg: any = {}) {
    const msg = 't2k.ctor';
    const dbg = T2K.CTOR;
    super({ id: cfg.id }); // for deserialized tasks
    this.#actions = new FormaCollection(this.id, Action);
    this.put(cfg);

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Readonly access to task actions as a FormaCollection.
   * Use FormaCollection API for mutations:
   * - addItem(cfg): Create new action
   * - deleteItem(id): Remove action
   * - patchItem(id, cfg): Update action fields
   * - getItem(id): Retrieve action
   * - items(filter): List all actions
   */
  get actions(): FormaCollection<Action> {
    return this.#actions;
  }

  /**
   * Register Task schema with Schema registry.
   *
   * Registers dependencies (Rational) and Task type itself.
   * TODO: Consider whether this method is necessary or if it's a schema registry hack.
   *
   * @param opts Optional schema registration options
   * @returns Registered Task schema
   */
  static registerSchema(opts: any = {}) {
    Schema.registerType(Rational, opts);
    // TODO: Register FormaCollection.schemaOf(Action) when schema registry is finalized
    return Schema.registerType(this, opts);
  }

  static entity = 'task';

  /**
   * Avro schema for Task serialization.
   *
   * Fields:
   * - id, name, summary: Inherited from Forma
   * - title: Task description
   * - progress: Task completion state (Rational type)
   * - duration: Time estimate (Rational type with units)
   * - actions: Array of Action items (FormaCollection<Action>)
   *
   * Empty actions serialize as []. All fields are required.
   */
  static override get avroSchema() {
    return {
      name: 'Task',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...FORMA.fields,
        { name: 'title', type: 'string' },
        { name: 'progress', type: (RATIONAL as any).fullName },
        { name: 'duration', type: (RATIONAL as any).fullName },
        // TODO: Uncomment when actions schema is ready
        // { name: 'actions', type: (FormaCollection.schemaOf(Action) as any).fullName },
      ],
    };
  }

  static fromJson(data: any): Task {
    return new Task(data);
  }

  /**
   * Replace all task fields including actions.
   *
   * Initializes Task from configuration object, replacing existing state entirely.
   * Converts progress/duration to Rational instances if needed.
   *
   * @param value Configuration object with properties to set:
   *   - `title`: Task description
   *   - `progress`: Rational or {numerator, denominator, units}
   *   - `duration`: Rational or {numerator, denominator, units}
   *   - `actions`: Array of action configs (constructs FormaCollection internally)
   *
   * Called by constructor to initialize instance. Also used for deserialization.
   */
  put(value: any) {
    const msg = 't2k.put';
    const dbg = T2K.PUT;
    super.patch(value);
    let {
      title = 'title?',
      progress = new Rational(0, 1, 'done'),
      duration = new Rational(null, 1, 's'),
      actions = [],
    } = value;
    if (!(duration instanceof Rational)) {
      duration = new Rational(duration);
    }
    if (!(progress instanceof Rational)) {
      progress = new Rational(progress);
    }
    Object.assign(this, { title, progress, duration });

    // Replace actions FormaCollection entirely
    this.#actions = new FormaCollection(this.id, Action);
    if (actions?.length) {
      for (const actionCfg of actions) {
        this.#actions.addItem(actionCfg);
      }
    }

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Update task fields selectively without replacing actions.
   *
   * Only updates title, progress, and duration fields. Throws NotImplementedError
   * if actions field is provided—use task.actions.* methods for action mutations instead.
   *
   * @param value Configuration object with fields to update:
   *   - `title`: Task description
   *   - `progress`: Rational or {numerator, denominator, units}
   *   - `duration`: Rational or {numerator, denominator, units}
   *
   * @throws NotImplementedError if value contains 'actions' field
   *
   * Note: Uses patch() from parent Forma class for name/summary fields.
   */
  override patch(value: any = {}) {
    if ('actions' in value) {
      throw new NotImplementedError(
        'Cannot patch actions field directly. Use task.actions.addItem(), deleteItem(), or patchItem() instead.'
      );
    }

    const msg = 't2k.patch';
    const dbg = T2K.PATCH;
    super.patch(value);
    let {
      title = this.title,
      progress = this.progress,
      duration = this.duration,
    } = value;
    Object.assign(this, { title, progress, duration });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Format task as human-readable string.
   *
   * Format: `{name}{symbol} {title} ({status}{time})`
   *
   * Symbols:
   * - `.` : Not started (progress < 1)
   * - `>` : In progress (started flag set)
   * - `✓` : Done (progress >= 1)
   *
   * Status shows numerator/denominator ratio, or denominator+units if done.
   * Time shows duration if not null.
   *
   * @returns Formatted task string
   */
  override toString() {
    const dbg = T2K.TO_STRING;
    let { name, title, progress, duration } = this as any;
    let time = '';
    let symbol = '.';
    let status = progress.toString({ asRange: '/' });
    let done = progress.value >= 1;
    if (done) {
      symbol = UOK;
      status = '' + progress.denominator + progress.units;
    } else if ((this as any).started) {
      symbol = Unicode.RIGHT_GUILLEMET;
    }
    if (!duration.isNull) {
      time = ' ' + duration.toString();
    }

    dbg;
    return `${name}${symbol} ${title} (${status}${time})`;
  }
}
