/**
 * Action command handler for nameforma CLI
 * Lists actions for the currently focused task
 */

import path from 'path';
import { World } from '../world.js';
import { Task } from '../task.js';
import { ActionStatus } from '../action.js';

export default class ActionCommand {
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

    // Default action: list actions of focused task
    cmd
      .description('List actions for the focused task')
      .action((options: any, cmd: any) => {
        const world = ActionCommand.getWorld(cmd.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          console.log('No task is currently focused');
          return;
        }

        const actions = task.actions(world).items;

        if (actions.length === 0) {
          console.log('No actions');
          return;
        }

        console.log(`Actions for: ${task.name}`);
        console.log('');
        actions.forEach((action: any, index: number) => {
          const status = action.status === ActionStatus.done ? '✓' : '○';
          console.log(`${status} ${index + 1}. ${action.name}`);
        });
      });

    // action add
    cmd
      .command('add')
      .requiredOption('-n, --name <name>', 'Action name')
      .option('-s, --summary <summary>', 'Action summary')
      .action((options: any, cmd: any) => {
        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const actionConfig: any = { name: options.name };
        if (options.summary) {
          actionConfig.summary = options.summary;
        }

        const action = task.actions(world).addItem(actionConfig);
        world.save();

        console.log(`✓ Action added`);
        console.log(`  ${action.name}`);
      });
  }
}
