/**
 * MonoTable converts an array of Plain Old Javascript Objects (POJOs)
 * into a manipulable relation that can be formatted as a
 * monospaced table.
 * - automatically calculates column widths from data
 * - sort() rearranges rows in place
 * - groupBy() returns a new aggregated MonoTable
 * - filter() returns a new MonoTable with selected rows
 */

import type { INameFormaTheme } from './navigable-view.js';
import type { IReadOnlyNamespace } from './fuzzy-namespace.js';
import { NameFormaTheme } from './nameforma-theme.js';

/** A single column definition. */
export interface Header {
  /** The unique identifier for the column. */
  id: string;
  /** The display title for the column. */
  title?: string;
  /** The configured maximum width of the column. */
  maxWidth?: number;
  /** The calculated display width of the column, in characters. */
  width?: number;
  /** The zero-based index of the column. */
  index?: number;
  /** Aggregation type ('count', 'sum', 'avg', 'min', 'max', 'list', 'distinct') or false to skip aggregation. */
  aggregate?: boolean | string | Function;
  /** The ID of the source column used for aggregation. */
  aggId?: string;
  /** The aggregation function used. */
  aggFun?: Function;
}

/**
 * A single row of table data, keyed by header id.
 * A Row is just a generic Plain Old Java Object (POJO).
 */
export type Row = Record<string, unknown>;

/** Function that renders a separator line between rows. */
export type RowSeparatorFun = (
  row: Row,
  rowIndex: number,
) => string;

/** String or function to render between rows in hybrid layouts. */
export type RowSeparator = string | RowSeparatorFun;

/** Configuration options for a {@link MonoTable}. */
export interface TableOptions {
  /** A name to display at the start of the table. */
  name?: string;
  /** A summary to display at the end of the table. */
  summary?: string;
  /** Character used for overflowing text. */
  cellOverflow?: string;
  /** Character/string separating columns. */
  columnSeparator?: string;
  /** String or function to render between rows in hybrid layouts. */
  rowSeparator?: RowSeparator;
  /** Callback function to transform a cell value: (value, id) => string. */
  cellValue?: (value: unknown, id: string) => string;
  /** Character used for empty cells. */
  emptyCell?: string;
  /** Default values for an empty row. */
  emptyRow?: Row;
  /** Array of header definitions. */
  headers?: Header[];
  /** CSS text-transform case: 'none', 'uppercase', 'lowercase', 'capitalize'. */
  headerCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** Character/string separating lines. */
  lineSeparator?: string;
  /** Options passed to toLocaleString. */
  localeOptions?: object;
  /** Locales for toLocaleString. */
  locales?: string[];
  /** Maximum row width in characters (defaults to terminal width). */
  maxRowWidth?: number;
  /** Array of row objects. */
  rows?: Row[];
  /** Function to transform an ID into a name. */
  titleOfId?: (id: string) => string;
  /** Type identifier. */
  type?: string;
  /** Version identifier. */
  version?: string;
  /** Theme used to color table name, headers, and non-space separators. */
  theme?: INameFormaTheme;
  /** header title padding character */
  headerPad?: string;
}

/**
 * Plain data container for a table's fields. Holds no formatting/query
 * behavior — see {@link MonoTable} for that.
 */
export class TableDefaults implements TableOptions {
  summary?: string;
  cellOverflow!: string;
  columnSeparator!: string;
  rowSeparator?: RowSeparator;
  cellValue?: (value: unknown, id: string) => string;
  emptyCell!: string;
  emptyRow!: Row;
  headers!: Header[];
  headerCase!: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  lineSeparator!: string;
  localeOptions?: object;
  locales?: string[];
  maxRowWidth!: number;
  rows!: Row[];
  name?: string;
  titleOfId!: (id: string) => string;
  type!: string;
  version!: string;
  theme: INameFormaTheme = NameFormaTheme.shared;
  headerPad: string = '┄'; // perceived as an open and permeable boundary 

