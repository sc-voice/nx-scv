import type { RenderData } from './navigable-view.js';

import { FormaField } from './forma-field.js';

/**
 * A renderer that converts complex, recursive RenderData into a flattened 
 * array of strings suitable for TUI display.
 */
export interface LineRendererConfig {
  indentChar?: string;
  precision?: number;
}

/**
 * A renderer that converts complex, recursive RenderData into a flattened 
 * array of strings suitable for TUI display.
 */
export class LineRenderer {
  public readonly indentChar: string;
  public readonly precision: number;

  constructor(config: LineRendererConfig = {}) {
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

    if (Array.isArray(data)) {
      for (const item of data) {
        lines.push(currentIndent + this.rowStrings(item).join(' '));
      }
    } else {
      lines.push(currentIndent + this.rowStrings(data).join(' '));
    }

    return lines;
  }

  public cellString(data: RenderData): string {
    const strings: string[] = [];

    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'number') {
      return data.toFixed(this.precision);
    } else if (typeof data === 'boolean') {
      return data.toString();
    } else if (data instanceof FormaField) {
      const field = data as any; // Cast to access properties easily for this check
      return `${field.label}:${field.value}`;
    } else if (Array.isArray(data)) {
      return [
        '[',
        data.map(item=>this.cellString(item)).join(', '),
        ']',
      ].join('');
    }

    return "JSON:" + JSON.stringify(data);
  }

  public rowStrings(data: RenderData): string[] {
    const strings: string[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        strings.push(this.cellString(item));
      }
    } else {
      strings.push(this.cellString(data));
    }

    return strings;
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
