/**
 * Task command handler for nameforma CLI
 * Supports: create, list, show, update
 */

import path from 'path';
import { Unicode } from "@sc-voice/tools/text"
import { World } from '../world.js';
import { Task } from '../task.js';
import { Rational } from '../rational.js';


/**
 * Parse rational string (e.g., "1/3" or "0/1")
 * @param {string} str - Rational string
 * @returns {Rational|null}
 */
function parseRational(str: string): any {
  if (!str) return null;
  const [num, denom] = str.split('/').map(Number);
  if (isNaN(num) || isNaN(denom)) return null;
  return new Rational(num, denom);
}


export default class TaskCommand {
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
    cmd.addHelpText('after', '\nFor detailed subcommand help:\n  $ nameforma task help <subcommand>\n\n  Subcommands:\n  add     - Add a new task\n  list    - List all tasks\n  show    - Show task details\n  update  - Update a task\n  delete  - Delete a task');

    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // Default action: list tasks when no subcommand given
    cmd.action((options: any, cmd: any) => {
      const world = TaskCommand.getWorld(cmd.optsWithGlobals());
      const taskList = world.entityList(Task);
      if (taskList.size === 0) {
        console.log('No tasks');
        return;
      }

      console.log(`Tasks (${taskList.size}):`);
      let i = 0;
      for (const task of taskList) {
        let bullet = (i % 5 === 4) ? Unicode.BULLET : Unicode.BUL_TRIANGLE;
        let listStr = task.listItemString({
          itemId: taskList.itemListId(task),
          bullet,
        });
        console.log(listStr);
        i++;
      }
    });

    // task add
    cmd
      .command('add')
      .description('Add a new task')
      .addHelpText('after', '\nExamples:\n  $ nameforma task add -n "My Task"\n  $ nameforma task add -n "Fix bug" -s "Description" -d 2/8\n  $ nameforma task add -n "Review PR" -d 1/4')
      .requiredOption('-n, --name <name>', 'Task name')
      .option('-s, --summary <summary>', 'Task summary')
      .option('-d, --duration <duration>', 'Task duration (e.g., 5/60 for 5/60 hours)')
      .action((options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const f7t = world.entityList(Task);

        const taskConfig: any = {
          name: options.name,
        };

        if (options.summary) {
          taskConfig.summary = options.summary;
        }

        if (options.duration) {
          const duration = parseRational(options.duration);
          if (duration) {
            taskConfig.duration = duration;
          }
        }

        const task = f7t.addItem(taskConfig);

        console.log(`✓ Task added: ${task.id}`);
        console.log(`  ${task.toString()}`);
      });

    // task list
    cmd
      .command('list')
      .description('List all tasks')
      .addHelpText('after', '\nExamples:\n  $ nameforma task list')
      .action((options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());

        const taskList = world.entityList(Task);
        if (taskList.size === 0) {
          console.log('No tasks');
          return;
        }

        console.log(`Tasks (${taskList.size}):`);
        let i = 0;
        for (const task of taskList) {
          let bullet = (i % 5 === 4) ? Unicode.BULLET : Unicode.BUL_TRIANGLE;
          let listStr = task.listItemString({
            itemId: taskList.itemListId(task),
            bullet,
          });
          console.log(listStr);
          i++;
        }
      });

    // task show
    cmd
      .command('show <id>')
      .description('Show task details')
      .addHelpText('after', '\nExamples:\n  $ nameforma task show abc123def456')
      .action((id: string, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());

        const task = world.loadFuzzy(Task, id);
        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }

        console.log(`Task: ${task.id}`);
        console.log(`  name: ${task.name}`);
        if (task.duration) {
          console.log(`  duration: ${task.duration.toString()}`);
        }
      });

    // task update
    cmd
      .command('update <id>')
      .description('Update a task')
      .addHelpText('after', '\nExamples:\n  $ nameforma task update abc123def456 -d 5/60')
      .option('-d, --duration <duration>', 'Update duration')
      .action((id: string, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const f7t = world.entityList(Task);

        const task = world.loadFuzzy(Task, id);
        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }

        const updates: any = {};

        if (options.duration) {
          const duration = parseRational(options.duration);
          if (duration) {
            updates.duration = duration;
          }
        }

        f7t.patchItem(task.id.base64, updates);
        const updated = f7t.getItem(task.id.base64);

        console.log(`✓ Task updated: ${updated.id}`);
        console.log(`  ${updated.toString()}`);
      });

    // task delete
    cmd
      .command('delete <id>')
      .description('Delete a task')
      .addHelpText('after', '\nExamples:\n  $ nameforma task delete abc123def456')
      .action((id: string, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());

        const task = world.loadFuzzy(Task, id);
        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }

        world.delete('task', task.id.toString());
        console.log(`✓ Task deleted: ${task.id}`);
      });
  }
}
