/**
 * A table utility designed for generating perfectly aligned, monospaced text representations.
 * It operates on a grid-based model, ensuring columns line up by calculating character widths.
 */

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

/** A single row of table data, keyed by header id. */
export type Row = Record<string, unknown>;

/** Configuration options for a {@link MonoTable}. */
export interface TableOptions {
  /** A caption to display at the end of the table. */
  caption?: string;
  /** Character used for overflowing text. */
  cellOverflow?: string;
  /** Character/string separating columns. */
  columnSeparator?: string;
  /** Callback function to transform a cell value: (value, id) => string. */
  cellValue?: (value: unknown, id: string) => string;
  /** Character used for empty cells. */
  emptyCell?: string;
  /** Default values for an empty row. */
  emptyRow?: Row;
  /** Array of header definitions. */
  headers?: Header[];
  /** Character/string separating lines. */
  lineSeparator?: string;
  /** Options passed to toLocaleString. */
  localeOptions?: object;
  /** Locales for toLocaleString. */
  locales?: string[];
  /** Array of row objects. */
  rows?: Row[];
  /** A title to display at the start of the table. */
  title?: string;
  /** Function to transform an ID into a title. */
  titleOfId?: (id: string) => string;
  /** Type identifier. */
  type?: string;
  /** Version identifier. */
  version?: string;
}

/**
 * Plain data container for a table's fields. Holds no formatting/query
 * behavior — see {@link MonoTable} for that.
 */
export class BaseTable implements TableOptions {
  caption?: string;
  cellOverflow!: string;
  columnSeparator!: string;
  cellValue?: (value: unknown, id: string) => string;
  emptyCell!: string;
  emptyRow!: Row;
  headers!: Header[];
  lineSeparator!: string;
  localeOptions?: object;
  locales?: string[];
  rows!: Row[];
  title?: string;
  titleOfId!: (id: string) => string;
  type!: string;
  version!: string;

  /**
   * Creates an instance of BaseTable, applying option defaults.
   * @param opts - Configuration options.
   */
  constructor(opts: TableOptions) {
    Object.assign(this, BaseTable.options(opts));
  }

  /**
   * Provides default configuration options.
   * @param opts - Partial options to override defaults.
   * @returns The complete options object.
   */
  static options(opts: Partial<TableOptions> = {}): TableOptions {
    const {
      caption = undefined,
      cellOverflow = '…',
      columnSeparator = ' ',
      cellValue = undefined,
      emptyCell = '⌿',
      emptyRow = {},
      headers = undefined,
      lineSeparator = '\n',
      localeOptions = undefined,
      locales = undefined,
      rows = [],
      title = undefined,
      titleOfId = MonoTable.titleOfId,
      type = 'MonoTable',
      version = '1.0.0',
    } = opts;

    if (headers && !(headers instanceof Array)) {
      throw new Error(`[MonoTable.options] headers must be an Array`);
    }
    if (rows && !(rows instanceof Array)) {
      throw new Error(`[MonoTable.options] rows must be an Array`);
    }

    return {
      caption,
      cellOverflow,
      columnSeparator,
      cellValue,
      emptyCell,
      emptyRow,
      headers,
      lineSeparator,
      localeOptions,
      locales,
      rows,
      title,
      titleOfId,
      type,
      version,
    };
  }
}

export default class MonoTable extends BaseTable {
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

    if (row0 instanceof Array) {
      // toJSON() format (array of arrays)
      rows = rows.map((row: any) =>
        headers.reduce((a: Row, h, i) => {
          a[h.id] = row[i];
          return a;
        }, {}),
      );
    }

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
   * Creates a MonoTable from an array of rows.
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

    let cell: any = this.at(rowIndex, idOrIndex, opts);
    let text: string;

    if (cell == null) {
      text = emptyCell;
    } else if (cell.toLocaleString) {
      text = cell.toLocaleString(locales, localeOptions);
    } else if (cell instanceof Array) {
      text = cell.join(', ');
    } else {
      text = String(cell);
    }

    return text;
  }

  /**
   * Adds a new header to the table.
   * @param hdr - The header object to add.
   */
  addHeader(hdr: Header): void {
    this.headers.push(hdr);
    this.#updateHeaders();
  }

  /**
   * Recalculates column widths and indices.
   * @param opts - Options for updating.
   */
  #updateHeaders(opts: Partial<TableOptions> = {}): void {
    let { headers, rows } = this;
    let { titleOfId = this.titleOfId, emptyCell = this.emptyCell } = opts;

    for (let i = 0; i < headers.length; i++) {
      let h = headers[i];
      let title = h.title || titleOfId(h.id) || emptyCell;
      h.width = title.length;
      h.index = i;
    }

    for (let iRow = 0; iRow < rows.length; iRow++) {
      for (let i = 0; i < headers.length; i++) {
        let h = headers[i];
        let datum = this.stringAt(iRow, h.id, opts) ?? '';
        h.width = Math.max(h.width ?? 0, datum.length);
      }
    }
  }

  /**
   * Transforms the table into an array of formatted strings (rows).
   * @param rawOpts - Formatting options.
   * @returns Array of strings, each representing a row.
   */
  asColumns(rawOpts?: Partial<TableOptions>): string[] {
    let opts = MonoTable.options(Object.assign({}, this, rawOpts));
    let {
      title,
      titleOfId,
      columnSeparator,
      cellValue,
      headers = [],
      rows = [],
      locales,
      localeOptions,
      caption,
    } = opts;

    this.#updateHeaders(opts);

    let lines: string[] = [];
    title && lines.push(title);

    if (headers.length) {
      let colTitles = headers.map((h) => {
        let datum = h.title || titleOfId!(h.id);
        return datum.padEnd(h.width ?? 0);
      });
      lines.push(colTitles.join(columnSeparator));
    }

    for (let iRow = 0; iRow < rows.length; iRow++) {
      let row = rows[iRow];
      let data: string[] = [];
      headers.forEach((h) => {
        let text =
          this.stringAt(iRow, h.id, {
            cellValue,
            locales,
            localeOptions,
          }) ?? '';
        if (typeof row[h.id] === 'number') {
          data.push(text.padStart(h.width ?? 0));
        } else {
          data.push(text.padEnd(h.width ?? 0));
        }
      });
      lines.push(data.join(columnSeparator));
    }

    caption && lines.push(caption);

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
    let lines = this.asColumns(mergedOpts);
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
}
