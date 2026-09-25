import { logger } from './file-repository.js';
import { Zeno, type ZenoStep } from './zeno-step.js';
import { MonoTable } from './mono-table.js';
import { ViewNamespace } from './view-namespace.js';
import {
  PlainTheme,
  INameFormaTheme,
  NameFormaTheme,
} from './nameforma-theme.js';
import { DBG } from './defines.js';
import {
  MonoJSONBuilder,
  MonoJSON,
  IMonoJSONFacade,
} from './mono-json.js';
import { NfProgram, ICommand } from './nf-program.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';

const Hjson = HJSON_CJS as any;

const DEFAULT_HEADERS = 3;

interface ParsedOptions {
  bgKeys: number;
  /** max lines per background data row */
  bgRowLines: number;
  /* TEMP */ bgRows: number;
  /* TEMP */ fgRows: number;
  /** semantic "fish-eye" zoom (0:background-only, 1:foreground-only) */
  detail: number;
  /** max keys to show in foreground data row */
  fgKeys: number;
  /** max lines per foreground data row */
  fgLines: number;
  /** Maximum number of table headers (3) */
  maxHeaders: number;
  /** output as MonoTable */
  monoTable: boolean;
  /** output as JSON */
  outJson: boolean;
  /** Projection object with 0/1 values (validated for non-mixed) */
  projection: Record<string, 0 | 1>;
  /** max keys to display for each background data row */
  rawBgKeys: number | undefined;
  /** Result row limit, defaults to DEFAULT_SEMANTIC_ROWS */
  rowLimit: number;
  /** Terminal width in characters for layout optimization */
  tuiWidth: number;
  /** Terminal height in lines for layout optimization */
  tuiHeight: number;
}

/**
 * NfFindCommand - Handles the "find" CLI command for querying formas.
 * Supports entity collections, fuzzy IDs, and HJSON sift filters.
 */
export class NfFindCommand {
  nfProgram: NfProgram;