  /**
   * Creates an instance of TableDefaults, applying option defaults.
   * @param opts - Configuration options.
   */
  constructor(opts: TableOptions) {
    Object.assign(this, TableDefaults.options(opts));
  }

  /**
   * Provides default configuration options.
   * @param opts - Partial options to override defaults.
   * @returns The complete options object.
   */
  static options(opts: Partial<TableOptions> = {}): TableOptions {
    const {
      summary = undefined,
      cellOverflow = '…',
      columnSeparator = ' ',
      rowSeparator = undefined,
      cellValue = undefined,
      emptyCell = '⌿',
      emptyRow = {},
      headers = undefined,
      headerCase = 'capitalize',
      lineSeparator = '\n',
      localeOptions = undefined,
      locales = undefined,
      maxRowWidth = process.stdout.columns ?? 80,
      rows = [],
      name = undefined,
      titleOfId = MonoTable.titleOfId,
      type = 'MonoTable',
      version = '1.0.0',
      theme = NameFormaTheme.shared,
    } = opts;

    if (headers && !(headers instanceof Array)) {
      throw new Error(`[MonoTable.options] headers must be an Array`);
    }
    if (rows && !(rows instanceof Array)) {
      throw new Error(`[MonoTable.options] rows must be an Array`);
    }

    return {
      summary,
      cellOverflow,
      columnSeparator,
      rowSeparator,
      cellValue,
      emptyCell,
      emptyRow,
      headers,
      headerCase,
      lineSeparator,
      localeOptions,
      locales,
      maxRowWidth,
      rows,
      name,
      titleOfId,
      type,
      version,
      theme,
    };
  }
}

/**
 * A table utility for generating perfectly aligned monospaced text representations.
 * Provides methods for filtering, sorting, grouping, and formatting tabular data.
 * Rows are keyed by column IDs; columns are automatically sized based on content.
 */
export class MonoTable extends TableDefaults {
  /**
   * Creates an instance of MonoTable.
   * @param opts - Configuration options.
   */
  constructor(opts: TableOptions) {
    const msg = 'MonoTable.ctor';
    super(opts);
    this.type = 'MonoTable';
    this.version = '1.0.0';

    let { headers, rows } = this;

    // headers are owned by table
    this.headers = headers = headers
      ? JSON.parse(JSON.stringify(headers))
      : [];

    // Each row is owned by client, but the collection is owned by table
    rows = (rows && [...rows]) || [];
    let row0: unknown = rows[0];

    if (headers.length === 0) {
      let rowType = typeof row0;
      switch (rowType) {
        case 'object':
          headers = Object.keys(row0 as object).map((key) => ({
            id: key,
          }));
          break;
        case 'undefined': // empty table
          break;
        default:
          throw new Error(`${msg} [1]rowType ${row0}`);
      }
    }

    headers.forEach((h, i) => {
      h.id = h.id || h.title || '';
      h.maxWidth = h.maxWidth || 0;
      h.index = i;
    });

    Object.assign(this, { headers, rows });
  }

  /**
   * Creates a MonoTable from serialized JSON (toJSON() format).
   * @param json - Serialized table data (with array rows).
   * @returns A new MonoTable instance.
   */
  static fromJSON(json: any): MonoTable {
    const { headers = [], rows = [] } = json;
    const normalizedRows: Row[] = rows.map((row: any) =>
      headers.reduce((a: Row, h: Header, i: number) => {
        a[h.id] = row[i];
        return a;
      }, {}),
    );
    return new MonoTable({ ...json, headers, rows: normalizedRows });
  }

