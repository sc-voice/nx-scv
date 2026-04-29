/**
 * Action command handler for nameforma CLI
 * Lists actions for the currently focused task
 */

import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import type { GlobalOpts } from './nf-cli.js';
import { Task } from '../task.js';
import { Action, ActionStatus, ActionTransitions } from '../action.js';
import { settings } from './settings.js';
import { confirm } from './confirm.js';

export default class ActionCommand {
  static readonly EXAMPLES: Record<string, string[]> = {
    list: [
      '$ nf action list # list actions for focused task',
    ],
    show: [
      '$ nf action show ACTION_ID # show a specific action',
    ],
    add: [
      '$ nf action add "Implement feature" --summary "Add user auth"',
      '$ nf action add "Write tests" --status req',
    ],
    delete: [
      '$ nf action delete ACTION_ID # delete an action',
    ],
    get: [
      '$ nf action get ACTION_ID.name # get an action field',
      '$ nf action get ACTION_ID.status',
    ],
    set: [
      '$ nf action set ACTION_ID.status work "in progress"',
      '$ nf action set ACTION_ID.summary "Updated description"',
    ],
  };

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
    nfTui.log(`${status} ${index}. ${action.name}`);
    if (action.summary) {
      nfTui.log(`   ${action.summary}`);
    }
  }


  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    const helpText = ['Examples:',
      ...Object.values(ActionCommand.EXAMPLES).flat().map(e => `  ${e}`)
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);

    // Default action: list actions of focused task
    cmd
      .description('Manage actions that can be added, listed, updated, and deleted for tasks')
      .action((options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          nfTui.log('No task is currently focused');
          return;
        }

        const actionList = task.actions(world);
        const actions = actionList.items;

        if (actions.length === 0) {
          nfTui.log('No actions');
          return;
        }

        nfTui.log(`Actions for: ${task.name}`);
        nfTui.log('');
        actions.forEach((action: any, index: number) => {
          ActionCommand.printAction(action, index + 1);
        });
      });

    // action list
    cmd
      .command('list')
      .description('List actions for the focused task')
      .addHelpText('after', ['', 'Examples:',
        ...ActionCommand.EXAMPLES.list.map(e => `  ${e}`)
      ].join('\n'))
      .action((options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          nfTui.log('No task is currently focused');
          return;
        }

        const actionList = task.actions(world);
        const actions = actionList.items;

        if (actions.length === 0) {
          nfTui.log('No actions');
          return;
        }

        nfTui.log(`Actions for: ${task.name}`);
        nfTui.log('');
        actions.forEach((action: any, index: number) => {
          ActionCommand.printAction(action, index + 1);
        });
      });

    // action show <id>
    cmd
      .command('show <id>')
      .description('Show a specific action')
      .addHelpText('after', ['', 'Examples:',
        ...ActionCommand.EXAMPLES.show.map(e => `  ${e}`)
      ].join('\n'))
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = getGlobalOpts().world;
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const actionList = task.actions(world);

        try {
          const action = actionList.getItem(id);
          nfTui.log(`Action: ${task.name}`);
          nfTui.log('');
          const index = actionList.items.indexOf(action) + 1;
          ActionCommand.printAction(action, index);
        } catch (err: any) {
          throw new Error(`Action not found: ${id}`);
        }
      });

    // action add
    cmd
      .command('add <name>')
      .description('Add an action to the focused task')
      .option('-s, --summary <summary>', 'Action summary')
      .addHelpText('after', ['', 'Examples:',
        ...ActionCommand.EXAMPLES.add.map(e => `  ${e}`)
      ].join('\n'))
      .action((name: string, options: any, cmd: any) => {
        const world = getGlobalOpts().world;
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

        nfTui.log(`✓ Action added: ${action.id.base64}`);
        nfTui.log(`  ${action.name}`);
      });

    // action delete <id>
    cmd
      .command('delete <id>')
      .description('Delete an action')
      .addHelpText('after', ['', 'Examples:',
        ...ActionCommand.EXAMPLES.delete.map(e => `  ${e}`)
      ].join('\n'))
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = getGlobalOpts().world;
        const task = ActionCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const actionList = task.actions(world);

        try {
          const action = actionList.deleteItem(id);
          world.save();

          nfTui.log(`✓ Action deleted`);
          nfTui.log(`  ${action.name}`);
        } catch (err: any) {
          throw new Error(`Action not found: ${id}`);
        }
      });

    // action get <id>.<field>
    cmd
      .command('get <dotref>')
      .description('Get an action field value (format: <id>.<field>)')
      .option('-t, --task <fid>', 'Task fuzzy ID (default: focused task)')
      .addHelpText('after', ['', 'Examples:',
        ...ActionCommand.EXAMPLES.get.map(e => `  ${e}`)
      ].join('\n'))
      .action((dotref: string, options: any, cmd: any) => {
        const parts = dotref.split('.');
        if (parts.length !== 2) {
          throw new Error('Format: action get <id>.<field>');
        }
        const [id, field] = parts;

        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = getGlobalOpts().world;
        const task = ActionCommand.resolveTask(world, options.task);
        const actionList = task.actions(world);

        try {
          const action = actionList.getItem(id);
          const value = (action as any)[field];
          if (value === undefined) {
            throw new Error(`Field not found: ${field}`);
          }
          nfTui.log(value);
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
      .addHelpText('after', ['',
        'Updatable fields:',
        '  name        Title',
        '  summary     Detailed summary',
        '  status      Action status with note (requires: <newStatus> <statusNote>)',
        '  statusNote  Status change note',
        '',
        'Examples:',
        ...ActionCommand.EXAMPLES.set.map(e => `  ${e}`),
      ].join('\n'))
      .option('-t, --task <fid>', 'Task fuzzy ID (default: focused task)')
      .action(async (dotref: string, values: string[], options: any, cmd: any) => {
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

        const world = getGlobalOpts().world;
        const task = ActionCommand.resolveTask(world, options.task);
        const actionList = task.actions(world);

        try {
          const action: Action = actionList.getItem(id);

          if (field === 'status') {
            const [newStatus, statusNote] = values;
            const oldStatus = action.status;
            const allowed: ActionStatus[] = ActionTransitions[oldStatus as ActionStatus] || [];

            if (settings.isAgent && oldStatus !== newStatus && !allowed.includes(newStatus as ActionStatus)) {
              throw new Error(
                `invalid transition: ${oldStatus} → ${newStatus}` +
                `\n  allowed: ${allowed.join(', ') || '(none)'}`
              );
            }

            if (settings.isAgent && (newStatus === 'done')) {
              const consensusConfirmed = await confirm(
                `>>> Action: ${action.id}\n>>> name: ${action.name}\n>>> Transition to '${newStatus}': Was team consulted and consensus gained? (no/yes) `
              );
              if (!consensusConfirmed) {
                nfTui.log('Transition cancelled - consensus required');
                return;
              }
            }

            actionList.patchItem(id, { status: newStatus, statusNote });
            world.save();
            nfTui.log(`✓ ${oldStatus}->${newStatus} ${statusNote}`);
          } else {
            const updateCfg: any = {};
            updateCfg[field] = values[0];
            actionList.patchItem(id, updateCfg);
            world.save();
            nfTui.log(`✓ ${field} updated`);
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
