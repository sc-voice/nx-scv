import { logger } from './file-repository.js';
import {
  ZenoStep,
  zenoStep,
  ZENO_1_ROW_VERBOSE,
  ZENO_1_ROW_TERSE,
  ZENO_MAX_ROWS,
  linesToZenoStep,
  zenoStepToLines,
} from './navigable-view.js';
import { MonoTable } from './mono-table.js';
import { PlainTheme, NameFormaTheme } from './nameforma-theme.js';
import { zidify } from './fuzzy-namespace.js';
import { DBG } from './defines.js';
import {
  MonoJSONBuilder,
  MonoJSON,
  IMonoJSONFacade,
} from './mono-json.js';
import type { NfProgram, ICommand } from './nf-program.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';

const Hjson = HJSON_CJS as any;

const DEFAULT_SEMANTIC_ROWS = 3;

interface ParsedOptions {
  /** Projection object with 0/1 values (validated for non-mixed) */
  projection: Record<string, 0 | 1>;
  /** Whether to add zid field */
  addZid: boolean;
  /** lines per row */
  linesPerRow: number;
  /** maximum number of keys to display for each row */
  maxKeys: number;
  /** output as MonoTable */
  monoTable: boolean;
  /** Result row limit, defaults to DEFAULT_SEMANTIC_ROWS */
  rows: number;
  /** Terminal height in rows for layout optimization */
  tuiRows: number;
  /** Terminal height in rows for layout optimization */
  tuiColumns: number;
  /** output as JSON */
  json: boolean;
  /** Default semantic zoom (ZenoStep) for each row */
  rowZeno: ZenoStep;
}

/**
 * NfFindCommand - Handles the "find" CLI command for querying formas.
 * Supports entity collections, fuzzy IDs, and HJSON sift filters.
 */
export class NfFindCommand {
  nfProgram: NfProgram;
  jsonBuilder: MonoJSONBuilder;

  constructor(nfProgram: NfProgram) {
    this.nfProgram = nfProgram;
    this.jsonBuilder = new MonoJSONBuilder({});
  }

  /** Semantic content is brief and glancing by default */
  static get DEFAULT_ROWS() {
    return DEFAULT_SEMANTIC_ROWS;
  }

  /**
   * Resolve a query string to an array of formas.
   * Supports HJSON filters, entity collections, "focused" keyword, and fuzzy IDs.
   * @param nfProgram - NfProgram instance with world context
   * @param query - Query string (entity, fuzzy ID, or HJSON filter)
   * @param limit - Optional result limit
   * @returns Array of matching formas
   * @throws Error if fuzzy ID not found
   */
  async _resolveQuery(query: string, limit?: number): Promise<any[]> {
    let { nfProgram } = this;
    let parsed: any;
    try {
      parsed = Hjson.parse(query);
    } catch {
      parsed = query;
    }

    // HJSON object filter
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      let cursor = nfProgram.world.repository.findAll(parsed);
      if (limit !== undefined) cursor = cursor.limit(limit);
      return await cursor.toArray();
    }

    // String query: check for special "focused" keyword
    if (typeof parsed === 'string' && parsed.toLowerCase() === 'focused') {
      const focusedIds = nfProgram.world.focusManager.ids();
      const formas: any[] = [];
      for (const id of focusedIds) {
        const resolved = await nfProgram.world.resolveFuzzyId(id.base64);
        if (resolved) {
          formas.push(resolved.forma);
          if (limit !== undefined && formas.length >= limit) break;
        }
      }
      return formas;
    }

    // String query: check if it's a registered entity collection (case-insensitive)
    if (typeof parsed === 'string') {
      const lowerQuery = parsed.toLowerCase();
      const matchedEntity = nfProgram.world
        .getEntityNames()
        .find((name) => name.toLowerCase() === lowerQuery);
      if (matchedEntity) {
        let cursor = nfProgram.world.repository.findAll({
          collection: matchedEntity,
        });
        if (limit !== undefined) cursor = cursor.limit(limit);
        return await cursor.toArray();
      }
    }

