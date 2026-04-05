/**
 * List module provides array-based data structures with formatted output capabilities.
 *
 * ListFactory creates and manages lists (arrays) with custom metadata and formatting:
 * - Columns: arrays with newline-separated output
 * - Rows: arrays with tab-separated output and optional column width alignment
 * - wrapping: transforms flat lists into 2D structures (row-major or column-major order)
 *
 * Each list includes properties for custom string representation, numeric precision,
 * element separators, and column alignment. The List class provides a singleton
 * interface to ListFactory for convenient access.
 */

import { ColorConsole } from './color-console.js';

const { cc } = ColorConsole;

// Singleton instance of ListFactory
let LIST_FACTORY_SINGLETON: ListFactory | undefined;

// Configuration options for ListFactory constructor
interface ListFactoryOpts {
  nColumns?: number;
  nRows?: number;
  nLists?: number;
  rowSeparator?: string;
  colSeparator?: string;
  order?: string;
  precision?: number;
}

// Options for creating lists, columns, and rows
interface CreateListOpts {
  name?: string;
  values?: any[];
  separator?: string;
  widths?: number[];
  precision?: number;
  showName?: boolean;
}

/**
 * ListFactory creates and manages array-based lists with custom properties
 * like name, separator, precision, and widths for formatted output
 */
export class ListFactory {
  nColumns!: number;
  nRows!: number;
  nLists!: number;
  order!: string;
  precision!: number;
  rowSeparator!: string;
  colSeparator!: string;

  constructor(opts: ListFactoryOpts = {}) {
    let {
      nColumns = 0,
      nRows = 0,
      nLists = 0,
      rowSeparator = '\n',
      colSeparator = ' ',
      order = 'column-major',
      precision = 3,
    } = opts;
    Object.assign(this, {
      nColumns,
      nRows,
      nLists,
      order,
      precision,
      rowSeparator,
      colSeparator,
    });
  }

  /**
   * Gets or creates the singleton ListFactory instance
   */
  static get SINGLETON(): ListFactory {
    if (LIST_FACTORY_SINGLETON == null) {
      LIST_FACTORY_SINGLETON = new ListFactory();
    }
    return LIST_FACTORY_SINGLETON;
  }

  /**
   * Creates a list (array) with custom toString/toStrings methods
   * and metadata properties (name, separator, precision, widths)
   */
  createList(opts: CreateListOpts = {}): any[] {
    let {
      name, // title
      values = [],
      separator = ',', // join() separator
      widths, // element string widths
      precision = this.precision, // numeric precision
    } = opts;

    let list: any[] = [...values];

    this.nLists++;
    if (name == null) {
      name = 'list' + this.nLists;
    }

    Object.defineProperty(list, 'name', {
      writable: true,
      value: name,
    });
    Object.defineProperty(list, 'precision', {
      writable: true,
      value: precision,
    });
    Object.defineProperty(list, 'separator', {
      writable: true,
      value: separator,
    });
    Object.defineProperty(list, 'widths', {
      writable: true,
      value: widths,
    });
    Object.defineProperty(list, 'toString', {
      value: () => {
        let strs = (list as any).toStrings();
        return strs.join((list as any).separator);
      },
    });
    Object.defineProperty(list, 'toStrings', {
      value: () => {
        let s5s: string[] = [];
        let { showName = false } = opts;
        let { name, widths } = list as any;

        if (showName) {
          s5s.push(name);
        }
        for (let i = 0; i < list.length; i++) {
          let v = list[i];
          let s = '';
          switch (typeof v) {
            case 'object':
              if (
                v?.constructor !== Object &&
                typeof v?.toString === 'function'
              ) {
                s = v.toString();
              } else {
                s = JSON.stringify(v);
              }
              break;
            case 'number':
              {
                let sRaw = precision ? (v as number).toFixed(precision) : v + '';
                let sShort = sRaw.replace(/\.?0+$/, '');
                s = Number(sShort) === v ? sShort : sRaw;
              }
              break;
            default:
              s += v;
              break;
          }
          let width = widths?.[i];
          if (width) {
            s = s.substring(0, width).padEnd(width);
          }
          s5s.push(s);
        }

        return s5s;
      },
    });

    return list;
  }

