/**
 * Task command handler for nameforma CLI
 * Supports: create, list, show, update
 */

import { NameForma } from '../../../index.mjs';
import { TaskWorld, World } from '../../dist/world.js';

const { Task, Rational } = NameForma;

// Instance storage for CLI session
let tasks = new Map();
let world = null;

/**
 * Parse rational string (e.g., "1/3" or "0/1")
 * @param {string} str - Rational string
 * @returns {Rational|null}
 */
function parseRational(str) {
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
function taskFromData(data) {
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
   * Ensure world is initialized, either from -w parameter or auto-discovery
   * @param {object} options - Command options
   */
  static ensureWorld(options) {
    if (world) return;

    let worldPath = options.world;

    if (!worldPath) {
      worldPath = World.findWorld();
      if (!worldPath) {
        console.error('Error: .nameforma directory not found. Use -w/--world to specify path.');
        process.exit(1);
      }
    }

    world = new TaskWorld(worldPath);
  }

  /**
   * Register task subcommands
   * @param {Command} cmd - Commander command object
   */
  static register(cmd) {
    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // task create
    cmd
      .command('create')
      .description('Create a new task')
      .requiredOption('-t, --title <title>', 'Task title')
      .option('-n, --name <name>', 'Task name (auto-generated if not provided)')
      .option('-p, --progress <progress>', 'Task progress (e.g., 0/1 or 1/3)', '0/1')
      .option('-d, --duration <duration>', 'Task duration (e.g., 5/60 for 5/60 hours)')
      .action((options) => {
        TaskCommand.ensureWorld(options);

        const taskConfig = {
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
      .action((options) => {
        TaskCommand.ensureWorld(options);

        const taskData = world.list('task');
        if (taskData.length === 0) {
          console.log('No tasks');
          return;
        }

        console.log(`Tasks (${taskData.length}):`);
        taskData.forEach((data) => {
          const task = taskFromData(data);
          console.log(`  ${task.toString()}`);
        });
      });

    // task show
    cmd
      .command('show <id>')
      .description('Show task details')
      .action((id, options) => {
        TaskCommand.ensureWorld(options);

        const data = world.load('task', id);
        if (!data) {
          console.error(`Task not found: ${id}`);
          process.exit(1);
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
      .option('-t, --title <title>', 'Update task title')
      .option('-p, --progress <progress>', 'Update progress (e.g., 1/3)')
      .option('-d, --duration <duration>', 'Update duration')
      .action((id, options) => {
        TaskCommand.ensureWorld(options);

        const data = world.load('task', id);
        if (!data) {
          console.error(`Task not found: ${id}`);
          process.exit(1);
        }

        const task = taskFromData(data);

        const updates = {};

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
      .action((id, options) => {
        TaskCommand.ensureWorld(options);

        const data = world.load('task', id);
        if (!data) {
          console.error(`Task not found: ${id}`);
          process.exit(1);
        }

        world.delete('task', id);
        console.log(`✓ Task deleted: ${id}`);
      });
  }
}
