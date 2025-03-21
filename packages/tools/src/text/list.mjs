import { ColorConsole } from './color-console.mjs';
const { cc } = ColorConsole;

var LIST_FACTORY_SINGLETON;

/* Array decorator
 */
export class ListFactory {
  constructor(opts={}) {
    let {
      nColumns = 0,
      nRows = 0,
      nLists = 0,
    } = opts;
    Object.assign(this, {
      nColumns,
      nRows,
      nLists,
    });
  }

  static get SINGLETON() {
    if (LIST_FACTORY_SINGLETON == null) {
      LIST_FACTORY_SINGLETON = new ListFactory;
    }
    return LIST_FACTORY_SINGLETON;
  }

  createList(opts = {}) {
    let { name, values=[], separator = ',' } = opts;

    let list = [...values];

    this.nLists++;
    if (name == null) {
      name = 'list' + this.nLists;
    }

    Object.defineProperty(list, 'name', {
      writeable: true,
      value: name,
    });
    Object.defineProperty(list, 'separator', {
      writeable: true,
      value: separator,
    });
    Object.defineProperty(list, 'toString', {
      value: () => {
        return list.join(list.separator);
      }
    });
    Object.defineProperty(list, 'toStrings', {
      value: () => {
        let s5s = [];
        let { showName = false } = opts;
        let { name } = list;

        if (showName) {
          s5s.push(name);
        }
        for (let i = 0; i < list.length; i++) {
          let v = list[i];
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

    });

    return list;
  }

  createColumn(opts = {}) {
    let { name, values=[], separator = '\n' } = opts;

    this.nColumns++;
    if (name == null) {
      name = 'column' + this.nColumns;
    }
    return this.createList({name, values, separator});
  }

  createRow(opts = {}) {
    let { name, values=[], separator = '\t' } = opts;

    this.nRows++;
    if (name == null) {
      name = 'row' + this.nRows;
    }
    return this.createList({name, values, separator});
  }

  wrapList(list, opts = {}) {
    const msg = 'l9y.wrapList';
    const dbg = 0;
    let {
      name,
      rowSize = 2,
      namePrefix = 'column',
      order = 'row-major',
      separator,
    } = opts;

    let singleList = List.createColumn({ name, separator });
    name = name || singleList.name;
    separator = separator || singleList.separator;
    switch (order) {
      case 'col-major':
      case 'column-major':
        {
          let transpose = [];
          let col;
          let nRows = Math.ceil(list.length / rowSize);
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
            col.push(list[iList]);
          }
          if (col?.length) {
            transpose.push(col);
          }
          let row;
          for (let i = 0; i < nRows * rowSize; i++) {
            let ic = i % rowSize;
            if (ic === 0) {
              if (row) {
                singleList.push(row);
              }
              row = List.createRow({values:[]});
            }
            let ir = Math.floor(i / rowSize);
            dbg > 1 && cc.fyi1(msg + 0.2, { ic, ir });
            let vc = transpose[ic];
            if (vc !== undefined) {
              let vr = vc[ir];
              vr && row.push(vc[ir]);
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
          let row;
          for (let i = 0; i < list.length; i++) {
            let ic = i % rowSize;
            if (ic === 0) {
              if (row) {
                singleList.push(row);
              }
              row = List.createRow({values:[]});
            }
            row.push(list[i]);
          }
          if (row?.length) {
            singleList.push(row);
          }
        }
        break;
    }

    return singleList;
  }
}

export class List { // namespace wrapper for ListFactory
  static createColumn(opts = {}) {
    return ListFactory.SINGLETON.createColumn(opts);
  }

  static createRow(opts = {}) {
    return ListFactory.SINGLETON.createRow(opts);
  }

  static wrapList(list, opts = {}) {
    return ListFactory.SINGLETON.wrapList(list, opts); 
  }
}
