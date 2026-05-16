import type { RenderData, RenderCell, RenderRow, ZenoStep, ITheme } from './navigable-view.js';
import { ZENO_1_ROW_TERSE } from './navigable-view.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { FormaField } from './forma-field.js';

/**
 * A renderer that converts complex, recursive RenderData into a flattened
 * array of strings suitable for TUI display.
 */
export interface LineRendererConfig {
  theme?: ITheme;
  zenoStep?: ZenoStep;
  indentChar?: string;
  precision?: number;
  lines?: number;
  lineWidth?: number;
  wrapIndent?: number;
}

/**
 * A renderer that converts complex, recursive RenderData into a flattened
 * array of strings suitable for TUI display.
 */
export class LineRenderer {
  public readonly theme: ITheme;
  public readonly zenoStep: ZenoStep;
  public readonly indentChar: string;
  public readonly precision: number;
  public readonly lines: number;
  public readonly lineWidth: number;
  public readonly wrapIndent: number;

  constructor(config?: LineRendererConfig) {
    this.theme = config?.theme ?? NameFormaTheme.load();
    this.zenoStep = config?.zenoStep ?? ZENO_1_ROW_TERSE;
    this.indentChar = config?.indentChar ?? '  ';
    this.precision = config?.precision ?? 2;
    this.lines = config?.lines ?? Number.MAX_SAFE_INTEGER;
    this.lineWidth = config?.lineWidth ?? 75;
    this.wrapIndent = config?.wrapIndent ?? 2;
  }

  /**
   * Renders the provided RenderData into an array of strings.
   *
   * @param data The RenderData to render.
   * @param currentIndent The current indentation level (relative to constructor).
   * @returns An array of formatted strings.
   */
  public render(data: RenderData, currentIndent: string = ''): string[] {
    // Convert to RenderRow[]
    const rows: RenderRow[] = Array.isArray(data) && data.length > 0 && Array.isArray(data[0])
      ? (data as RenderRow[])
      : [data as RenderRow];

    // Wrap each row into display lines
    const wrappedRows: string[][] = rows.map(row => this.wrapRow(row, currentIndent));

    // Distribute line budget via round-robin
    const allocatedLines = this.distributeLineBudget(wrappedRows);

    // Build final output with clipping and ellipsis
    const result: string[] = [];
    let totalLinesUsed = 0;

    for (let i = 0; i < wrappedRows.length; i++) {
      const rowLines = wrappedRows[i];
      const allocatedCount = allocatedLines[i];

      // Add allocated lines for this row
      for (let j = 0; j < allocatedCount && j < rowLines.length; j++) {
        result.push(rowLines[j]);
        totalLinesUsed++;
        if (totalLinesUsed >= this.lines) break;
      }

      // Check if row was clipped (more content than allocated)
      const rowWasClipped = allocatedCount < rowLines.length;

      // Add ellipsis if we still have budget and row was clipped
      if (rowWasClipped && totalLinesUsed < this.lines) {
        result.push(currentIndent + '...');
        totalLinesUsed++;
      }

      if (totalLinesUsed >= this.lines) break;
    }

    return result;
  }

  private wrapRow(row: RenderRow, baseIndent: string): string[] {
    const cells = this.rowStrings(row);
    const wrapIndentStr = ' '.repeat(this.wrapIndent);
    const lines: string[] = [];
    let currentLine = baseIndent;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const separator = currentLine === baseIndent ? '' : ' ';
      const testLine = currentLine + separator + cell;

      // Try to fit cell on current line
      if (this.lineWidth <= 0 || testLine.length <= this.lineWidth) {
        currentLine = testLine;
      } else {
        // Cell doesn't fit on current line
        if (currentLine !== baseIndent) {
          lines.push(currentLine);
        }
        currentLine = baseIndent + wrapIndentStr + cell;

        // If cell is still too wide for empty line, word-wrap it
        if (cell.length > this.lineWidth - baseIndent.length - this.wrapIndent) {
          const wrappedLines = this.wordWrapCell(cell, baseIndent + wrapIndentStr);
          lines.push(...wrappedLines.slice(0, -1));
          currentLine = wrappedLines[wrappedLines.length - 1];
        }
      }
    }

    if (currentLine !== baseIndent) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [baseIndent];
  }

  private wordWrapCell(cell: string, indent: string): string[] {
    const words = cell.split(' ');
    const lines: string[] = [];
    let currentLine = indent;

    for (const word of words) {
      const sep = currentLine === indent ? '' : ' ';
      const testLine = currentLine + sep + word;

      if (this.lineWidth <= 0 || testLine.length <= this.lineWidth) {
        currentLine = testLine;
      } else {
        if (currentLine !== indent) {
          lines.push(currentLine);
          currentLine = indent + word;
        } else {
          currentLine = indent + word;
        }
      }
    }

    if (currentLine !== indent) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [indent];
  }

  private distributeLineBudget(wrappedRows: string[][]): number[] {
    const rowCount = wrappedRows.length;
    const allocated = new Array(rowCount).fill(1);
    let remainingBudget = this.lines - rowCount;

    if (remainingBudget <= 0) {
      return allocated;
    }

    // Round-robin distribution of extra lines
    let pass = 0;
    while (remainingBudget > 0) {
      let distributed = 0;
      for (let i = 0; i < rowCount; i++) {
        if (remainingBudget <= 0) break;
        if (allocated[i] < wrappedRows[i].length) {
          allocated[i]++;
          remainingBudget--;
          distributed++;
        }
      }
      if (distributed === 0) break; // No more rows need extra lines
      pass++;
    }

    return allocated;
  }

  public cellString(data: RenderCell): string {
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'number') {
      return data.toFixed(this.precision);
    } else if (typeof data === 'boolean') {
      return data.toString();
    } else if (data instanceof FormaField) {
      const field = data as any;
      return this.zenoStep === ZENO_1_ROW_TERSE
        ? field.value
        : `${this.theme.nfLabel(field.label)}:${field.value}`;
    }

    return 'JSON:' + JSON.stringify(data);
  }

  public rowStrings(data: RenderRow): string[] {
    return data.map((item) => this.cellString(item));
  }

  private isObject(val: any): val is Record<string, any> {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  private formatValue(value: any): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (this.isObject(value)) return '{...}';
    return String(value);
  }
}
