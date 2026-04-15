/**
 * Reference command handler for nameforma CLI
 * Lists references for the currently focused task
 */

import path from 'path';
import { World } from '../world.js';
import { Task } from '../task.js';

export default class ReferenceCommand {
  static getWorld(options: any): World {
    let worldPath = options.world;

    if (!worldPath) {
      worldPath = World.findWorld();
      if (!worldPath) {
        worldPath = path.join(process.cwd(), '.nameforma');
      }
    } else {
      if (!worldPath.endsWith('.nameforma')) {
        worldPath = path.join(worldPath, '.nameforma');
      }
    }

    return World.fromPath(worldPath);
  }

  static getFocusedTask(world: World): Task | null {
    const focus = world.focusedForma('task');
    if (!focus) {
      return null;
    }
    return world.loadFuzzy(Task, focus.formaId.toString()) || null;
  }

  static registerCommand(cmd: any) {
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // Default action: list references of focused task
    cmd
      .description('List references for the focused task')
      .action((options: any, cmd: any) => {
        const world = ReferenceCommand.getWorld(cmd.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          console.log('No task is currently focused');
          return;
        }

        const references = task.references(world).items;

        if (references.length === 0) {
          console.log('No references');
          return;
        }

        console.log(`References for: ${task.name}`);
        console.log('');
        references.forEach((reference: any, index: number) => {
          console.log(`${index + 1}. ${reference.name}`);
          if (reference.summary) {
            console.log(`   ${reference.summary}`);
          }
          if (reference.source) {
            console.log(`   source: ${reference.source}`);
          }
          if (reference.relevance) {
            console.log(`   relevance: ${reference.relevance}`);
          }
        });
      });

    // reference add
    cmd
      .command('add <name>')
      .option('-s, --summary <summary>', 'Reference summary')
      .option('-r, --relevance <number>', 'Relevance score (0-1)', '0')
      .option('--source <url>', 'Source URL or reference')
      .action((name: string, options: any, cmd: any) => {
        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const relevance = parseFloat(options.relevance);
        if (isNaN(relevance) || relevance < 0 || relevance > 1) {
          throw new Error('Relevance must be a number between 0 and 1');
        }

        const referenceConfig: any = { name, relevance };
        if (options.summary) {
          referenceConfig.summary = options.summary;
        }
        if (options.source) {
          referenceConfig.source = options.source;
        }

        const reference = task.references(world).addItem(referenceConfig);
        world.save();

        console.log(`✓ Reference added`);
        console.log(`  ${reference.name}`);
      });
  }
}
