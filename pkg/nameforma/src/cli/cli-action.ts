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

  static printAction(action: any, index: number) {
    const status = action.status === ActionStatus.done ? '✓' : '○';
    console.log(`${status} ${index}. ${action.name}`);
    if (action.summary) {
      console.log(`   ${action.summary}`);
    }
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

        const actionList = task.actions(world);
        const actions = actionList.items;

        if (actions.length === 0) {
          console.log('No actions');
          return;
        }

        console.log(`Actions for: ${task.name}`);
        console.log('');
        actions.forEach((action: any, index: number) => {
          ActionCommand.printAction(action, index + 1);
        });
      });

    // action list
    cmd
      .command('list')
      .description('List actions for the focused task')
      .action((options: any, cmd: any) => {
        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          console.log('No task is currently focused');
          return;
        }

        const actionList = task.actions(world);
        const actions = actionList.items;

        if (actions.length === 0) {
          console.log('No actions');
          return;
        }

        console.log(`Actions for: ${task.name}`);
        console.log('');
        actions.forEach((action: any, index: number) => {
          ActionCommand.printAction(action, index + 1);
        });
      });

    // action show <id>
    cmd
      .command('show <id>')
      .description('Show a specific action')
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const actionList = task.actions(world);

        try {
          const action = actionList.getItem(id);
          console.log(`Action: ${task.name}`);
          console.log('');
          const index = actionList.items.indexOf(action) + 1;
          ActionCommand.printAction(action, index);
        } catch (err: any) {
          throw new Error(`Action not found: ${id}`);
        }
      });

    // action add
    cmd
      .command('add <name>')
      .option('-s, --summary <summary>', 'Action summary')
      .action((name: string, options: any, cmd: any) => {
        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const actionConfig: any = { name };
        if (options.summary) {
          actionConfig.summary = options.summary;
        }

        const action = task.actions(world).addItem(actionConfig);
        world.save();

        console.log(`✓ Action added: ${action.id.base64}`);
        console.log(`  ${action.name}`);
      });

    // action update <id>
    cmd
      .command('update <id>')
      .option('-n, --name <name>', 'Action name')
      .option('-s, --summary <summary>', 'Action summary')
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        if (!options.name && !options.summary) {
          throw new Error('At least one field must be specified (--name or --summary)');
        }

        const actionList = task.actions(world);

        const updateCfg: any = {};
        if (options.name) updateCfg.name = options.name;
        if (options.summary) updateCfg.summary = options.summary;

        try {
          const action = actionList.patchItem(id, updateCfg);
          world.save();

          console.log(`✓ Action updated`);
          console.log(`  ${action.name}`);
        } catch (err: any) {
          throw new Error(`Action not found: ${id}`);
        }
      });

    // action delete <id>
    cmd
      .command('delete <id>')
      .description('Delete an action')
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const actionList = task.actions(world);

        try {
          const action = actionList.deleteItem(id);
          world.save();

          console.log(`✓ Action deleted`);
          console.log(`  ${action.name}`);
        } catch (err: any) {
          throw new Error(`Action not found: ${id}`);
        }
      });
  }
}