  /**
   * Finds a header object by its ID or index.
   * @param headers - The array of headers to search.
   * @param idOrIndex - The ID or index of the header.
   * @returns The found header or undefined.
   */
  static findHeader(
    headers: Header[],
    idOrIndex: string | number | Header,
  ): Header | undefined {
    switch (typeof idOrIndex) {
      case 'number':
        return headers[idOrIndex];
      case 'string':
        return headers.find((h) => h.id === idOrIndex);
      case 'object':
        return headers.find((h) => h.id === idOrIndex?.id);
      default:
        return undefined;
    }
  }

  /**
   * Strips ANSI escape sequences from a string to get display width.
   * @param str - The string to strip.
   * @returns The string with ANSI codes removed.
   */
  static stripAnsi(str: string): string {
    return str.replace(/\[[0-9;]*m/g, '');
  }

  /**
   * Pads a string by visible width (ignoring ANSI codes).
   * @param str - The string to pad.
   * @param width - The desired visible width.
   * @param start - If true, pad at the start; otherwise pad at the end.
   * @returns The padded string.
   */
  static padVisible(
    str: string, width: number, start = false, pad: string = ' '
  ): string {
    let visLen = MonoTable.stripAnsi(str).length;
    let fill = pad.repeat(Math.max(0, width - visLen));
    return start ? fill + str : str + fill;
  }

  /**
   * Transforms an ID into a Title (capitalizes first letter).
   * @param id - The ID to transform.
   * @returns The transformed title.
   */
  static titleOfId(id: string = ''): string {
    return id && id.length
      ? id.replace(/^./, id.at(0)!.toUpperCase())
      : id || '';
  }

  /**
   * Applies CSS text-transform case transformation to text.
   * @param text - The text to transform.
   * @param headerCase - The case style: 'none', 'uppercase', 'lowercase', 'capitalize'.
   * @returns The transformed text.
   */
  static applyHeaderCase(
    text: string,
    headerCase:
      | 'none'
      | 'uppercase'
      | 'lowercase'
      | 'capitalize' = 'capitalize',
  ): string {
    switch (headerCase) {
      case 'uppercase':
        return text.toUpperCase();
      case 'lowercase':
        return text.toLowerCase();
      case 'capitalize':
        return text
          .split(/\s+/)
          .map((word) =>
            word.length > 0
              ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              : word,
          )
          .join(' ');
      case 'none':
      default:
        return text;
    }
  }

  /**
   * Creates a MonoTable from an array of Plain Old Javascript Objects (POJOs).
   * @param rows - Array of row objects.
   * @param opts - Configuration options.
   * @returns A new MonoTable instance.
   */
  static fromRows(
    rows: Row[],
    opts: Partial<TableOptions> = {},
  ): MonoTable {
    return new MonoTable(Object.assign({}, opts, { rows }));
  }

  /**
   * Creates a MonoTable from a 2D array (array of arrays).
   * The first row is assumed to be the header row.
   * @param data - 2D array of data.
   * @param rawOpts - Configuration options.
   * @returns A new MonoTable instance.
   */
  static fromArray2(
    data: unknown[][],
    rawOpts?: Partial<TableOptions>,
  ): MonoTable {
    let opts = MonoTable.options(rawOpts);
    let { headers = [], emptyRow } = opts;

    if (!(data instanceof Array)) {
      throw new Error(`[MonoTable.fromArray2] data must be an Array`);
    }

    let rows: unknown[] = data;
    if (rows.length) {
      let row0 = rows[0];
      if (!(row0 instanceof Array)) {
        throw new Error(
          `[MonoTable.fromArray2] data must be Array[Array]`,
        );
      }
      if (headers.length === 0) {
        headers = row0.map((c) => {
          if (typeof c !== 'string') {
            throw new Error(
              `[MonoTable.fromArray2] header must be a string: ${c}`,
            );
          }
          return { id: c };
        });
      }
    }

    let dataRows: Row[] = (rows as unknown[][]).slice(1).map((row) =>
      row.reduce((a: Row, c, i) => {
        let hdr = headers[i];
        a[hdr.id] = c;
        return a;
      }, {}),
    );

    opts.headers = headers;
    return MonoTable.fromRows(dataRows, opts);
  }

  /**
   * Gets the number of rows in the table.
   */
  get length(): number {
    return this.rows.length;
  }

  /**
   * Resolves a header ID from a string or index.
   * @param idOrIndex - The ID or index.
   * @returns The resolved header ID.
   */
  headerId(idOrIndex: string | number): string | undefined {
    return typeof idOrIndex === 'string'
      ? idOrIndex
      : this.headers[idOrIndex]?.id;
  }

  /**
   * Returns a copy of the current options.
   * @param opts - Overrides for the current options.
   */
  options(opts?: Partial<TableOptions>): TableOptions {
    return MonoTable.options(Object.assign({}, this, opts));
  }

  /**
   * Retrieves a cell value at a specific row and column.
   * @param rowIndex - The index of the row.
   * @param idOrIndex - The ID or index of the column.
   * @param opts - Options including a custom cellValue callback.
   * @returns The cell value.
   */
  at(
    rowIndex: number,
    idOrIndex?: string | number,
    opts: Partial<TableOptions> = {},
  ): unknown {
    let { cellValue = this.cellValue } = opts;
    let row = this.rows[rowIndex];

    if (idOrIndex === undefined) {
      return row;
    }

    let id = this.headerId(idOrIndex);
    let cell = row && id !== undefined ? row[id] : undefined;

    return cellValue && id !== undefined ? cellValue(cell, id) : cell;
  }

  /**
   * Retrieves the string representation of a cell.
   * @param rowIndex - The index of the row.
   * @param idOrIndex - The ID or index of the column.
   * @param opts - Options including locales and emptyCell.
   * @returns The stringified cell value.
   */
  stringAt(
    rowIndex: number,
    idOrIndex: string | number | null | undefined,
    opts: Partial<TableOptions> = {},
  ): string | undefined {
    let {
      emptyCell = this.emptyCell,
      locales = this.locales,
      localeOptions = this.localeOptions,
    } = opts;

    if (idOrIndex == null) {
      return undefined;
    }

    let value: any = this.at(rowIndex, idOrIndex, opts);
    const toString = (v: any): string => {
      if (value == null) {
        return emptyCell;
      } else if (value.toLocaleString) {
        return value.toLocaleString(locales, localeOptions);
      } else if (value instanceof Array) {
        return value.join(',');
      } else {
        return String(value);
      }
    };

    return toString(value);
  }

  /**
   * @internal Calculates column widths, indices, and determines how many
   * columns fit within maxRowWidth (the "fit count" / overflowIndex).
   * Mutates headers[i].width and headers[i].index as a side effect.
   * @param opts - Options including titleOfId, emptyCell, maxRowWidth, columnSeparator.
   * @returns { overflowIndex } — index of the first column that overflows
   * maxRowWidth. Equals headers.length for Full Fit, 0 for Zero Fit.
   */
  _calculateLayout(opts: Partial<TableOptions> = {}): {
    overflowIndex: number;
  } {
    let { headers, rows } = this;
    let {
      titleOfId = this.titleOfId,
      emptyCell = this.emptyCell,
      maxRowWidth = this.maxRowWidth,
      columnSeparator = this.columnSeparator,
    } = opts;

    // Calculate intrinsic column widths from headers and data
    for (let i = 0; i < headers.length; i++) {
      let h = headers[i];
      let title = h.title || titleOfId(h.id) || emptyCell;
      h.width = MonoTable.stripAnsi(title).length;
      h.index = i;
    }

    for (let iRow = 0; iRow < rows.length; iRow++) {
      for (let i = 0; i < headers.length; i++) {
        let h = headers[i];
        let datum = this.stringAt(iRow, h.id, opts) ?? '';
        h.width = Math.max(
          h.width ?? 0,
          MonoTable.stripAnsi(datum).length,
        );
      }
    }

    // Determine overflowIndex: first column that exceeds maxRowWidth
    const sepWidth = MonoTable.stripAnsi(columnSeparator).length;
    let runningTotal = 0;
    let overflowIndex = headers.length;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      runningTotal += sepWidth + (h.width ?? 0);
      if (runningTotal > maxRowWidth) {
        overflowIndex = i;
        break;
      }
    }

    return { overflowIndex };
  }

