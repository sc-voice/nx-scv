/**
 * Action command handler for nameforma CLI
 * Lists actions for the currently focused task
 */

import path from 'path';
import { World } from '../world.js';
import { Task } from '../task.js';
import { Action, ActionStatus, ActionTransitions } from '../action.js';
import { IS_AGENT } from './env.js';

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

  static resolveTask(world: World, taskId?: string): Task {
    if (taskId) {
      const task = world.loadFuzzy(Task, taskId);
      if (!task) throw new Error(`Task not found: ${taskId}`);
      return task;
    }
    const focus = world.focusedForma('task');
    if (!focus) throw new Error('No task focused and --task not specified');
    const task = world.loadEntity(Task, focus.formaId.base64);
    if (!task) throw new Error(`Focused task not found: ${focus.formaId}`);
    return task;
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

    // action get <id>.<field>
    cmd
      .command('get <dotref>')
      .description('Get an action field value (format: <id>.<field>)')
      .option('-t, --task <fid>', 'Task fuzzy ID (default: focused task)')
      .action((dotref: string, options: any, cmd: any) => {
        const parts = dotref.split('.');
        if (parts.length !== 2) {
          throw new Error('Format: action get <id>.<field>');
        }
        const [id, field] = parts;

        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.resolveTask(world, options.task);
        const actionList = task.actions(world);

        try {
          const action = actionList.getItem(id);
          const value = (action as any)[field];
          if (value === undefined) {
            throw new Error(`Field not found: ${field}`);
          }
          console.log(value);
        } catch (err: any) {
          if (err.message.includes('Field not found')) {
            throw err;
          }
          throw new Error(`Action not found: ${id}`);
        }
      });

    // action set <id>.<field> <value...>
    cmd
      .command('set <dotref> <value...>')
      .description('Set an action field value (format: <id>.<field> <value>)')
      .option('-t, --task <fid>', 'Task fuzzy ID (default: focused task)')
      .action((dotref: string, values: string[], options: any, cmd: any) => {
        const parts = dotref.split('.');
        if (parts.length !== 2) {
          throw new Error('Format: action set <id>.<field> <value>');
        }
        const [id, field] = parts;

        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        // Validate status field requires exactly 2 values
        if (field === 'status') {
          if (values.length !== 2) {
            throw new Error('status field requires: <newStatus> <statusNote>');
          }
        } else {
          if (values.length !== 1) {
            throw new Error(`${field} field requires exactly one value`);
          }
        }

        const world = ActionCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ActionCommand.resolveTask(world, options.task);
        const actionList = task.actions(world);

        try {
          const action: Action = actionList.getItem(id);

          if (field === 'status') {
            const [newStatus, statusNote] = values;
            const oldStatus = action.status;
            const allowed: ActionStatus[] = ActionTransitions[oldStatus as ActionStatus] || [];

            if (IS_AGENT && oldStatus !== newStatus && !allowed.includes(newStatus as ActionStatus)) {
              throw new Error(
                `invalid transition: ${oldStatus} → ${newStatus}` +
                `\n  allowed: ${allowed.join(', ') || '(none)'}`
              );
            }

            actionList.patchItem(id, { status: newStatus, statusNote });
            world.save();
            console.log(`✓ ${oldStatus}->${newStatus} ${statusNote}`);
          } else {
            const updateCfg: any = {};
            updateCfg[field] = values[0];
            actionList.patchItem(id, updateCfg);
            world.save();
            console.log(`✓ ${field} updated`);
          }
        } catch (err: any) {
          if (err.message.includes('invalid transition')) {
            throw err;
          }
          throw new Error(`Action not found: ${id}`);
        }
      });
  }
}
