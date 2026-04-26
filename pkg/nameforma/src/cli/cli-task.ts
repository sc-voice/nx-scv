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
import { Unicode } from '@sc-voice/tools/text';

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
   * Format task progress as colored percentage with optional state suffix.
   * Returns formatted string like "83% manage" or "50%"
   * @param {Task} task - Task to format progress for
   * @returns Formatted progress string with colors
   */
  static formatProgress(task: Task): string {
    const pct = Math.round(task.progress() * 100);
    const { NO_COLOR } = Unicode.LINUX_COLOR;
    const color = task.progressColor();
    const coloredPct = `${color}${pct}%${NO_COLOR}`;

    // Append state if all actions have the same status
    if (task.rawActions.length > 0) {
      const statuses = task.rawActions.map(a => a.status);
      const allSame = statuses.every(s => s === statuses[0]);
      if (allSame) {
        return `${coloredPct} ${color}${statuses[0]}${NO_COLOR}`;
      }
    }
    return coloredPct;
  }

  /**
   * Display task details (ID, name, progress, summary, actions, references)
   * @param {World} world - World instance
   * @param {Task} task - Task to display
   * @param {number} verbosity - Verbosity level: <0=minimal, 0=moderate, 1=4-line actions, 2=full actions, 3=view all
   */
  static displayTask(world: World, task: Task, verbosity: number = 0): void {
    const actions = task.actions(world);
    const references = task.references(world);
    const tui = new TuiList(actions, world, {
      maxWidth: 74,
    });

    console.log(`Task: ${task.id}`);
    console.log(`  name: ${task.name}`);

    // Display progress
    console.log(`  progress: ${TaskCommand.formatProgress(task)}`);

    // Wrap summary with proper indentation
    if (task.summary) {
      const wrappedSummary = tui.wrapAndTruncate(task.summary, 74, undefined, 'ellipsis', 2);
      const summaryLines = wrappedSummary.split('\n');
      console.log(`  summary: ${summaryLines[0]}`);
      summaryLines.slice(1).forEach((line) => {
        console.log(`    ${line}`);
      });
    } else {
      console.log(`  summary:`);
    }

    if (task.rawActions.length > 0) {
      const tui = new TuiList(actions, world, { maxWidth: 74 });
      console.log(`  actions (${task.rawActions.length}):`);
      // verbosity: <0=1-line, 0=2-line, 1=4-line, 2+=full
      const maxActionLines = verbosity < 0 ? 1 : (verbosity === 0 ? 2 : (verbosity === 1 ? 4 : undefined));
      task.rawActions.forEach((action) => {
        const itemId = actions.itemListId(action) + ':';
        const line = action.listItemString({ itemId });
        const wrapped = tui.wrapAndTruncate(line, 74, maxActionLines, 'ellipsis', itemId.length + 1);
        wrapped.split('\n').forEach((l) => console.log(`    ${l}`));
      });
    }

    // Handle references based on verbosity level
    // verbosity 3: show all (multi-line); verbosity 1-2: 1-line; <1: omit
    if (task.rawReferences.length > 0 && verbosity >= 1) {
      const tui = new TuiList(references, world, { maxWidth: 74 });
      console.log(`  references (${task.rawReferences.length}):`);
      references.sort((a, b) => b.relevance - a.relevance);
      task.rawReferences.forEach((reference) => {
        const itemId = references.itemListId(reference) + ':';
        const line = reference.listItemString({ itemId });
        const maxLines = verbosity === 3 ? undefined : 1;
        const wrapped = tui.wrapAndTruncate(line, 74, maxLines, 'ellipsis', itemId.length + 1);
        wrapped.split('\n').forEach((l) => console.log(`    ${l}`));
      });
    }
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
    const prefs = {
      title: 'Tasks', 
      wrapIndent: 13, 
      fBullet: (index:number, item:any) => {
        const focusOrder = world.focusOrder(item);
        return (focusOrder < Number.MAX_SAFE_INTEGER ? Unicode.CIRCLED_BULLET : Unicode.BULLET);
      }
    }
    new TuiList(entityList, world, prefs).render();
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
      '  $ nameforma --help <subcommand>',
      '',
      'Subcommands:',
      '  task add     - Add a new task',
      '  task list    - List all tasks',
      '  task get     - Get task details',
      '  task set     - Set a task field',
      '  task delete  - Delete a task',
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);

    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // Default action: show focused task when no subcommand given
    cmd.action((options: any, cmd: any) => {
      const world = TaskCommand.getWorld(cmd.optsWithGlobals());
      const task = TaskCommand.resolveTask(world);
      const verbosity = parseInt(cmd.optsWithGlobals().verbose || '0', 10);
      TaskCommand.displayTask(world, task, verbosity);
    });

    // task add
    cmd
      .command('add <name> [summary]')
      .description('Add a new, unfocused task')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task add "My Task"',
        '  $ nameforma task add "My Task" "Optional description"',
      ].join('\n'))
      .option('-r, --related <fuzzy-id>', 'Create task related to another task by ID')
      .action((name: string, summary: string | undefined, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const f7t = world.entityList(Task);

        const taskConfig: any = {
          name: name,
        };

        if (summary) {
          taskConfig.summary = summary;
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

    // task get
    cmd
      .command('get [id]')
      .description('Get task details')
      .option('--json', 'Output as JSON')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task get abc123def456',
        '  $ nameforma task get  (gets focused task)',
        '  $ nameforma task get --json (output as JSON)',
      ].join('\n'))
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = TaskCommand.resolveTask(world, id);

        if (options.json) {
          console.log(JSON.stringify(task, null, 2));
          return;
        }

        const verbosity = parseInt(cmd.parent.optsWithGlobals().verbose || '0', 10);
        TaskCommand.displayTask(world, task, verbosity);
      });

    // task set
    cmd
      .command('set <dotref> <value...>')
      .description('Set a task field')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma task set name "New Task Name"',
        '  $ nameforma task set summary "New description"',
        '  $ nameforma task set abc123.name "Specific Task"',
        '  $ nameforma task set abc123.summary "Task description"',
      ].join('\n'))
      .action((dotref: string, values: string[], options: any, cmd: any) => {
        const world = TaskCommand.getWorld(cmd.parent.optsWithGlobals());
        const f7t = world.entityList(Task);

        // Parse dotref: [<taskId>].field or just field
        let taskId: string | undefined;
        let field: string;

        if (dotref.includes('.')) {
          const parts = dotref.split('.');
          taskId = parts[0] || undefined;
          field = parts[1];
        } else {
          field = dotref;
        }

        // Validate field
        if (!['name', 'summary'].includes(field)) {
          throw new Error(`Invalid field: ${field}. Allowed: name, summary`);
        }

        // Get value and strip line breaks
        const value = values.join(' ').replace(/\n/g, ' ').trim();

        // Validate name field
        if (field === 'name' && !value) {
          throw new Error('Task name cannot be blank');
        }

        // Resolve task
        const task = TaskCommand.resolveTask(world, taskId);

        // Update task
        const updates: any = {};
        updates[field] = value;
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