  constructor(nfProgram: NfProgram) {
    this.nfProgram = nfProgram;
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

  _parseFloatOption(
    opts: Record<string, any>,
    key: string,
    defaultValue?: number | undefined,
    minValue: number = 0,
    maxValue: number = 1,
  ): number | undefined {
    const rawValue = opts[key];
    if (rawValue === undefined) {
      return defaultValue;
    }
    const value = parseFloat(rawValue);
    if (isNaN(value)) {
      throw new Error(`Invalid ${key}: ${rawValue}`);
    }
    if (value < minValue) {
      throw new Error(`Invalid ${key}: ${rawValue} < ${minValue}`);
    }
    if (value > maxValue) {
      throw new Error(`Invalid ${key}: ${rawValue} > ${maxValue}`);
    }
    return value;
    return value;
  }

  _parseInt(
    opts: Record<string, any>,
    key: string,
    defaultValue?: number | undefined,
    minValue: number = 0,
  ): number | undefined {
    const rawValue = opts[key];
    if (rawValue === undefined) {
      return defaultValue;
    }
    const value = parseInt(rawValue);
    if (isNaN(value)) {
      throw new Error(`Invalid ${key}: ${rawValue}`);
    }
    if (value < minValue) {
      throw new Error(`Invalid ${key}: ${rawValue} < ${minValue}`);
    }
    return value;
  }

  /**
   * Validate find command parameters (queries and options)
   * @param queries - Array of >=1 query strings
   * @param options - CLI options object
   * @returns Validated and parsed options
   * @throws Error for invalid options
   */
  _validateOpts(queries: string[], options: any): ParsedOptions {
    if (!queries || queries.length === 0) {
      throw new Error('At least one query is required');
    }

    const p5n = (options.project ?? '')
      .split(',')
      .map((c) => c.trim().replace(/^([a-z_][a-z0-9_]*)$/i, '$1:1'))
      .join(',');
    const projection = p5n ? Hjson.parse(p5n) : {};
    const pv = Object.values(projection);
    const optIn = pv.some((v) => v === 1);
    const optOut = pv.some((v) => v === 0);
    if (optIn && optOut) {
      throw new Error(
        `Mixed projection not supported: ${JSON.stringify(projection)}`,
      );
    }
    const tuiHeight = this._parseInt(
      options,
      'tuiHeight',
      process.stdout.rows ?? 24,
    )!;
    const tuiWidth = this._parseInt(
      options,
      'tuiWidth',
      process.stdout.columns ?? 80,
    )!;

    // resolve output options
    const defaultOutput = [options.outJson, options.monoTable].every(
      (f) => f === undefined,
    );
    const outJson = options.outJson ?? false;
    const monoTable = options.monoTable ?? defaultOutput;

    // Parse layout constraints
    // --------------------------------------
    const maxHeaders = this._parseInt(
      options,
      'maxHeaders',
      DEFAULT_HEADERS,
    )!;
    const rawBgKeys = this._parseInt(options, 'bgKeys');
    const rawRowLimit = this._parseInt(options, 'rowLimit');
    const bgRowLinesRaw = this._parseInt(
      options,
      'bgRowLines',
      undefined,
      1,
    );
    const rawDetail = this._parseFloatOption(options, 'detail');

    // Compute layout according to constraints.
    // --------------------------------------
    const detail = rawDetail ?? (rawRowLimit === 1 ? 1 : 0);
    const bgKeys = rawBgKeys ?? Math.max(maxHeaders, 1);
    const bgOverflow = Math.max(0, bgKeys - maxHeaders);
    const bgRowLines = bgRowLinesRaw ?? 1 + bgOverflow;
    const fgZenoMin = Zeno.ZKV.fromCount(bgRowLines);
    const fgZenoMax = Math.max(fgZenoMin, Zeno.ZKV.fromCount(tuiHeight));
    const fgZeno = fgZenoMax * detail + (1 - detail) * fgZenoMin;
    const fgLinesMax = Zeno.ZKV.toCount(fgZeno as ZenoStep);
    const fgKeys = fgLinesMax - (maxHeaders ? 1 : 0) + maxHeaders;
    const fgOverflow = Math.max(0, fgKeys - maxHeaders);
    const fgLines = 1 + fgOverflow;

    // Account for row headers
    const fgRows = 1;
    const bgLines = Math.max(1, tuiHeight - fgLines);
    const bgRows = detail === 1 ? 1 : Math.floor(bgLines / bgRowLines);
    const totalRows = fgRows + bgRows;

    let rowLimit;

    if (detail === 1) {
      rowLimit = rawRowLimit ?? totalRows;
    } else {
      rowLimit =
        rawRowLimit ??
        (bgRowLinesRaw === undefined
          ? totalRows
          : Math.max(1, Math.floor((tuiHeight - 1) / bgRowLinesRaw)));
    }

    return {
      bgKeys,
      bgRowLines,
      bgRows,
      detail,
      fgKeys,
      fgLines,
      fgRows,
      maxHeaders,
      monoTable,
      outJson,
      projection,
      rawBgKeys,
      rowLimit,
      tuiHeight,
      tuiWidth,
    };
  }

  /**
   * Resolve multiple queries and merge results with deduplication by id
   * @param queries - Array of query strings to resolve
   * @param rowLimit - Result row limit (respects global limit across all queries)
   * @returns Array of deduplicated formas, sorted with focused entities first
   */
  async _mergeResults(
    queries: string[],
    rowLimit: number,
  ): Promise<any[]> {
    const formas: any = [];
    const seenIds = new Set<string>();
    let remaining = rowLimit;
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
    formas.sort(this.nfProgram.world.entityComparator);
    return formas;
  }

  themedValue(theme: INameFormaTheme, key, value): string {
    if (theme) {
      if (key === 'zid') {
        return theme.nfLink(value);
      }
    }
    return value;
  }

  async action(queries: string[], options: any) {
    const ctx = 'NfFindCommand.action';
    const { nfProgram } = this;
    const dbg = DBG.NF_PROGRAM.FIND;
    let lines: string[] = [];
    try {
      // process queries to obtain actual row count
      const { rawBgKeys, rowLimit } = this._validateOpts(queries, options);
      const formas = await this._mergeResults(queries, rowLimit);

      // create fg/bg namespace that includes first forma for detail zids
      const anchorNs = nfProgram.world.mutableNamespace;
      const firstForma = formas[0] as any;
      const pivotNs = firstForma?.mutableNamespace;
      const namespace = pivotNs
        ? new ViewNamespace(anchorNs, pivotNs)
        : anchorNs;

      // re-validate options again using actual data row count
      const dataOpts = { ...options, rowLimit: formas.length };
      const valid = this._validateOpts(queries, dataOpts);
      const {
        bgRowLines,
        bgKeys,
        fgKeys,
        fgLines, // deprecate?
        outJson,
        projection,
        tuiWidth,
        tuiHeight,
      } = valid;
      dbg && logger.info({ ctx, valid, bgKeys });

      const theme = outJson ? new PlainTheme() : NameFormaTheme.shared;
      const bgBuilder = new MonoJSONBuilder({
        maxKeys: bgKeys,
        namespace,
        projection,
      });
      const fgBuilder = new MonoJSONBuilder({
        maxKeys: fgKeys,
        namespace,
        projection,
      });
      const jsonFormas = formas.map((f, i) => {
        const mjb = i === 0 ? fgBuilder : bgBuilder;
        return mjb.resetFromSource(f).build();
      });
      dbg && logger.info({ ctx, jsonFormas });
      const projected = jsonFormas.map((f3a) =>
        nfProgram.applyProjection(f3a, projection),
      );
      const { colSeparator } = theme;
      if (valid.outJson) {
        projected.forEach((p) => lines.push(JSON.stringify(p)));
      } else {
        const COLFUDGE = 2; // avoid wrapping if host pads output
        const mt = new MonoTable({
          colSeparator,
          headerCase: 'none',
          maxRowWidth: tuiWidth - COLFUDGE,
          rows: projected,
          theme,
          themedValue: this.themedValue,
        });
        lines.push(mt.format());
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
      .option(
        '-k, --bg-keys <number>',
        'Max number of keys to display for each background data row (auto)',
      )
      .option('-r, --row-limit <number>', 'Max number of data rows (auto)')
      .option('-m,--mono-table', 'Output as MonoTable (auto)')
      .option(
        '--tui-lines <val>',
        'Viewport height (system default or 24)',
      )
      .option('--tui-width <val>', 'Viewport width (system default or 80)')
      .option(
        '-l, --bg-row-lines <val>',
        'Max lines to display per background data row',
      )
      .option(
        '-d, --detail <number>',
        'Semantic "fish-eye" zoom (0:background-only, 1:foreground-only)',
      )
      .option(
        '-p, --project <hjson>',
        'Projection as HJSON string, e.g.: "name:1, summary:1"',
      )
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
  nf find --detail 0.5 task -p id,name
  nf find --mono-table --row-limit 3 task`,
      )
      .action(async (queries: string[], options: any, command: any) => {
        const opts = command.optsWithGlobals();
        return this.action(queries, opts);
      });
    return subCmd;
  } // register
}