  /**
   * Renders an overflow cell by combining label and value, wrapping to
   * maxRowWidth, and prefixing each line with the styled columnSeparator.
   * @param header - Column header containing the label.
   * @param value - Cell value to render.
   * @param opts - Options including maxRowWidth, columnSeparator, theme.
   * @returns Array of wrapped, prefixed lines.
   */
  renderOverflowCell(
    header: Header,
    value: unknown,
    opts: Partial<TableOptions> = {},
  ): string[] {
    const {
      maxRowWidth = this.maxRowWidth,
      columnSeparator = this.columnSeparator,
      emptyCell = this.emptyCell,
      theme = NameFormaTheme.shared,
    } = opts;

    const label = header.title || header.id;
    const styledLabel = theme.nfLabel(label);

    let stringValue = '';
    if (value == null) {
      stringValue = emptyCell;
    } else if (typeof value === 'string') {
      stringValue = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      stringValue = String(value);
    } else if (value instanceof Array) {
      stringValue = value.join(',');
    } else {
      stringValue = JSON.stringify(value);
    }

    const content = styledLabel + stringValue;

    const sepWidth = MonoTable.stripAnsi(columnSeparator).length;
    const wrapWidth = maxRowWidth - sepWidth;

    if (wrapWidth <= 0) {
      const styledSep = theme.nfBoundary(columnSeparator);
      return [styledSep + content];
    }

    // Split on spaces and greedily fit words to wrapWidth
    const words = content.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const sep = currentLine === '' ? '' : ' ';
      const testLine = currentLine + sep + word;

      if (MonoTable.stripAnsi(testLine).length <= wrapWidth) {
        currentLine = testLine;
      } else {
        if (currentLine !== '') {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine !== '') {
      lines.push(currentLine);
    }

    // Prefix each line with styled columnSeparator
    const styledSep = theme.nfBoundary(columnSeparator);
    return lines.map((line) => styledSep + line);
  }

  /**
   * Creates a row separator function that formats as "─ROW X / TOTAL─".
   * Useful for visually marking row boundaries in hybrid/multi-line layouts.
   * @param totalRows - Total number of rows.
   * @returns Function that formats a separator line (can be passed as `rowSeparator` option).
   */
  createRowSeparator(totalRows: number, template?: string): RowSeparatorFun {
    const { headerPad, maxRowWidth, theme } = this;
    return (row: Row, rowIndex: number, headerText?: string) => {
      const rowNum = rowIndex + 1;
      const label = `${rowNum}/${totalRows}`;
      let boundary = template;
      if (boundary == null) {
        boundary = '╭' + headerPad.repeat(Math.max(1, maxRowWidth - 1));
      }
      return theme.nfBoundary(boundary.slice(0, -label.length) + label);
    };
  }

  /**
   * Renders header row string.
   */
  private _headerLine(overflowIndex: number): string | undefined {
    const { 
      columnSeparator, headerCase, headerPad, headers, theme, maxRowWidth 
    } = this;
    if (headers.length === 0) {
      return undefined;
    }

    const fitHeaders = headers.slice(0, overflowIndex);
    const hasOverflow = overflowIndex < headers.length;
    const colTitles = fitHeaders.map((h) => {
      let datum =
        h.title || (headerCase === 'none' ? h.id : this.titleOfId!(h.id));
      datum = MonoTable.applyHeaderCase(datum, headerCase);
      return MonoTable.padVisible(datum, h.width ?? 0, false, headerPad);
    });
    const lineText = '╭' + colTitles.join(columnSeparator);
    const line = MonoTable.padVisible(lineText, maxRowWidth, false, headerPad);
    return theme.nfBoundary(line);
  }

  /**
   * Transforms the table into an array of formatted strings (rows).
   * @param rawOpts - Formatting options.
   * @returns Array of strings, each representing a row.
   */
  asLines(rawOpts?: Partial<TableOptions>): string[] {
    let opts = MonoTable.options(Object.assign({}, this, rawOpts));
    let {
      name,
      titleOfId,
      columnSeparator = ' ',
      rowSeparator,
      cellValue,
      headers = [],
      headerCase = 'capitalize',
      rows = [],
      locales,
      localeOptions,
      summary,
      theme = NameFormaTheme.shared,
    } = opts;

    const { overflowIndex } = this._calculateLayout(opts);
    const hasOverflow = overflowIndex < headers.length;

    let lines: string[] = [];
    if (name) {
      lines.push(theme.nfBoundary(name));
    }

    // Render header line (fit columns only; overflow columns show labels inline)
    const headerLine = this._headerLine(overflowIndex);
    // Resolve effective row separator: user-provided or auto-default in overflow
    let rSep = rowSeparator;
    if (rSep == null && hasOverflow && headerLine != null) {
      const headerText = MonoTable.stripAnsi(headerLine!);
      rSep = this.createRowSeparator(rows.length, headerText);
    }

    if (headerLine && !hasOverflow) {
      lines.push(headerLine);
    }

    // Render each row with fit and overflow cells
    for (let iRow = 0; iRow < rows.length; iRow++) {
      let row = rows[iRow];

      // Render row separator if set
      if (rSep) {
        const sepLine = typeof rSep === 'function' ? rSep(row, iRow) : rSep;
        lines.push(sepLine);
      }

      // Render fit row (columns that fit within maxRowWidth)
      if (overflowIndex > 0) {
        let data: string[] = [];
        for (let iCol = 0; iCol < overflowIndex; iCol++) {
          const h = headers[iCol];
          let text =
            this.stringAt(iRow, h.id, {
              cellValue,
              locales,
              localeOptions,
            }) ?? '';
          if (typeof row[h.id] === 'number') {
            data.push(MonoTable.padVisible(text, h.width ?? 0, true));
          } else {
            data.push(MonoTable.padVisible(text, h.width ?? 0));
          }
        }
        let sep = columnSeparator.trim()
          ? theme.nfBoundary(columnSeparator)
          : columnSeparator;
        lines.push(sep + data.join(sep));
      }

      // Render overflow cells (columns beyond fit)
      for (let iCol = overflowIndex; iCol < headers.length; iCol++) {
        const h = headers[iCol];
        const value = row[h.id];
        const overflowLines = this.renderOverflowCell(h, value, opts);
        lines.push(...overflowLines);
      }

    }

    summary && lines.push(theme.nfNote(summary));

    return lines;
  }

  /**
   * Returns a new MonoTable containing only rows that match the predicate.
   * @param f - Predicate function.
   * @param opts - Configuration options.
   */
  filter(
    f: (row: Row) => boolean = (row) => true,
    opts: Partial<TableOptions> = {},
  ): MonoTable {
    let mergedOpts = this.options(opts);
    mergedOpts.rows = this.rows.filter(f);
    return new MonoTable(mergedOpts);
  }

  /**
   * Creates a comparator function for sorting by one or more columns.
   * @param cols - Columns to sort by.
   * @returns A comparator function (a, b) => number.
   */
  colComparator(
    cols: (string | number | { id: string; descending?: boolean })[],
  ): (a: Row, b: Row) => number {
    let keys = cols.map((c) => {
      switch (typeof c) {
        case 'string':
        case 'number':
          return {
            id: this.headerId(c),
            descending: false,
          };
        default:
          return c;
      }
    });

    return (a: Row, b: Row) => {
      for (let i = 0; i < keys.length; i++) {
        let { id, descending } = keys[i];
        let ak: any = id !== undefined ? a[id] : undefined;
        let bk: any = id !== undefined ? b[id] : undefined;
        if (ak !== bk) {
          let ascending = descending ? -1 : 1;
          if (ak && bk == null) {
            return ascending;
          } else if (ak == null && bk) {
            return -ascending;
          } else {
            return ak < bk ? -ascending : ascending;
          }
        }
      }
      return 0;
    };
  }

  /**
   * Sorts the table rows in place.
   * @param compare - Comparator function. If omitted, sorts by all columns.
   */
  sort(compare?: (a: Row, b: Row) => number): MonoTable {
    if (compare == null) {
      compare = this.colComparator(this.headers);
    }
    this.rows.sort(compare);
    return this;
  }

  /**
   * Formats the table into a single string.
   * @param opts - Formatting options.
   */
  format(opts?: Partial<TableOptions>): string {
    let mergedOpts = this.options(opts);
    let lines = this.asLines(mergedOpts);
    return lines.join(mergedOpts.lineSeparator!);
  }

  /**
   * Serializes the table to a JSON-compatible object.
   * Converts row objects back into arrays based on header order.
   */
  toJSON(): object {
    let json: any = this.options();
    let okeys = Object.keys(json);
    okeys.forEach((key) => {
      let v = json[key];
      if (typeof v === 'function' || v === undefined) {
        delete json[key];
      }
    });

    let hdrMap = json.headers.reduce(
      (a: Record<string, number>, h: Header, i: number) => {
        a[h.id] = i;
        return a;
      },
      {},
    );

    let keys = Object.keys(hdrMap);
    json.rows = json.rows.map((row: Row) => [...keys.map((k) => row[k])]);

    return json;
  }

  /**
   * Groups rows by specified columns and applies aggregation functions.
   * Sorts the table by group columns, then emits one output row per distinct group.
   * @param grpCols - Column IDs or indices to group by.
   * @param aggCols - Aggregation specifications; if omitted, defaults to 'count' for all non-grouped columns.
   * @returns A new MonoTable with grouped rows and aggregated columns.
   */
  groupBy(
    grpCols: (string | number | Header)[],
    aggCols?: (
      | string
      | number
      | { id?: string | number; aggregate?: string | Function }
    )[],
  ): MonoTable {
    let { grpHdrs, aggHdrs, dstHdrs } = this.#groupByHeaders(
      grpCols,
      aggCols,
    );

    this.sort(this.colComparator(grpHdrs));
    let agg: Row | undefined;
    let groupCount = 0;
    let rows: Row[] = [];
    for (let i = 0; i <= this.rows.length; i++) {
      let inf = this.rows[i];
      let inGroup = !!agg && !!inf;
      if (inGroup) {
        for (let j = 0; j < grpHdrs.length; j++) {
          let { id } = grpHdrs[j];
          if (agg![id] !== inf[id]) {
            inGroup = false;
            break;
          }
        }
      }
      if (inGroup) {
        for (let j = 0; j < dstHdrs.length; j++) {
          let { aggId, id, aggFun } = dstHdrs[j];
          if (aggFun) {
            agg![id] = (aggFun as any)(agg![id], inf[aggId!], groupCount);
          }
        }
        groupCount++;
      } else {
        if (agg) {
          // emit existing aggregate
          rows.push(agg);
        }
        if (inf) {
          // new aggregate
          agg = {};
          for (let j = 0; j < dstHdrs.length; j++) {
            let { aggId, id, aggFun } = dstHdrs[j];
            if (aggFun) {
              agg[id] = (aggFun as any)(undefined, inf[aggId!], 0);
            } else {
              agg[id] = inf[id];
            }
          }
          groupCount = 1;
        }
      }
    }

    let opts = this.options();
    opts.rows = rows;
    opts.headers = dstHdrs;

    return new MonoTable(opts);
  }

