import { logger } from './file-repository.js';
import type { NfProgram, ICommand } from './nf-program.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';

const Hjson = HJSON_CJS as any;

/**
 * NfFindCommand - Handles the "find" CLI command for querying formas.
 * Supports entity collections, fuzzy IDs, and HJSON sift filters.
 */
export class NfFindCommand {
  /**
   * Resolve a query string to an array of formas.
   * Supports HJSON filters, entity collections, "focused" keyword, and fuzzy IDs.
   * @param nfProgram - NfProgram instance with world context
   * @param query - Query string (entity, fuzzy ID, or HJSON filter)
   * @param limit - Optional result limit
   * @returns Array of matching formas
   * @throws Error if fuzzy ID not found
   */
  static async resolveQuery(
    nfProgram: NfProgram,
    query: string,
    limit?: number,
  ): Promise<any[]> {
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

  static fromRootCommand(
    rootCmd: ICommand,
    nfProgram: NfProgram,
  ): ICommand {
    const findCmd = rootCmd.command('find');
    findCmd
      .description('Find Formas that match given queries')
      .option(
        '-p, --project <hjson>',
        'Projection as HJSON string, e.g.: "name:1, summary:1"',
      )
      .option('-l, --limit <number>', 'Limit number of results')
      .option('-j, --json', 'output results as JSON')
      .argument(
        '<queries...>',
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
  nf find --limit 10 task`,
      )
      .action(async (queries: string[], options: any) => {
        const ctx = 'NfFindCommand.registerCommand';
        let lines: string[] = [];
        try {
          const p8n = options.project ? Hjson.parse(options.project) : {};
          const pv = Object.values(p8n);
          const optIn = pv.some((v) => v === 1);
          const optOut = pv.some((v) => v === 0);
          if (optIn && optOut) {
            throw new Error(
              `Mixed projection not supported: ${JSON.stringify(p8n)}`,
            );
          }

          const limit = options.limit
            ? parseInt(options.limit, 10)
            : undefined;
          if (limit !== undefined && isNaN(limit)) {
            throw new Error(`Invalid limit: ${options.limit}`);
          }

          const formas: any = [];
          const seenIds = new Set<string>();
          let remaining = limit;
          for (const query of queries) {
            if (remaining !== undefined && remaining <= 0) break;
            const queryLimit = remaining;
            for (const forma of await NfFindCommand.resolveQuery(
              nfProgram,
              query,
              queryLimit,
            )) {
              const id = (forma as any)?.id?.base64 || (forma as any)?.id;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                formas.push(forma);
                if (remaining !== undefined) remaining--;
                if (remaining !== undefined && remaining <= 0) break;
              }
            }
          }

          const projected = formas.map((f3a) =>
            nfProgram.applyProjection(f3a, p8n),
          );
          lines.push(JSON.stringify(projected, null, 2));

          nfProgram.writeOut(lines.join('\n'));
        } catch (err: any) {
          logger.error({ ctx, err });
          nfProgram.writeErr(`✗ ${ctx} Error: ${err.message}`);
          throw err;
        }
      });
    return findCmd;
  }
}
