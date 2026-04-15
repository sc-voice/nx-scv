import { Text } from '@sc-voice/tools';
import { DBG } from './defines.js';
import { Forma, type ListItemStringCfg } from './forma.js';
import { Schema, type AvroType } from './schema.js';
import { Action, ActionStatus } from './action.js';
import { Reference } from './reference.js';
import { FormaList, type IEventBus } from './forma-list.js';

const { ColorConsole, Unicode } = Text;
const { TASK: T2K } = DBG;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const FORMA = Forma.avroSchema;

/**
 * Task extends Forma with action and reference management.
 *
 * @see doc/task-action.md
 *
 * ## Fields
 * - `actions`: FormaList<Action> for managing task actions
 * - `references`: FormaList<Reference> for managing task references
 *
 * ## Usage
 * ```typescript
 * const task = new Task({ name: 'Implement feature' });
 *
 * // Access actions via FormaList API
 * task.actions.addItem({ status: 'todo' });
 * task.actions.deleteItem(id);
 * task.actions.patchItem(id, { status: 'done' });
 *
 * // Access references via FormaList API
 * task.references.addItem({ name: 'Related issue', relevance: 0.8 });
 * task.references.deleteItem(id);
 * ```
 *
 * ## Serialization
 * Tasks serialize to Avro format with all fields including nested actions and references arrays.
 * Empty arrays serialize as `[]`.
 */
export class Task extends Forma {
  rawActions: Array<Action> = [];
  rawReferences: Array<Reference> = [];

  /**
   * Create a new Task instance.
   *
   * @param cfg Configuration object with optional:
   *   - `id`: UUID64 for deserialized tasks (auto-generated if omitted)
   *   - `name`: Task name (inherited from Forma)
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
   * Get task actions as a FormaList with event bus integration.
   * Use FormaList API for mutations:
   * - addItem(cfg): Create new action
   * - deleteItem(id): Remove action
   * - patchItem(id, cfg): Update action fields
   * - getItem(id): Retrieve action
   * - items(filter): List all actions
   */
  /**
   * @param bus - Event bus for change notifications and persistence
   */
  actions(bus: IEventBus): FormaList<Action> {
    return new FormaList(this.rawActions, Action, this, bus);
  }

  /**
   * Get task references as a FormaList with event bus integration.
   * Use FormaList API for mutations:
   * - addItem(cfg): Create new reference
   * - deleteItem(id): Remove reference
   * - patchItem(id, cfg): Update reference fields
   * - getItem(id): Retrieve reference
   * - items(filter): List all references
   */
  /**
   * @param bus - Event bus for change notifications and persistence
   */
  references(bus: IEventBus): FormaList<Reference> {
    return new FormaList(this.rawReferences, Reference, this, bus);
  }

  /**
   * Calculate task progress as the fraction of actions with status 'done'.
   * @returns Progress metric from 0 (no actions done) to 1 (all actions done)
   */
  progress(): number {
    const total = this.rawActions.length;
    if (total === 0) return 0;
    const done = this.rawActions.filter(a => a.status === ActionStatus.done).length;
    return done / total;
  }

  override toString() {
    return this.name;
  }

  /**
   * Register Task schema into the avro registry and return AvroType.
   *
   * TWO-REGISTRY SYSTEM:
   * - Schema.#registry: Prevents duplicate schema registrations
   * - avro registry: The avro-js library's type registry (passed to avro.parse())
   *
   * Registers dependencies (Forma parent, Action, Reference) first,
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
    Action.registerAvro(opts);
    Reference.registerAvro(opts);

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
   * - rawActions: Array of Action items
   * - rawReferences: Array of Reference items
   */
  static override get avroSchema(): Schema {
    return new Schema({
      name: 'Task',
      namespace: 'scvoice.nameforma',
      type: 'record',
      fields: [
        ...(FORMA as any).fields,
        { name: 'rawActions', type: { type: 'array', items: Action.avroSchema.fullName } },
        { name: 'rawReferences', type: { type: 'array', items: Reference.avroSchema.fullName } },
      ],
    });
  }

  static fromJson(data: any): Task {
    return new Task(data);
  }

  /**
   * Replace all task fields including actions and references.
   *
   * @param value Configuration object with properties to set:
   *   - `rawActions`: Array of Action
   *   - `rawReferences`: Array of Reference
   *
   * Called by constructor to initialize instance. Also used for deserialization.
   */
  put(value: any) {
    const msg = 't2k.put';
    const dbg = T2K.PUT;
    super.patch(value);
    let { rawActions = [], rawReferences = [] } = value;
    Object.assign(this, {
      rawActions: rawActions.map((data: any) => new Action(data)),
      rawReferences: rawReferences.map((data: any) => new Reference(data)),
    });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Return array of strings to be presented as a TUI row
   */
  override tuiRowStrings(cfg:ListItemStringCfg={}) : string[] {
    const msg = 't2k.tuiRowStrings';
    let { id, name, summary } = this;
    let progress = this.progress();
    let { 
      itemId = id.timeId(),
      bullet,
    } = cfg;

    let row = [itemId, progress.toFixed(1), name+":", summary];
    if (bullet) {
      row.unshift(bullet);
    }
    return row;
  }

}