  /**
   * Builds group-by and aggregate headers, resolving aggregate types to functions.
   * @param grpCols - Columns to group by.
   * @param aggCols - Aggregation specifications.
   * @returns {grpHdrs, aggHdrs, dstHdrs} grouped and aggregated headers.
   */
  #groupByHeaders(
    grpCols: (string | number | Header)[],
    aggCols?: (
      | string
      | number
      | { id?: string | number; aggregate?: string | Function }
    )[],
  ): {
    grpHdrs: Header[];
    aggHdrs: Header[];
    dstHdrs: Header[];
  } {
    let srcHdrs = JSON.parse(JSON.stringify(this.headers)) as Header[];
    let grpHdrs = grpCols.map((c) => {
      let hdr = MonoTable.findHeader(srcHdrs, c as any);
      if (hdr == null) {
        throw new Error(`#groupByHeaders: header not found: ${hdr}`);
      }
      hdr.aggregate = false;
      return hdr;
    });
    if (aggCols == null) {
      aggCols = srcHdrs.filter((h) => {
        if (h.aggregate === false) {
          return false;
        }
        h.aggregate = 'count';
        return true;
      }) as any;
    }
    let aggHdrs = (aggCols as any[]).map((c, i) => {
      let hdr = MonoTable.findHeader(srcHdrs, c);
      if (hdr == null) {
        throw new Error(
          `#groupByHeaders: header not found: ${JSON.stringify(c)}`,
        );
      }
      let { aggregate, title, id } = hdr;
      aggregate = aggregate || c?.aggregate || 'list';
      if (title == null) {
        title =
          typeof aggregate === 'string'
            ? `${aggregate}(${id})`
            : `F${i}(${id})`;
      }
      if (typeof aggregate === 'string') {
        aggregate = aggregate.toLowerCase();
      }
      let aggFun: Function = aggregate as any;
      switch (aggregate) {
        case 'min':
          aggFun = (a: any, v: any, i: number) => {
            if (a == null) {
              return v;
            }
            if (v == null) {
              return a;
            }
            return Math.min(a, Number(v));
          };
          break;
        case 'max':
          aggFun = (a: any, v: any, i: number) =>
            Math.max(Number(a || 0), Number(v));
          break;
        case 'avg':
        case 'sum':
          aggFun = (() => {
            let total: number;
            let count: number;
            let isAvg = aggregate === 'avg';
            return (a: any, v: any, i: number) => {
              if (i === 0) {
                total = 0;
                count = 0;
              }
              if (v == null) {
                return a;
              }
              total += v;
              count++;
              return isAvg ? total / count : total;
            };
          })();
          break;
        case 'count':
          aggFun = (a: any, v: any, i: number) => {
            return v == null ? a || 0 : (a || 0) + 1;
          };
          break;
        case 'list':
        case 'distinct':
          aggFun = (() => {
            let map: Record<string, boolean>;
            return (a: any, v: any, i: number) => {
              if (i === 0) {
                map = {};
                a = [];
              }
              if (v != null) {
                if (map[v] == null) {
                  map[v] = true;
                  a.push(v);
                }
              }
              return a;
            };
          })();
          break;
        default: {
          let t = typeof aggregate;
          aggFun =
            t === 'function'
              ? (aggregate as Function)
              : (a: any, v: any, i: number) =>
                  `${JSON.stringify(aggregate)}? ${t}`;
          break;
        }
      }
      return {
        id: `A#${i}`,
        title,
        aggFun,
        aggregate,
        aggId: id,
      } as Header;
    });
    let dstHdrs = [...grpHdrs, ...aggHdrs];
    return { grpHdrs, aggHdrs, dstHdrs };
  }
} // MonoTable
