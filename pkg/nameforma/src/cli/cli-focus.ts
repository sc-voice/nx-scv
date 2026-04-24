/**
 * Focus command handler for nameforma CLI
 * Sets focus on an entity by ID
 */

import path from 'path';
import { Text } from '@sc-voice/tools';
import { World } from '../world.js';
import { Identifiable } from '../identifiable.js';
import { TuiList } from './tui-list.js';

const { ColorConsole, Unicode } = Text;
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
   * Register focus subcommands
   * @param {Command} cmd - Commander command object
   */
  static registerCommand(cmd: any) {
    const helpText = [
      'For detailed subcommand help:',
      '  $ nameforma focus help <subcommand>',
      '',
      'Subcommands:',
      '  get     - List focus stack',
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);

    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');
    cmd.option('-u, --unfocus', 'Remove entity from focus stack instead of adding');

    // Default action: focus/unfocus with ID or list stack
    cmd
      .argument('[id]', 'Forma ID to focus/unfocus (optional)')
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = FocusCommand.getWorld(cmd.optsWithGlobals());
        const opts = cmd.optsWithGlobals();

        // If no ID provided
        if (!id) {
          // If -u flag is set, unfocus the most recent task
          if (opts.unfocus) {
            const stack = world.focusStack;
            if (stack.size === 0) {
              console.log('Focus stack is empty');
              return;
            }

            const mostRecentFocus = Array.from(stack)[0];
            world.unfocusForma({ id: mostRecentFocus.formaId });
            world.save();
            console.log(`✓ Unfocused: ${mostRecentFocus.formaId}`);
            if (mostRecentFocus.name) {
              console.log(`  name: ${mostRecentFocus.name}`);
            }
            console.log(`  type: ${mostRecentFocus.formaType}`);
            return;
          }

          // Otherwise, list the focus stack
          const stack = world.focusStack;
          if (stack.size === 0) {
            console.log('Focus stack is empty');
            return;
          }

          new TuiList(stack, world, { title: 'Focus Stack' }).render();
          return;
        }

        // Focus or unfocus the specified forma
        const forma = FocusCommand.findForma(world, id);
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

    // focus get - list focus stack
    cmd
      .command('get')
      .description('List focus stack')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma focus get',
      ].join('\n'))
      .action((options: any, cmd: any) => {
        const world = FocusCommand.getWorld(cmd.parent.optsWithGlobals());
        const stack = world.focusStack;
        if (stack.size === 0) {
          console.log('Focus stack is empty');
          return;
        }

        new TuiList(stack, world, { title: 'Focus Stack' }).render();
      });
  }
}
