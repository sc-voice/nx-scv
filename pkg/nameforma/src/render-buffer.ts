import type { IView, RenderRow } from './navigable-view.js';

export class RenderBuffer {
  private readonly _view: IView;
  private _remainingRows: number;
  private _rows: RenderRow[];

  constructor(view: IView, rowBudget: number) {
    if (rowBudget < 0) {
      throw new RangeError(`RenderBuffer: rowBudget must be >= 0, got ${rowBudget}`);
    }
    this._view = view;
    this._remainingRows = rowBudget;
    this._rows = [];
  }

  get remainingRows(): number {
    return this._remainingRows;
  }

  pushRow(row: RenderRow): void {
    if (this._remainingRows <= 0) {
      throw new RangeError('RenderBuffer: row budget exhausted');
    }
    this._rows.push(row);
    this._remainingRows--;
  }

  getRenderData(): RenderRow[] {
    return this._rows;
  }

  pushCollection(rows: RenderRow[]): void {
    if (rows.length > 0 && this._remainingRows <= 0) {
      throw new RangeError('RenderBuffer: row budget exhausted');
    }
    const willTruncate = rows.length > this._remainingRows;
    const limit = willTruncate ? this._remainingRows - 1 : rows.length;
    for (let i = 0; i < limit; i++) {
      this.pushRow(rows[i]);
    }
    if (willTruncate) {
      const omitted = rows.length - limit;
      this._rows.push([`… [${omitted}]`]);
      this._remainingRows--;
    }
  }
}