    // Treat as fuzzy ID
    const resolved = await nfProgram.world.resolveFuzzyId(query);
    if (!resolved) {
      throw new Error(`Not found: ${query}`);
    }
    return [resolved.forma];
  }

  /**
   * Validate find command parameters (queries and options)
   * @param queries - Array of >=1 query strings
   * @param options - CLI options object
   * @returns Validated and parsed options
   * @throws Error for invalid options
   */
  _validateParameters(queries: string[], options: any): ParsedOptions {
    if (!queries || queries.length === 0) {
      throw new Error('At least one query is required');
    }
    const projection = options.project ? Hjson.parse(options.project) : {};
    const pv = Object.values(projection);
    const optIn = pv.some((v) => v === 1);
    const optOut = pv.some((v) => v === 0);
    if (optIn && optOut) {
      throw new Error(
        `Mixed projection not supported: ${JSON.stringify(projection)}`,
      );
    }
    const tuiRows = options.tuiRows
      ? parseInt(options.tuiRows)
      : (process.stdout.rows ?? 24);
    if (isNaN(tuiRows)) {
      throw new Error(`Invalid rows: ${options.tuiRows}`);
    }
    const tuiColumns = process.stdout.columns ?? 80;
    const rowZeno = options.rowZeno ?? ZENO_MAX_ROWS;

    // resolve output options
    const defaultOutput = [options.json, options.monoTable].every(
      (f) => f === undefined,
    );
    const json = options.json ?? false;
    const monoTable = options.monoTable ?? defaultOutput;

    let rawKeys = options.maxKeys
      ? parseInt(options.maxKeys, 10)
      : undefined;
    if (rawKeys !== undefined && isNaN(rawKeys)) {
      throw new Error(`Invalid maxKeys: ${options.maxKeys}`);
    }

    let rawRows = options.rows ? parseInt(options.rows, 10) : undefined;
    if (rawRows !== undefined && isNaN(rawRows)) {
      throw new Error(`Invalid rows: ${options.rows}`);
    }

    let rawLines = options.linesPerRow
      ? parseInt(options.linesPerRow, 10)
      : undefined;
    if (rawLines !== undefined && (isNaN(rawLines) || rawLines < 1)) {
      throw new Error(
        `Expected positive integer for linesPerRow: ${options.linesPerRow}`,
      );
    }

    const rows =
      rawRows ??
      (rawLines === undefined
        ? Math.max(1, tuiRows - 1)
        : Math.max(1, Math.floor((tuiRows - 1) / rawLines)));

    const linesPerRow =
      rawLines ?? Math.max(1, Math.floor((tuiRows - 1) / rows));

    const addZid = options.zid ?? false;

    let maxKeys = rawKeys ?? 0;

    return {
      addZid,
      json,
      linesPerRow,
      maxKeys,
      monoTable,
      projection,
      rowZeno,
      rows,
      tuiRows,
      tuiColumns,
    };
  }

  /**
   * Resolve multiple queries and merge results with deduplication by id
   * @param queries - Array of query strings to resolve
   * @param rows - Result row limit (respects global limit across all queries)
   * @returns Array of deduplicated formas
   */
  async _mergeResults(queries: string[], rows: number): Promise<any[]> {
    const formas: any = [];
    const seenIds = new Set<string>();
    let remaining = rows;
    for (const query of queries) {
      if (remaining !== undefined && remaining <= 0) break;
      const queryLimit = remaining;
      const results = await this._resolveQuery(query, queryLimit);
      for (const forma of results) {
        const id = (forma as any)?.id?.base64 || (forma as any)?.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          formas.push(forma);
          if (remaining !== undefined) remaining--;
          if (remaining !== undefined && remaining <= 0) break;
        }
      }
    }
    return formas;
  }

  async action(queries: string[], options: any) {
    const ctx = 'NfFindCommand.action';
    const { nfProgram } = this;
    const dbg = DBG.NF_PROGRAM.FIND;
    let lines: string[] = [];
    try {
      const valid = this._validateParameters(queries, options);
      dbg && logger.info({ ctx, valid });
      const {
        maxKeys,
        projection,
        tuiColumns,
        tuiRows,
        linesPerRow,
        rows,
        rowZeno,
        json,
      } = valid;
      const theme = json ? new PlainTheme() : NameFormaTheme.shared;
      const jsonBuilder = (this.jsonBuilder = new MonoJSONBuilder({
        maxKeys,
        maxOverflow: 0,
        theme,
      }));
      const formas = await this._mergeResults(queries, valid.rows);
      const jsonFormas = formas.map((f) => {
        const opts = { zeno: rowZeno };
        return jsonBuilder.fromSource(f, opts).build();
      });
      dbg && logger.info({ ctx, jsonFormas });
      const projected = jsonFormas.map((f3a) =>
        nfProgram.applyProjection(f3a, projection),
      );
      const { columnSeparator } = theme;
      const ns = nfProgram.world.mutableNamespace;
      if (valid.monoTable) {
        const mt = new MonoTable({
          columnSeparator,
          headerCase: 'none',
          rows: projected,
        });
        lines.push(mt.format());
      } else {
        projected.forEach((p) => lines.push(JSON.stringify(p)));
      }
      nfProgram.writeOut(lines.join('\n'));
    } catch (err: any) {
      logger.error({ ctx, err });
      nfProgram.writeErr(`✗ ${ctx} Error: ${err.message}`);
      throw err;
    }
  }

  register(rootCmd: ICommand): ICommand {
    const { nfProgram } = this;
    const subCmd = rootCmd.command('find');
    subCmd
      .description('Find Formas that match given queries')
      .option('-z, --row-zeno <number>', 'Row resolution (0..17)')
      .option(
        '-k, --max-keys <number>',
        'Max number of keys to display for each row (auto)',
      )
      .option('-r, --rows <number>', 'Max number of result rows (auto)')
      .option('-m,--mono-table', 'Output as MonoTable (auto)')
      .option('--tui-rows <val>', 'System default')
      .option('--tui-cols,--tui-columns <val>', 'System default')
      .option('-l, --lines-per-row <val>', 'Max lines per data row')
      .option(
        '-p, --project <hjson>',
        'Projection as HJSON string, e.g.: "name:1, summary:1"',
      )
      .option('--zid', 'Add zid (fuzzyId) field to input rows')
      .argument(
        '[queries...]',
        'Entity collection, FUZZY_ID, or HJSON sift filter',
      )
      .addHelpText(
        'after',
        `
Examples:
  nf find focus
  nf find task
  nf find -p '{name:1, summary:1}' focus task
  nf find -p id:0,summary:0 world
  nf find 'name:"foo"' -p '{name:1}'
  nf find --fuzzy-id id task -p id:1,name:1
  nf find --zid task -p id:1,name:1
  nf find --mono-table --rows 3 task`,
      )
      .action(async (queries: string[], options: any, command: any) => {
        const opts = command.optsWithGlobals();
        return this.action(queries, opts);
      });
    return subCmd;
  } // register
}
