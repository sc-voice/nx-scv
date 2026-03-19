/**
 * Task command handler for nameforma CLI
 * Supports: create, list, show, update
 */

import { NameForma } from '../../index.js';
import { TaskWorld, World } from '../../world.js';

const { Task, Rational } = NameForma;

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

/**
 * Reconstruct Task object from plain JSON data
 * @param {object} data - Plain JSON object
 * @returns {Task} - Task instance
 */
function taskFromData(data: any): any {
  const task = new Task({
    id: data.id,
    name: data.name,
    title: data.title,
    progress: data.progress,
    duration: data.duration,
  });
  return task;
}

export default class TaskCommand {
  /**
   * Get or create world instance, either from -w parameter or auto-discovery
   * @param {object} options - Command options
   * @returns {TaskWorld} - World instance
   */
  static getWorld(options: any): any {
    let worldPath = options.world;

    if (!worldPath) {
      worldPath = World.findWorld();
      if (!worldPath) {
        throw new Error('.nameforma directory not found. Use -w/--world to specify path.');
      }
    }

    return new TaskWorld(worldPath);
  }

  /**
   * Register task subcommands
   * @param {Command} cmd - Commander command object
   */
  static register(cmd: any) {
    // Add help text for the task command
    cmd.addHelpText('after', '\nFor detailed subcommand help:\n  $ nameforma task help <subcommand>\n\nSubcommands:\n  create  - Create a new task\n  list    - List all tasks\n  show    - Show task details\n  update  - Update a task\n  delete  - Delete a task');

    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // task create
    cmd
      .command('create')
      .description('Create a new task')
      .addHelpText('after', '\nExamples:\n  $ nameforma task create -t "My Task"\n  $ nameforma task create -t "Fix bug" -p 1/3 -d 2/8\n  $ nameforma task create -t "Review PR" -n custom-name -p 0/1')
      .requiredOption('-t, --title <title>', 'Task title')
      .option('-n, --name <name>', 'Task name (auto-generated if not provided)')
      .option('-p, --progress <progress>', 'Task progress (e.g., 0/1 or 1/3)', '0/1')
      .option('-d, --duration <duration>', 'Task duration (e.g., 5/60 for 5/60 hours)')
      .action((options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.opts());

        const taskConfig: any = {
          title: options.title,
        };

        if (options.name) {
          taskConfig.name = options.name;
        }

        if (options.progress) {
          const progress = parseRational(options.progress);
          if (progress) {
            taskConfig.progress = progress;
          }
        }

        if (options.duration) {
          const duration = parseRational(options.duration);
          if (duration) {
            taskConfig.duration = duration;
          }
        }

        const task = new Task(taskConfig);
        world.save('task', task);

        console.log(`✓ Task created: ${task.id}`);
        console.log(`  ${task.toString()}`);
      });

    // task list
    cmd
      .command('list')
      .description('List all tasks')
      .addHelpText('after', '\nExamples:\n  $ nameforma task list')
      .action((options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.opts());

        const taskData = world.list('task');
        if (taskData.length === 0) {
          console.log('No tasks');
          return;
        }

        console.log(`Tasks (${taskData.length}):`);
        taskData.forEach((data: any) => {
          const task = taskFromData(data);
          console.log(`  ${task.toString()}`);
        });
      });

    // task show
    cmd
      .command('show <id>')
      .description('Show task details')
      .addHelpText('after', '\nExamples:\n  $ nameforma task show abc123def456')
      .action((id: string, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.opts());

        const data = world.load('task', id);
        if (!data) {
          throw new Error(`Task not found: ${id}`);
        }

        const task = taskFromData(data);
        console.log(`Task: ${task.id}`);
        console.log(`  name: ${task.name}`);
        console.log(`  title: ${task.title}`);
        console.log(`  progress: ${task.progress.toString()}`);
        if (task.duration) {
          console.log(`  duration: ${task.duration.toString()}`);
        }
      });

    // task update
    cmd
      .command('update <id>')
      .description('Update a task')
      .addHelpText('after', '\nExamples:\n  $ nameforma task update abc123def456 -t "Updated title"\n  $ nameforma task update abc123def456 -p 2/3')
      .option('-t, --title <title>', 'Update task title')
      .option('-p, --progress <progress>', 'Update progress (e.g., 1/3)')
      .option('-d, --duration <duration>', 'Update duration')
      .action((id: string, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.opts());

        const data = world.load('task', id);
        if (!data) {
          throw new Error(`Task not found: ${id}`);
        }

        const task = taskFromData(data);

        const updates: any = {};

        if (options.title) {
          updates.title = options.title;
        }

        if (options.progress) {
          const progress = parseRational(options.progress);
          if (progress) {
            updates.progress = progress;
          }
        }

        if (options.duration) {
          const duration = parseRational(options.duration);
          if (duration) {
            updates.duration = duration;
          }
        }

        task.patch(updates);
        world.save('task', task);

        console.log(`✓ Task updated: ${task.id}`);
        console.log(`  ${task.toString()}`);
      });

    // task delete
    cmd
      .command('delete <id>')
      .description('Delete a task')
      .addHelpText('after', '\nExamples:\n  $ nameforma task delete abc123def456')
      .action((id: string, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.opts());

        const data = world.load('task', id);
        if (!data) {
          throw new Error(`Task not found: ${id}`);
        }

        world.delete('task', id);
        console.log(`✓ Task deleted: ${id}`);
      });
  }
}
