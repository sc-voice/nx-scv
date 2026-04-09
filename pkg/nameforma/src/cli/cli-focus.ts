/**
 * Focus command handler for nameforma CLI
 * Sets focus on an entity by ID
 */

import path from 'path';
import { Text } from '@sc-voice/tools';
import { World } from '../world.js';
import { Identifiable } from '../identifiable.js';

const { ColorConsole } = Text;
const { cc } = ColorConsole;

export default class FocusCommand {
  /**
   * Get or create world instance, either from -w parameter or auto-discovery
   * @param {object} options - Command options
   * @returns {World} - World instance
   */
  static getWorld(options: any): World {
    let worldPath = options.world;

    if (!worldPath) {
      worldPath = World.findWorld();
      if (!worldPath) {
        // Use .nameforma in current directory as fallback
        worldPath = path.join(process.cwd(), '.nameforma');
      }
    } else {
      // If -w points to parent directory, append .nameforma
      if (!worldPath.endsWith('.nameforma')) {
        worldPath = path.join(worldPath, '.nameforma');
      }
    }

    return World.fromPath(worldPath);
  }

  /**
   * Load any forma by ID (searches all registered entity types)
   * @param {World} world - World instance
   * @param {string} id - Forma ID to search for
   * @returns {object|null} - Forma instance or null
   */
  static findForma(world: World, id: string): any {
    return world.loadFuzzyForma(id);
  }

  /**
   * Find forma for unfocus by matching focusStack FuzzyId or loading forma
   * @param {World} world - World instance
   * @param {string} idOrFuzzyId - Forma ID, FuzzyId from focusStack, or partial match
   * @returns {object|null} - Forma instance or null
   */
  static findFormaForUnfocus(world: World, idOrFuzzyId: string): any {
    // Try matching against focusStack FuzzyIds first
    // This handles the common case where user copies the displayed FuzzyId
    const focusStack = world.focusStack;
    const filter = Identifiable.idFilter(idOrFuzzyId);

    for (const focus of focusStack) {
      const listId = focusStack.itemListId(focus);
      if (filter(listId)) {
        // Found matching focus by FuzzyId, load the actual forma
        const forma = world.loadFuzzyForma(focus.formaId.base64);
        if (forma) return forma;
      }
    }

    // Fall back to direct forma lookup
    return world.loadFuzzyForma(idOrFuzzyId);
  }

  /**
   * Register focus subcommands
   * @param {Command} cmd - Commander command object
   */
  static registerCommand(cmd: any) {
    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');
    cmd.option('-u, --unfocus', 'Remove entity from focus stack instead of adding');

    // focus [id] - with optional id argument
    cmd
      .argument('[id]', 'Forma ID to focus/unfocus (optional)')
      .description('Set focus on a forma by ID, unfocus with -u, or list focus stack if no ID specified')
      .addHelpText('after', '\nExamples:\n  $ nameforma focus abc123def456\n  $ nameforma focus -u abc123def456\n  $ nameforma focus')
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = FocusCommand.getWorld(cmd.optsWithGlobals());
        const opts = cmd.optsWithGlobals();

        // If no ID provided, list the focus stack
        if (!id) {
          const stack = world.focusStack;
          if (stack.size === 0) {
            console.log('Focus stack is empty');
            return;
          }

          console.log(`Focus Stack (${stack.size}):`);
          let index = 0;
          for (const focus of stack) {
            // Use FormaList's built-in formatting
            const listStr = focus.listItemString({
              itemId: stack.itemListId(focus),
              bullet: index === 0 ? '▶' : '•',
            });

            // Highlight current focus (index 0) in bright green
            if (index === 0) {
              console.log(`\x1b[92m${listStr}\x1b[0m`);  // Bright green
            } else {
              console.log(listStr);
            }
            index++;
          }
          return;
        }

        // Otherwise, focus or unfocus the specified forma
        const forma = opts.unfocus
          ? FocusCommand.findFormaForUnfocus(world, id)
          : FocusCommand.findForma(world, id);
        if (!forma) {
          throw new Error(`Forma not found: ${id}`);
        }

        const formaType = (forma.constructor as any).entity || forma.constructor.name;

        if (opts.unfocus) {
          world.unfocusForma(forma);
          world.save();
          console.log(`✓ Unfocused: ${forma.id}`);
          if (forma.name) {
            console.log(`  name: ${forma.name}`);
          }
          console.log(`  type: ${formaType}`);
        } else {
          world.focusForma(forma);
          world.save();

          const focused = world.focusedForma(formaType);

          console.log(`✓ Focused: ${forma.id}`);
          if (forma.name) {
            console.log(`  name: ${forma.name}`);
          }
          console.log(`  type: ${formaType}`);
          console.log(`  order: 0 (most recent)`);
        }
      });
  }
}
