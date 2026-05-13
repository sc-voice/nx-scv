import type { RenderData, RenderCell, RenderRow, ZenoStep } from './navigable-view.js';
import { ZENO_1_ROW_TERSE } from './navigable-view.js';

import { FormaField } from './forma-field.js';

/**
 * A renderer that converts complex, recursive RenderData into a flattened
 * array of strings suitable for TUI display.
 */
export interface LineRendererConfig {
  zenoStep?: ZenoStep;
  indentChar?: string;
  precision?: number;
}

/**
 * A renderer that converts complex, recursive RenderData into a flattened
 * array of strings suitable for TUI display.
 */
export class LineRenderer {
  public readonly zenoStep: ZenoStep;
  public readonly indentChar: string;
  public readonly precision: number;

  constructor(config: LineRendererConfig = {}) {
    this.zenoStep = config.zenoStep ?? ZENO_1_ROW_TERSE;
    this.indentChar = config.indentChar ?? '  ';
    this.precision = config.precision ?? 2;
  }

  /**
   * Renders the provided RenderData into an array of strings.
   *
   * @param data The RenderData to render.
   * @param currentIndent The current indentation level (relative to constructor).
   * @returns An array of formatted strings.
   */
  public render(data: RenderData, currentIndent: string = ''): string[] {
    const lines = [];

    // Check if data is RenderRow[] (array of arrays) or RenderRow (array of cells)
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      // RenderRow[]: array of rows
      for (const row of data) {
        lines.push(currentIndent + this.rowStrings(row as RenderRow).join(' '));
      }
    } else {
      // RenderRow: single row of cells
      lines.push(currentIndent + this.rowStrings(data as RenderRow).join(' '));
    }

    return lines;
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
        : `${field.label}:${field.value}`;
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
