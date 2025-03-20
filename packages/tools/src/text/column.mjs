import { ColorConsole } from './color-console.mjs';
const { cc } = ColorConsole;

export class Column {
  static instances = 0;
  constructor(opts = {}) {
    let { name, rows = [], separator = ',' } = opts;

    Column.instances++;
    if (name == null) {
      name = 'column' + Column.instances;
    }

    Object.assign(this, {
      name,
      rows,
      separator,
    });
  }

  static fromWrappedList(list, opts = {}) {
    const msg = 'c4n.fromWrappedList';
    const dbg = 0;
    let {
      name = 'columns',
      nColumns = 2,
      namePrefix = 'column',
      order = 'row-major',
      separator,
    } = opts;

    let singleColumn = new Column({ name, separator });
    switch (order) {
      case 'col-major':
      case 'column-major':
        {
          let transpose = [];
          let col;
          let nRows = Math.ceil(list.length / nColumns);
          dbg && cc.fyi1(msg + 0.1, { nRows });
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
            col.push(list[iList]);
          }
          if (col?.length) {
            transpose.push(col);
          }
          let row;
          for (let i = 0; i < nRows * nColumns; i++) {
            let ic = i % nColumns;
            if (ic === 0) {
              if (row) {
                singleColumn.push(row);
              }
              row = [];
            }
            let ir = Math.floor(i / nColumns);
            dbg && cc.fyi1(msg + 0.1, { ic, ir });
            let vc = transpose[ic];
            if (vc !== undefined) {
              let vr = vc[ir];
              vr && row.push(vc[ir]);
            }
          }
          if (row?.length) {
            singleColumn.push(row);
          }
        }
        break;
      case 'row-major':
      default:
        {
          let row;
          for (let i = 0; i < list.length; i++) {
            let ic = i % nColumns;
            if (ic === 0) {
              if (row) {
                singleColumn.push(row);
              }
              row = [];
            }
            row.push(list[i]);
          }
          if (row?.length) {
            singleColumn.push(row);
          }
        }
        break;
    }

    return singleColumn;
  }

  toStrings(opts = {}) {
    let s5s = [];
    let { showName = false } = opts;
    let { name, rows } = this;

    if (showName) {
      s5s.push(name);
    }
    for (let i = 0; i < rows.length; i++) {
      let v = rows[i];
      switch (typeof v) {
        case 'object':
          if (
            v?.constructor !== Object &&
            typeof v?.toString === 'function'
          ) {
            s5s.push(v.toString());
          } else {
            s5s.push(JSON.stringify(v));
          }
          break;
        default:
          s5s.push('' + v);
          break;
      }
    }

    return s5s;
  }

  push(...args) {
    for (let i = 0; i < args.length; i++) {
      this.rows.push(args[i]);
    }
  }

  toString() {
    let { rows, separator } = this;
    return rows.join(separator);
  }
}
