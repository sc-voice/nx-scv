import { logger } from './file-repository.js';
import { MonoTable } from './mono-table.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { zidify } from './fuzzy-namespace.js';
import type { NfProgram, ICommand } from './nf-program.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';

const Hjson = HJSON_CJS as any;

const CLI_DEFAULT_LIMIT = 10;

interface ParsedOptions {
  /** Projection object with 0/1 values (validated for non-mixed) */
  projection: Record<string, 0 | 1>;
  /** Column name to replace with fuzzyId, or undefined if not set */
  fuzzyColumn: string | undefined;
  /** Whether to add zid field (if true, fuzzyColumn is forced to 'id') */
  addZid: boolean;
  /** Max lines for output display */
  lines: number;
  /** Detail level for lines output (0-1), defaults to 0 */
  linesDetail: number;
  /** Result row limit, defaults to CLI_DEFAULT_LIMIT */
  rows: number;
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

  /**
   * Validate find command parameters (queries and options)
   * @param queries - Array of query strings
   * @param options - CLI options object
   * @returns Validated and parsed options
   * @throws Error if queries is empty, projection has mixed 0/1 values, lines is not positive, or lines detail is not 0-1
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

    const [sLines, sDetail] = options.lines?.split('@') ?? [
      undefined,
      undefined,
    ];
    const lines = sLines ? parseInt(sLines, 10) : 7;
    if (isNaN(lines) || lines <= 0) {
      throw new Error(
        `Invalid lines: ${options.lines} (must be positive integer)`,
      );
    }
    const linesDetail = sDetail ? parseFloat(sDetail) : 0;
    if (isNaN(linesDetail) || linesDetail < 0 || linesDetail > 1) {
      throw new Error(`Invalid lines detail: ${sDetail} (must be 0-1)`);
    }

    const rows = options.rows
      ? parseInt(options.rows, 10)
      : CLI_DEFAULT_LIMIT;
    if (rows !== undefined && isNaN(rows)) {
      throw new Error(`Invalid rows: ${options.rows}`);
    }

    let fuzzyColumn = options.fuzzyId;
    const addZid = options.zid ?? false;
    if (addZid) {
      fuzzyColumn = 'id';
    }

    return { projection, fuzzyColumn, addZid, lines, linesDetail, rows };
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
    let lines: string[] = [];
    try {
      const valid = this._validateParameters(queries, options);
      logger.info({ ctx, valid });
      const { projection, fuzzyColumn } = valid;
      const formas = await this._mergeResults(queries, valid.rows);
      const projected = formas.map((f3a) =>
        nfProgram.applyProjection(f3a, projection),
      );
      const theme = NameFormaTheme.shared;
      const { columnSeparator } = theme;
      const ns = nfProgram.world.mutableNamespace;
      if (fuzzyColumn && projected.length > 0) {
        const headerIds = Object.keys(projected[0]);
        if (!headerIds.includes(fuzzyColumn)) {
          throw new Error(
            `fuzzyColumn "${fuzzyColumn}" not found in projected headers: ${headerIds.join(', ')}`,
          );
        }
      }
      const cellValue = fuzzyColumn
        ? (val: unknown, id: string): string =>
            id === fuzzyColumn
              ? theme.nfLink(ns.fuzzyIdOf(val as any))
              : String(val ?? '')
        : undefined;
      if (options.tui) {
        const mt = new MonoTable({
          columnSeparator,
          headerCase: 'none',
          rows: projected,
          cellValue,
        });
        lines.push(mt.format());
      } else {
        // options.json is default
        lines.push(JSON.stringify(projected, null, 2));
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
        '-p, --project <hjson>',
        'Projection as HJSON string, e.g.: "name:1, summary:1"',
      )
      .option('-l, --lines <val>', '<MAX_LINES(7)>[@DETAIL]')
      .option(
        '-r, --rows <number>',
        'Limit number of results (default 10)',
      )
      .option('--zid', 'Add zid (fuzzyId) field to input rows')
      .option(
        '--fuzzy-id <string>',
        'Replace value of named column with its namespace fuzzyId',
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
  nf find -p '{summary:0}' world
  nf find 'name:"foo"' -p '{name:1}'
  nf find --fuzzy-id id task -p id:1,name:1
  nf find --zid task -p id:1,name:1
  nf find --table --limit 10 task`,
      )
      .action(async (queries: string[], options: any, command: any) => {
        const opts = command.optsWithGlobals();
        return this.action(queries, opts);
      });
    return subCmd;
  } // register
}
