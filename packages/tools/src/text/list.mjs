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

  static get SINGLETON() {
    if (LIST_FACTORY_SINGLETON == null) {
      LIST_FACTORY_SINGLETON = new ListFactory;
    }
    return LIST_FACTORY_SINGLETON;
  }

  createList(opts = {}) {
    let { 
      name, // title
      values=[], 
      separator = ',', // join() separator
      widths, // element string widths
      precision = this.precision, // numeric precision
    } = opts;

    let list = [...values];

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
        let strs = list.toStrings();
        return strs.join(list.separator);
      }
    });
    Object.defineProperty(list, 'toStrings', {
      value: () => {
        let s5s = [];
        let { showName = false } = opts;
        let { name, widths } = list;

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
            case 'number': {
              let sRaw = precision ? v.toFixed(precision) : v+'';
              let sShort = sRaw.replace(/\.?0+$/, '');
              s = Number(sShort) === v ? sShort : sRaw;
            }
            break;
            default:
              s +=  v;
              break;
          }
          let width = widths?.[i];
          if (width) {
            s = s.substring(0,width).padEnd(width);
          }
          s5s.push(s);
        }


        return s5s;
      }

    });

    return list;
  }

  createColumn(opts = {}) {
    let { 
      name, 
      values=[], 
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

  createRow(opts = {}) {
    let { 
      name, 
      values=[], 
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

  wrapList(list, opts = {}) {
    const msg = 'l9y.wrapList';
    const dbg = 0;
    let {
      name,
      maxValues = 2,
      namePrefix = 'column',
      order = this.order,
      rowSeparator = this.rowSeparator,
      colSeparator = this.colSeparator,
      precision = this.precision,
    } = opts;

    let singleList = this.createColumn({ 
      name, 
      separator:rowSeparator,
      precision,
    });
    let newRow = (separator) => this.createRow({ separator, precision });
    name = name || singleList.name;
    switch (order) {
      case 'col-major':
      case 'column-major':
        {
          let transpose = [];
          let col;
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
            col.push(list[iList]);
          }
          if (col?.length) {
            transpose.push(col);
          }
          let row;
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
            let ic = i % maxValues;
            if (ic === 0) {
              if (row) {
                singleList.push(row);
              }
              row = newRow(colSeparator);
            }
            row.push(list[i]);
          }
          if (row?.length) {
            singleList.push(row);
          }
        }
        break;
    }

    // compute row element widths
    let widths = new Array(maxValues).fill(0);
    singleList.forEach(row => {
      let strs = row.toStrings();
      strs.map((s,i)=> {
        widths[i] = Math.max(s.length, widths[i]);
      });
    });
    singleList.forEach(row => row.widths = widths);
    dbg && cc.ok1(msg+1, widths[0], maxValues, 'widths:', widths);

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