  /**
   * Creates a column (list with newline separator)
   */
  createColumn(opts: CreateListOpts = {}): any[] {
    let {
      name,
      values = [],
      separator = '\n',
      precision = this.precision,
    } = opts;

    this.nColumns++;
    if (name == null) {
      name = 'column' + this.nColumns;
    }
    return this.createList({
      name,
      precision,
      separator,
      values,
    });
  }

  /**
   * Creates a row (list with tab separator)
   */
  createRow(opts: CreateListOpts = {}): any[] {
    let {
      name,
      values = [],
      separator = '\t',
      widths,
      precision = this.precision,
    } = opts;

    this.nRows++;
    if (name == null) {
      name = 'row' + this.nRows;
    }
    return this.createList({
      name,
      precision,
      separator,
      values,
      widths,
    });
  }

  /**
   * Wraps a flat list into a 2D structure (rows of columns or columns of rows)
   * based on order ('row-major' or 'column-major') and maxValues per row/column.
   * Computes column widths for aligned output.
   */
  wrapList(list: any[], opts: CreateListOpts = {}): any[] {
    const msg = 'l9y.wrapList';
    const dbg = 0;
    let {
      name,
      precision = this.precision,
    } = opts;
    const maxValues = (opts as any).maxValues || 2;
    const namePrefix = (opts as any).namePrefix || 'column';
    const order = (opts as any).order || this.order;
    const rowSeparator = (opts as any).rowSeparator || this.rowSeparator;
    const colSeparator = (opts as any).colSeparator || this.colSeparator;

    let singleList = this.createColumn({
      name,
      separator: rowSeparator,
      precision,
    });
    let newRow = (separator: string) => this.createRow({ separator, precision });
    name = name || (singleList as any).name;
    switch (order) {
      case 'col-major':
      case 'column-major':
        {
          let transpose: any[] = [];
          let col: any[] | undefined;
          let nRows = Math.ceil(list.length / maxValues);
          dbg > 1 && cc.fyi1(msg + 0.1, { nRows });
          for (let i = 0; i < list.length; i++) {
            let ir = i % nRows;
            let ic = Math.floor(i / nRows) * nRows;
            let iList = ir + ic;
            if (ir === 0) {
              if (col) {
                transpose.push(col);
              }
              col = [];
            }
            col!.push(list[iList]);
          }
          if (col?.length) {
            transpose.push(col);
          }
          let row: any[] | undefined;
          for (let i = 0; i < nRows * maxValues; i++) {
            let ic = i % maxValues;
            if (ic === 0) {
              if (row) {
                singleList.push(row);
              }
              row = newRow(colSeparator);
            }
            let ir = Math.floor(i / maxValues);
            dbg > 1 && cc.fyi1(msg + 0.2, { ic, ir });
            let vc = transpose[ic];
            if (vc !== undefined) {
              let vr = vc[ir];
              vr && row!.push(vc[ir]);
            }
          }
          if (row?.length) {
            singleList.push(row);
          }
        }
        break;
      case 'row-major':
      default:
        {
          let row: any[] | undefined;
          for (let i = 0; i < list.length; i++) {
            let ic = i % maxValues;
            if (ic === 0) {
              if (row) {
                singleList.push(row);
              }
              row = newRow(colSeparator);
            }
            row!.push(list[i]);
          }
          if (row?.length) {
            singleList.push(row);
          }
        }
        break;
    }

    // compute row element widths
    let widths = new Array(maxValues).fill(0);
    (singleList as any).forEach((row: any) => {
      let strs = row.toStrings();
      strs.map((s: string, i: number) => {
        widths[i] = Math.max(s.length, widths[i]);
      });
    });
    (singleList as any).forEach((row: any) => {
      row.widths = widths;
    });
    dbg && cc.ok1(msg + 1, widths[0], maxValues, 'widths:', widths);

    return singleList;
  }
}

/**
 * List is a namespace wrapper that delegates to the ListFactory singleton
 */
export class List {
  /**
   * Creates a column using the singleton ListFactory
   */
  static createColumn(opts: CreateListOpts = {}): any[] {
    return ListFactory.SINGLETON.createColumn(opts);
  }

  /**
   * Creates a row using the singleton ListFactory
   */
  static createRow(opts: CreateListOpts = {}): any[] {
    return ListFactory.SINGLETON.createRow(opts);
  }

  /**
   * Wraps a flat list into a 2D structure using the singleton ListFactory
   */
  static wrapList(list: any[], opts: CreateListOpts = {}): any[] {
    return ListFactory.SINGLETON.wrapList(list, opts);
  }
}
