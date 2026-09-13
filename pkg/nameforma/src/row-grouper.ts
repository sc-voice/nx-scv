/**
 * RowGrouper is a line accumulator that inserts header lines as content
 * lines are pushed to the accumulator. Client must call startRow()
 * before pushing each content line of that row. Each content line belongs to
 * exactly one data row. Each data row must consist of one or more lines.
 * Each data row is associated with exactly one header line.
 *
 * The RowGrouper ensures that rows are atomic: a row will never be split
 * across two groups. If a row cannot fit in the remaining space of the
 * current group, it will trigger a new group.
 */

export type HeaderFun = (rowIndex: number, rowData: any) => string;

export class RowGrouper {
  /** Default header is row number of first row in group */
  static readonly DEFAULT_HEADER_FUN: HeaderFun = (rowNum: number) =>
    `Row ${rowNum}`;

  readonly groupLines: number;
  readonly headerFun: HeaderFun;

  #lines: string[] = [];
  #rowBuffer: string[] = [];
  #rowCount: number = 0;
  #rowData: any = {};
  #groupContentLines: number = 0;
  #lastRowWasMultiline: boolean = false;

  constructor(
    opts: {
      groupLines?: number;
      headerFun?: HeaderFun;
    } = {},
  ) {
    this.groupLines = opts.groupLines ?? 12;
    this.headerFun = opts.headerFun ?? RowGrouper.DEFAULT_HEADER_FUN;
  }

  get rowCount(): number {
    return this.#rowCount;
  }

  /**
   * Signals the start of a new atomic row.
   * If a previous row was in progress, it flushes it first.
   */
  startRow(rowData: any = {}): this {
    // 1. If there is an active row in the buffer, flush it
    if (this.#rowBuffer.length > 0) {
      this.#flushRow();
    }

    // 2. Prepare for the new row
    this.#rowData = rowData;
    this.#rowCount++;

    // 3. Determine if we need to inject a header for the NEW row
    // Trigger header if:
    // - It's the very first row of the document (lines is empty)
    // - The previous row was multiline (forces new group)
    if (this.#lines.length === 0 || this.#lastRowWasMultiline) {
      this.#injectHeader();
    }

    return this;
  }

  /** Adds line(s) to the current row buffer. */
  pushLine(...lines: string[]): this {
    this.#rowBuffer.push(...lines);
    return this;
  }

  /**
   * Finalizes the accumulation and returns all lines (headers + content).
   */
  getLines(): string[] {
    // Flush the final row if it exists
    if (this.#rowBuffer.length > 0) {
      this.#flushRow();
    }
    return this.#lines;
  }

  #flushRow(): void {
    const rowLength = this.#rowBuffer.length;
    const spaceLeftInGroup = this.groupLines - 1 - this.#groupContentLines;

    // If row doesn't fit and we're not at the start, inject header for new group
    if (rowLength > spaceLeftInGroup && this.#groupContentLines > 0) {
      this.#injectHeader();
    }

    // Append the row lines (rows are atomic, never split mid-row)
    this.#lines.push(...this.#rowBuffer);
    this.#groupContentLines += rowLength;
    this.#rowBuffer = [];

    // Determine if the next row will need a new header
    const spaceLeftAfter = this.groupLines - 1 - this.#groupContentLines;
    this.#lastRowWasMultiline =
      rowLength > spaceLeftInGroup || spaceLeftAfter < 1 || rowLength > 1;
  }

  #injectHeader(): void {
    this.#lines.push(this.headerFun(this.#rowCount, this.#rowData));
    this.#groupContentLines = 0;
  }
}
