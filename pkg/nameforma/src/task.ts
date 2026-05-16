import { DBG } from './defines.js';
import { Forma, type ListItemStringCfg } from './forma.js';
import { FormaField } from './forma-field.js';
import { Schema, type AvroType } from './schema.js';
import { Action, ActionStatus, STATUS_ORDER } from './action.js';
import { Reference } from './reference.js';
import { IRegistry } from './registry.js';
import { FormaList, type IEventBus } from './forma-list.js';
import {
  FuzzyNamespace,
  type IFuzzyNamespace,
} from './fuzzy-namespace.js';
import {
  RenderData,
  RenderRow,
  RenderDetail,
  IRenderable,
  IView,
  ZenoCoord,
  ZenoStep,
  ZENO_1_ROW_TERSE,
  ZENO_1_ROW_VERBOSE,
  ZENO_3_ROWS,
  zenoStepToLines,
} from './navigable-view.js';
import { ColorConsole, Unicode } from '@sc-voice/tools/text';
const { TASK: T2K } = DBG;
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { LIGHT_VERTICAL_BAR: UBAR } = Unicode;
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
export class Task extends Forma implements IRegistry {
  rawActions: Array<Action> = [];
  rawReferences: Array<Reference> = [];
  #namespace: FuzzyNamespace;

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
    this.#namespace = new FuzzyNamespace();
    this.put(cfg);
    this.#populateNamespace();

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
    return new FormaList(this.rawActions, Action, {
      parent: this,
      emitter: bus,
      namespace: this.#namespace,
    });
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
    return new FormaList(this.rawReferences, Reference, {
      parent: this,
      emitter: bus,
      namespace: this.#namespace,
    });
  }

  /**
   * IRegistry implementation: return the combined namespace of actions and references
   */
  namespace(): IFuzzyNamespace {
    return this.#namespace;
  }

  /**
   * Populate namespace with existing actions and references
   */
  #populateNamespace(): void {
    this.rawActions.forEach((action) => this.#namespace.addForma(action));
    this.rawReferences.forEach((ref) => this.#namespace.addForma(ref));
  }

  /**
   * Calculate task progress as the mean of action statuses mapped to integers.
   * @returns Progress metric from 0 (no actions) to 1 (all actions done), normalized to [0..1]
   */
  progress(): number {
    const total = this.rawActions.length;
    if (total === 0) return 0;
    const sum = this.rawActions.reduce(
      (acc, a) => acc + STATUS_ORDER[a.status],
      0,
    );
    return sum / (total * 6);
  }

  /**
   * Determine progress color based on action statuses.
   * Red: 0 actions or any manage. Green: all done. Yellow: any work or test. Magenta: all req or spec.
   */
  progressColor(): string {
    const { BRIGHT_GREEN, BRIGHT_CYAN, BRIGHT_RED, BRIGHT_MAGENTA } =
      Unicode.LINUX_COLOR;
    const statuses = this.rawActions.map((a) => a.status);
    if (statuses.length === 0) return BRIGHT_RED;
    if (statuses.includes(ActionStatus.manage)) return BRIGHT_RED;
    if (statuses.every((s) => s === ActionStatus.done))
      return BRIGHT_GREEN;
    if (
      statuses.some(
        (s) => s === ActionStatus.work || s === ActionStatus.test,
      )
    )
      return BRIGHT_CYAN;
    return BRIGHT_MAGENTA;
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
  static override registerAvro(opts: any = {}): AvroType {
    const msg = 't2k.registerAvro';
    const dbg = DBG.SCHEMA.ALL;

    dbg > 1 && cc.ok(msg, 'dependencies');
    Forma.registerAvro(opts);
    Action.registerAvro(opts);
    Reference.registerAvro(opts);

    dbg && cc.ok(msg, 'task');
    let avroType = Schema.registerType(Task, opts);
    dbg && cc.ok1(msg, Task.avroSchema.fullName);
    return avroType;
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
        {
          name: 'rawActions',
          type: { type: 'array', items: Action.avroSchema.fullName },
        },
        {
          name: 'rawReferences',
          type: { type: 'array', items: Reference.avroSchema.fullName },
        },
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
      rawActions: rawActions.map((data: any) => {
        const action = new Action(data);
        try {
          action.put(data);
        } catch (err: any) {
          throw new Error(
            `Task ${this.id.timeId()} action ${data.id || '?'} '${data.name || '?'}': ${err.message}`,
          );
        }
        return action;
      }),
      rawReferences: rawReferences.map((data: any) => new Reference(data)),
    });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Return array of strings to be presented as a TUI row
   */
  override tuiRowStrings(cfg: ListItemStringCfg = {}): string[] {
    const msg = 't2k.tuiRowStrings';
    let { id, name, summary } = this;
    let progressValue = this.progress();
    let { itemId = id.timeId(), bullet } = cfg;

    const { NO_COLOR } = Unicode.LINUX_COLOR;
    const pct = Math.round(progressValue * 100);
    const coloredPct = `${this.progressColor()}${pct}%${NO_COLOR}`;
    let row = [itemId, [coloredPct, name, summary].join(UBAR)];
    if (bullet) {
      row.unshift(bullet);
    }
    return row;
  }

  /**
   * IRenderable: Return renderable data at detail level zeno
   */
  override asRenderData(view: IView, zeno: ZenoStep = view.zenoCoord.anchorStep): RenderData {
    const msg = "Task.asRenderData()";
    const dbg = 0;
    const { 
      id, name, summary, rawActions:actions, rawReferences:refs 
    } = this;
    const cls = this.constructor.name;
    const { anchor } = view;
    const ns = anchor.namespace();
    const shortId = ns.fuzzyIdOf(this);
    const indent = view.bodyIndent;
    const theme = view.theme;
    const sep = theme.nfBoundary("|");
    const headerData:RenderData = super.asRenderData(view, zeno);
    const ellipsis = [theme.nfLabel('...')];

    if (zeno <= ZENO_3_ROWS) {
      return headerData;
    }

    const renderData = [...(headerData as RenderRow[])];
    let rowsAvail = zenoStepToLines(zeno) - headerData.length;
    dbg > 2 && cc.tag(msg, {rowsAvail});

    if (rowsAvail === 1) {
      renderData.push([ 
        new FormaField('actions', false, 'Actions', ''+actions.length),
        new FormaField('references', false, 'References', ''+refs.length),
      ]);
      return renderData;
    } 

    rowsAvail -= 2; // action/reference title rows
    renderData.push([ new FormaField('actions', false, 'Actions', ''+actions.length) ]);
    if (rowsAvail < actions.length) {
      rowsAvail--; // allow for ellipsis
    }
    dbg > 2 && cc.tag(msg, {rowsAvail});
    for (let i = 0; i < actions.length; i++) {
      if (0 < rowsAvail) {
        const a4n = actions[i];
        const row = a4n.asRenderData(view, ZENO_1_ROW_TERSE) as RenderRow;
        renderData.push(row);
        rowsAvail--;
      } else {
        renderData.push(ellipsis);
        break;
      }
    }
    renderData.push([ new FormaField('references', false, 'References', ''+refs.length) ]);
    if (rowsAvail < refs.length) {
      rowsAvail--; // allow for ellipsis;
    }
    for (let i = 0; i < actions.length; i++) {
      if (0 < rowsAvail) {
        const ref = refs[i];
        renderData.push(ref.asRenderData(view, ZENO_1_ROW_TERSE) as RenderRow);
        rowsAvail--;
      } else {
        renderData.push(ellipsis);
        break;
      }
    }
    return renderData;
  } // asRenderData

} // Task
