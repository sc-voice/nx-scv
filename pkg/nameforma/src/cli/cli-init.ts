/**
 * Init command handler for nameforma CLI
 * Creates a new world in the specified directory
 */

import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import path from 'path';
import type { GlobalOpts } from './nf-cli.js';

export default class InitCommand {
  /**
   * Register init command
   * @param {Command} cmd - Commander command object
   * @param {Function} getGlobalOpts - Closure that returns global options (unused for init)
   */
  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    cmd
      .argument('[path]', 'Directory to initialize (defaults to current directory)')
      .action((pathArg: string | undefined, options: any) => {
        try {
          const targetPath = pathArg || process.cwd();
          const worldPath = targetPath.endsWith('.nameforma')
            ? targetPath
            : path.join(targetPath, '.nameforma');

          const world = World.create(worldPath);
          nfTui.log(`✓ Initialized world at ${worldPath}`);
          nfTui.log(`World ID: ${world.id.base64}`);
        } catch (err) {
          nfTui.error(
            `Failed to initialize world: ${err instanceof Error ? err.message : String(err)}`,
          );
          process.exit(1);
        }
      });
  }
}
