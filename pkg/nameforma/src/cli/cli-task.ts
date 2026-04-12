/**
 * Task command handler for nameforma CLI
 * Supports: add, list, show, update, delete
 */

import path from 'path';
import { World } from '../world.js';
import { Task } from '../task.js';
import UUID64 from '../uuid64.js';
import { TuiList } from './tui-list.js';
import { confirmDelete } from './confirm.js';




export default class TaskCommand {
  /**
   * Resolve task ID, falling back to focused task if id is not provided
   * @param {World} world - World instance
   * @param {string} id - Optional task ID
   * @returns {Task} - Resolved task
   * @throws {Error} - If task not found or no focus available
   */
  static resolveTask(world: World, id?: string): Task {
    if (id) {
      const task = world.loadFuzzy(Task, id);
      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }
      return task;
    }

    const focus = world.focusedForma('task');
    if (!focus) {
      throw new Error('No task focused');
    }

    const task = world.loadEntity(Task, focus.formaId.base64);
    if (!task) {
      throw new Error(`Task not found: ${focus.formaId}`);
    }
    return task;
  }

  /**
   * List tasks, with focused tasks at top and top-of-stack highlighted in bright green
   * @param {World} world - World instance
   */
  static listTasks(world: World): void {
    const entityList = world.entityList(Task);
    if (entityList.size === 0) {
      console.log('No tasks');
      return;
    }
    new TuiList(entityList, world, { title: 'Tasks' }).render();
  }

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
   * Register task subcommands
   * @param {Command} cmd - Commander command object
   */
  static registerCommand(cmd: any) {
    // Add help text for the task command
    const helpText = [
      'For detailed subcommand help:',
      '  $ nameforma task help <subcommand>',
      '',
      '  Subcommands:',
      '  add     - Add a new task',
      '  list    - List all tasks',
      '  show    - Show task details',
      '  update  - Update a task',
      '  delete  - Delete a task',
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);

    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // Default action: list tasks when no subcommand given
    cmd.action((options: any, cmd: any) => {
      const world = TaskCommand.getWorld(cmd.optsWithGlobals());
      TaskCommand.listTasks(world);
    });

    // task add
    cmd
      .command('add')
      .description('Add a new task')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task add -n "My Task"',
        '  $ nameforma task add -n "Fix bug" -s "Description"',
      ].join('\n'))
      .requiredOption('-n, --name <name>', 'Task name')
      .option('-s, --summary <summary>', 'Task summary')
      .option('-r, --related <fuzzy-id>', 'Create task related to another task by ID')
      .action((options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const f7t = world.entityList(Task);

        const taskConfig: any = {
          name: options.name,
        };

        if (options.summary) {
          taskConfig.summary = options.summary;
        }

        if (options.related) {
          const relatedTask = world.loadFuzzy(Task, options.related);
          if (!relatedTask) {
            throw new Error(`Related task not found: ${options.related}`);
          }
          taskConfig.id = UUID64.createRelatedId(relatedTask.id);
        }

        const task = f7t.addItem(taskConfig);

        console.log(`✓ Task added: ${task.id}`);
        console.log(`  ${task.toString()}`);
      });

    // task list
    cmd
      .command('list')
      .description('List all tasks')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task list',
      ].join('\n'))
      .action((options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        TaskCommand.listTasks(world);
      });

    // task show
    cmd
      .command('show [id]')
      .description('Show task details')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task show abc123def456',
        '  $ nameforma task show  (shows focused task)',
      ].join('\n'))
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = TaskCommand.resolveTask(world, id);
        const actions = task.actions(world);

        console.log(`Task: ${task.id}`);
        console.log(`  name: ${task.name}`);
        console.log(`  summary: ${task.summary}`);

        if (task.rawActions.length > 0) {
          console.log(`  actions:`);
          task.rawActions.forEach((action, index) => {
            let itemId = actions.itemListId(action) + ":";
            console.log(`   `, action.listItemString({itemId}));
          });
        }
      });

    // task update
    cmd
      .command('update [id]')
      .description('Update a task')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task update abc123def456 -n "New name"',
        '  $ nameforma task update -n "New name"  (updates focused task)',
      ].join('\n'))
      .option('-n, --name <name>', 'Update task name')
      .option('-s, --summary <summary>', 'Update task summary')
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const f7t = world.entityList(Task);

        const task = TaskCommand.resolveTask(world, id);

        const updates: any = {};
        if (options.name) {
          updates.name = options.name;
        }
        if (options.summary) {
          updates.summary = options.summary;
        }

        f7t.patchItem(task.id.base64, updates);
        const updated = f7t.getItem(task.id.base64);

        console.log(`✓ Task updated: ${updated.id}`);
        console.log(`  ${updated.toString()}`);
      });

    // task delete
    cmd
      .command('delete [id]')
      .description('Delete a task')
      .option('-f, --force', 'Skip confirmation prompt')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task delete abc123def456',
        '  $ nameforma task delete --force  (deletes focused task)',
      ].join('\n'))
      .action(async (id: string | undefined, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());

        const task = TaskCommand.resolveTask(world, id);

        // Prompt for confirmation unless --force is specified
        if (!options.force) {
          const confirmed = await confirmDelete(task);

          if (!confirmed) {
            console.log('Deletion cancelled');
            return;
          }
        }

        world.delete('task', task.id.toString());
        console.log(`✓ Task deleted: ${task.id}`);
      });
  }
}
