/**
 * GET command handler for nameforma CLI
 * Resolves fuzzy_id in world namespace (primary) and focus namespace (secondary)
 */

import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import { EntityView } from '../entity-view.js';
import { LineRenderer } from '../line-renderer.js';
import { zenoStep, ZenoCoord, ZENO_8_ROWS } from '../navigable-view.js';
import type { GlobalOpts } from './nf-cli.js';

export default class GetCommand {
  /**
   * Register get command
   * @param {Command} cmd - Commander command object
   * @param {Function} getGlobalOpts - Closure that returns global options
   */
  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    cmd
      .argument('<fuzzyId>', 'Fuzzy ID to resolve')
      .option('-j, --json', 'Output as JSON')
      .option('--zeno <int>', 'Semantic detail level (0-17)', '8')
      .option('--lines <int>', 'Viewport height in lines', '50')
      .option('--line-width <int>', 'Line width in characters', '75')
      .action(async (fuzzyId: string, options: any) => {
        const world = getGlobalOpts().world;
        try {
          const forma = world.resolveFuzzyId(fuzzyId);

          if (!forma) {
            nfTui.error(`✗ Not found: ${fuzzyId}`);
            process.exit(1);
          }

          if (options.json) {
            nfTui.log(JSON.stringify(forma, null, 2));
          } else {
            // Parse --zeno, --lines, and --line-width options
            const zenoInt = parseInt(options.zeno, 10);
            const linesInt = parseInt(options.lines, 10);
            const lineWidthInt = parseInt(options.lineWidth, 10);

            if (isNaN(zenoInt) || zenoInt < 0 || zenoInt > 17) {
              nfTui.error(`✗ Invalid --zeno value: ${options.zeno} (must be 0-17)`);
              process.exit(1);
            }

            if (isNaN(linesInt) || linesInt < 1) {
              nfTui.error(`✗ Invalid --lines value: ${options.lines} (must be >= 1)`);
              process.exit(1);
            }

            if (isNaN(lineWidthInt) || lineWidthInt < 1) {
              nfTui.error(`✗ Invalid --line-width value: ${options.lineWidth} (must be >= 1)`);
              process.exit(1);
            }

            // Render using EntityView + LineRenderer
            const view = new EntityView(forma as any);
            const zenoCoord = new ZenoCoord(zenoStep(zenoInt), zenoStep(0));
            view.zoomTo(zenoCoord);

            const renderData = forma.asRenderData(view);
            const renderer = new LineRenderer({
              theme: view.theme,
              zenoStep: zenoStep(zenoInt),
              lines: linesInt,
              lineWidth: lineWidthInt,
            });

            const lines = renderer.render(renderData);
            lines.forEach(line => nfTui.log(line));
          }
        } catch (err: any) {
          nfTui.error(`✗ Error: ${err.message}`);
          process.exit(1);
        }
      });
  }
}
