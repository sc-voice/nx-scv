import { DBG } from './defines.js';
import { Identifiable } from './identifiable.js';
import { Entity } from './entity.js';
import { Forma, type ListItemStringCfg } from './forma.js';
import { FormaField } from './forma-field.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { Schema, type AvroType } from './schema.js';
import { Action, ActionStatus, STATUS_ORDER } from './action.js';
import { Reference } from './reference.js';
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
import { RenderBuffer } from './render-buffer.js';
import { ColorConsole, Unicode } from '@sc-voice/tools/text';
const { cc } = ColorConsole;
const { CHECKMARK: UOK } = Unicode;
const { LIGHT_VERTICAL_BAR: UBAR } = Unicode;
const FORMA = Forma.avroSchema;

/** Plan is an Entity with Actions and References
 */
export class Plan extends Entity {
  actions: Array<Action> = [];
  references: Array<Reference> = [];

  /**
   * Create a new Plan instance.
   *
   * @param cfg Configuration object with optional overrides for defaults:
   *
   * Calls put() to initialize all fields from cfg.
   */
  constructor(cfg: Partial<Plan> = {}) {
    const msg = 'p2n.ctor';
    const dbg = DBG.PLAN.ANY;
    super({ id: cfg.id });
    this.put(cfg);

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Populate namespace with actions and references
   */
  protected override populateNamespace(): void {
    this.actions.forEach((action) => this.addToNamespace(action));
    this.references.forEach((ref) => this.addToNamespace(ref));
  }

  /**
   * Calculate task progress as the mean of action statuses mapped to integers.
   * @returns Progress metric from 0 (no actions) to 1 (all actions done), normalized to [0..1]
   */
  progress(): number {
    const total = this.actions.length;
    if (total === 0) return 0;
    const sum = this.actions.reduce(
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
    const statuses = this.actions.map((a) => a.status);
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

  static entity = (this as typeof Identifiable).avroSchema.name;

  /** Avro serialization Schema */
  static override get avroSchema(): Schema {
    return new Schema({
      name: 'Plan',
      namespace: this.AVRO_NAMESPACE,
      type: 'record',
      fields: [
        ...(FORMA as any).fields,
        {
          name: 'actions',
          type: { type: 'array', items: Action.avroSchema.fullName },
        },
        {
          name: 'references',
          type: { type: 'array', items: Reference.avroSchema.fullName },
        },
      ],
    });
  }

  /**
   * Register schema into the avro registry and return AvroType.
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
    const msg = 'p2n.registerAvro';
    const dbg = DBG.SCHEMA.ALL;

    dbg > 1 && cc.ok(msg, 'dependencies');
    Forma.registerAvro(opts);
    Action.registerAvro(opts);
    Reference.registerAvro(opts);

    dbg && cc.ok(msg, 'task');
    let avroType = Schema.registerType(this, opts);
    dbg && cc.ok1(msg, this.avroSchema.fullName);
    return avroType;
  }

  static fromJson(data: any): Plan {
    return new Plan(data);
  }

  /**
   * Replace all task fields including actions and references.
   *
   * @param value Configuration object with properties to set:
   *   - `actions`: Array of Action
   *   - `references`: Array of Reference
   *
   * Called by constructor to initialize instance. Also used for deserialization.
   */
  put(value: Partial<Plan>) {
    const msg = 'p2n.put';
    const dbg = DBG.PLAN.ANY;
    super.patch(value);
    let { actions = [], references = [] } = value;
    Object.assign(this, {
      actions: actions.map((data: any) => new Action(data)),
      references: references.map((data: any) => new Reference(data)),
    });

    dbg && cc.ok1(msg, ...cc.props(this));
  }

  /**
   * Return array of strings to be presented as a TUI row
   */
  override tuiRowStrings(cfg: ListItemStringCfg = {}): string[] {
    const msg = 'p2n.tuiRowStrings';
    let { id, name, summary } = this;
    let progressValue = this.progress();
    const { 
      theme=NameFormaTheme.shared, itemId = id.timeId(), bullet 
    } = cfg;

    const { NO_COLOR } = Unicode.LINUX_COLOR;
    const pct = Math.round(progressValue * 100);
    const coloredPct = `${this.progressColor()}${pct}%${NO_COLOR}`;
    let prefix = bullet
      ? `${bullet}${itemId}${coloredPct}`
      : `${itemId}${coloredPct}`;
    let row = [prefix, [name, summary].join(theme.nfBoundary(UBAR))];
    return row;
  }

  /**
   * Render data at given zeno level of semantic detail
   */
  override renderDataAtZeno(view: IView, zeno: ZenoCoord): RenderData {
    const { anchorStep, pivotStep } = zeno;
    const { id, name, summary, actions, references:refs } = this;
    const headerData:RenderData = super.renderDataAtZeno(view, zeno);
    const ZENO_TERSE = new ZenoCoord(ZENO_1_ROW_TERSE, ZENO_1_ROW_TERSE);

    if (anchorStep <= ZENO_3_ROWS) {
      return headerData;
    }

    const buf = new RenderBuffer(view, zenoStepToLines(anchorStep));
    for (const row of headerData as RenderRow[]) buf.pushRow(row);

    if (buf.remainingRows === 1) {
      buf.pushRow([
        new FormaField('actions', false, 'Actions', ''+actions.length),
        new FormaField('references', false, 'References', ''+refs.length),
      ]);
    } else {
      buf.pushRow([ new FormaField('actions', false, 'Actions', ''+actions.length) ]);
      buf.pushCollection(actions.map(a => a.renderDataAtZeno(view, ZENO_TERSE) as RenderRow));
      buf.pushRow([ new FormaField('references', false, 'References', ''+refs.length) ]);
      buf.pushCollection(refs.map(r => r.renderDataAtZeno(view, ZENO_TERSE) as RenderRow));
    }
    return buf.getRenderData();
  } // renderDataAtZeno

} // Task
