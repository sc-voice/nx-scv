import type { IView, RenderRow } from './navigable-view.js';
import { NameFormaTheme } from './nameforma-theme.js';

const theme = NameFormaTheme.shared;

/**
 * A RenderRow buffer that collects rows up to a given budget.
 * @param {number} rowBudget maximum number of rows
 */
export class RenderBuffer {
  readonly rowBudget: number;

  private readonly _view: IView;
  private _rows: RenderRow[];
  private _truncated: number;


  constructor(view: IView, rowBudget: number) {
    if (rowBudget <= 0) {
      throw new RangeError(`RenderBuffer: rowBudget must be > 0, got ${rowBudget}`);
    }
    this._view = view;
    this.rowBudget = rowBudget;
    this._rows = [];
    this._truncated = 0;
  }

  get remainingRows(): number {
    return this.rowBudget - this._rows.length;
  }

  pushRow(row: RenderRow): boolean {
    if (this.remainingRows <= 0) {
      this._truncated = this._truncated <= 0 ? 2 : this._truncated+1;
      this._rows[this._rows.length-1] = [theme.nfAway(`[…+${this._truncated}]`)];
      return false;
    } 

    this._rows.push(row);
    return true;
  }

  getRenderData(): RenderRow[] {
    return this._rows;
  }

  pushCollection(rows: RenderRow[]): void {
    for (const row of rows) {
      this.pushRow(row);
    }
  }
}
