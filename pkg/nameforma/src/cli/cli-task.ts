/**
 * Task command handler for nameforma CLI
 * Supports: add, list, show, update, delete
 */

import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import { Task } from '../task.js';
import { User } from '../user.js';
import UUID64 from '../uuid64.js';
import { TuiList } from './tui-list.js';
import { confirmDelete } from './confirm.js';
import { Unicode } from '@sc-voice/tools/text';
import type { GlobalOpts } from './nf-cli.js';
const { GREEN_CHECKBOX } = Unicode;
const { BRIGHT_GREEN, NO_COLOR: UNC } = Unicode.LINUX_COLOR;
const UOK = BRIGHT_GREEN + GREEN_CHECKBOX + ' ';

export default class TaskCommand {
  static readonly EXAMPLES: Record<string, string[]> = {
    add: [
      '$ nf task add "My Task with no summary"',
      '$ nf task add "My Task" "Optional summary"',
    ],
    list: ['$ nf task list # list all tasks'],
    get: [
      '$ nf task get TASK_ID',
      '$ nf task get  # gets focused task',
      '$ nf task get --json  # output as JSON',
    ],
    set: [
      '$ nf task set name "New Task Name"',
      '$ nf task set summary "New summary"',
      '$ nf task set TASK_ID.name "Renamed Task"',
    ],
    delete: [
      '$ nf task delete TASK_ID # delete with confirmation',
      '$ nf task delete --force  # deletes focused task',
    ],
    focus: [
      '$ nf task focus TASK_ID # push/move TASK_ID to top of focus stack',
      '$ nf task focus  # focuses current task',
    ],
    unfocus: [
      '$ nf task unfocus TASK_ID  # remove TASK_ID from focus stack',
      '$ nf task unfocus  # pop current focus from stack',
    ],
  };

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

    world.validate();
    const task = world.focusedForma('task') as Task | null;
    if (!task) {
      throw new Error('No task focused');
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
      const statuses = task.rawActions.map((a) => a.status);
      const allSame = statuses.every((s) => s === statuses[0]);
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
  static displayTask(
    world: World,
    task: Task,
    verbosity: number = 0,
  ): void {
    if (verbosity < -1) {
      const tui = new TuiList(task.actions(world), world, {
        maxWidth: 74,
      });
      const line = task.listItemString();
      nfTui.log(tui.wrapAndTruncate(line, 74, 1, 'ellipsis', 0));
      return;
    }

    const actions = task.actions(world);
    const references = task.references(world);
    const tui = new TuiList(actions, world, {
      maxWidth: 74,
    });

    nfTui.log(`Task: ${world.namespace.fuzzyIdOf(task)}`);
    nfTui.log(`  name: ${task.name}`);

    // Display progress
    nfTui.log(`  progress: ${TaskCommand.formatProgress(task)}`);

    // Wrap summary with proper indentation
    if (task.summary) {
      const wrappedSummary = tui.wrapAndTruncate(
        task.summary,
        74,
        undefined,
        'ellipsis',
        2,
      );
      const summaryLines = wrappedSummary.split('\n');
      nfTui.log(`  summary: ${summaryLines[0]}`);
      summaryLines.slice(1).forEach((line) => {
        nfTui.log(`    ${line}`);
      });
    } else {
      nfTui.log(`  summary:`);
    }

    nfTui.log(`  actions[${task.rawActions.length}]:`);
    if (task.rawActions.length > 0) {
      const tui = new TuiList(actions, world, { maxWidth: 74 });
      // verbosity: <0=1-line, 0=2-line, 1=4-line, 2+=full
      const ACTION_BASE = 0;
      const actionVerbosity = verbosity - ACTION_BASE;
      let maxActionLines: number | undefined; // default: show all lines
      if (actionVerbosity <= 4) {
        maxActionLines = Math.max(1, actionVerbosity + 2);
      }
      task.rawActions.forEach((action) => {
        const itemId = actions.itemListId(action) + ':';
        const line = action.listItemString({ itemId });
        const wrapped = tui.wrapAndTruncate(
          line,
          74,
          maxActionLines,
          'ellipsis',
          itemId.length + 1,
        );
        wrapped.split('\n').forEach((l) => nfTui.log(`    ${l}`));
      });
    }

    // Handle references based on verbosity level
    nfTui.log(`  references[${task.rawReferences.length}]:`);
    if (task.rawReferences.length > 0 && verbosity >= 0) {
      const tui = new TuiList(references, world, { maxWidth: 74 });
      references.sort((a, b) => b.relevance - a.relevance);
      task.rawReferences.forEach((reference) => {
        const itemId = references.itemListId(reference) + ':';
        const line = reference.listItemString({ itemId });
        const maxLines = verbosity > 1 ? verbosity + 1 : 1;
        // wrapIndent is based on visible length of itemId, not including ANSI codes in the formatted line
        const wrapIndent = itemId.length + 1;
        const wrapped = tui.wrapAndTruncate(
          line,
          74,
          maxLines,
          'ellipsis',
          wrapIndent,
        );
        wrapped.split('\n').forEach((l) => nfTui.log(`    ${l}`));
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
      nfTui.log('No tasks');
      return;
    }
    const prefs = {
      title: 'Tasks',
      wrapIndent: 13,
      fBullet: (index: number, item: any) => {
        const focusOrder = world.focusManager.focusOrder(item);
        return focusOrder < Number.MAX_SAFE_INTEGER
          ? (index === 0 ? Unicode.CIRCLED_BULLET : Unicode.WHITE_BULLET)
          : Unicode.BUL_HYPHEN;
      },
    };
    new TuiList(entityList, world, prefs).render();
  }

  /**
   * Register task subcommands
   * @param {Command} cmd - Commander command object
   * @param {Function} getGlobalOpts - Closure that returns global options
   */
  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    const helpText = [
      'Examples:',
      ...Object.values(TaskCommand.EXAMPLES)
        .flat()
        .map((e) => `  ${e}`),
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);

    // Default action: show focused task when no subcommand given
    cmd.action((options: any, cmd: any) => {
      const { world, verbosity } = getGlobalOpts();
      const task = TaskCommand.resolveTask(world);
      TaskCommand.displayTask(world, task, verbosity);
    });

    // task add
    cmd
      .command('add <name> [summary]')
      .description('Add a new, unfocused task')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.add.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .option(
        '-r, --related <fuzzy-id>',
        'Create task related to another task by ID',
      )
      .action(
        (
          name: string,
          summary: string | undefined,
          options: any,
          cmd: any,
        ) => {
          const world = getGlobalOpts().world;
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
              throw new Error(
                `Related task not found: ${options.related}`,
              );
            }
            taskConfig.id = UUID64.createRelatedId(relatedTask.id);
          }

          const task = f7t.addItem(taskConfig);

          nfTui.log(`✓ Task added: ${world.namespace.fuzzyIdOf(task)}`);
          nfTui.log(`  ${task.toString()}`);
        },
      );

    // task list
    cmd
      .command('list')
      .alias('ls')
      .description('List all tasks')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.list.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        TaskCommand.listTasks(world);
      });

    // task get
    cmd
      .command('get [id]')
      .description('Get task details')
      .option('--json', 'Output as JSON')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.get.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((id: string | undefined, options: any, cmd: any) => {
        const { world, verbosity } = getGlobalOpts();
        const task = TaskCommand.resolveTask(world, id);

        if (options.json) {
          nfTui.log(JSON.stringify(task, null, 2));
          return;
        }

        TaskCommand.displayTask(world, task, verbosity);
      });

    // task set
    cmd
      .command('set <dotref> <value...>')
      .description('Set a task field')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.set.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action(
        (dotref: string, values: string[], options: any, cmd: any) => {
          const world = getGlobalOpts().world;
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
            throw new Error(
              `Invalid field: ${field}. Allowed: name, summary`,
            );
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

          nfTui.log(`✓ Task updated: ${world.namespace.fuzzyIdOf(updated)}`);
          nfTui.log(`  ${updated.toString()}`);
        },
      );

    // task delete
    cmd
      .command('delete [id]')
      .alias('rm')
      .description('Delete a task')
      .option('-f, --force', 'Skip confirmation prompt')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.delete.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action(async (id: string | undefined, options: any, cmd: any) => {
        const world = getGlobalOpts().world;

        const task = TaskCommand.resolveTask(world, id);

        // Prompt for confirmation unless --force is specified
        if (!options.force) {
          const confirmed = await confirmDelete(task);

          if (!confirmed) {
            nfTui.log('Deletion cancelled');
            return;
          }
        }

        const taskFuzzyId = world.namespace.fuzzyIdOf(task);
        world.delete('task', task.id.toString());
        nfTui.log(`✓ Task deleted: ${taskFuzzyId}`);
      });

    // task focus
    cmd
      .command('focus [id]')
      .description('Push task onto stack as current focus')
      .addHelpText(
        'after',
        [
          '',
          'If task is already in focus stack, it is moved to the top.',
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.focus.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((id: string | undefined, options: any, cmd: any) => {
        const { world, verbosity } = getGlobalOpts();
        const task = TaskCommand.resolveTask(world, id);

        try {
          const gitDir = world.worldPath.replace(/.nameforma$/, '');
          const user = User.fromGit(gitDir);
          world.focusManager.focus(task.id, user);
        } catch {
          // Not in git repo, use default user
          world.focusManager.focus(task.id);
        }
        world.save();

        nfTui.log(UOK + `Task focused:` + UNC, task.listItemString());
        TaskCommand.displayTask(world, task, verbosity);
      });

    // task unfocus
    cmd
      .command('unfocus [id]')
      .description('Remove task from focus stack')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...TaskCommand.EXAMPLES.unfocus.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        const task = TaskCommand.resolveTask(world, id);

        world.focusManager.unfocus(task.id);
        world.save();

        nfTui.log(UOK + `Task unfocused:` + UNC, task.listItemString());
        const values = world.rgaFocusStack.values();
        nfTui.log(`Focus stack (${values.length}):`);
        for (const id of values) {
          const t = world.loadEntity(Task, id.base64);
          if (t) TaskCommand.displayTask(world, t, -2);
        }
      });
  }
}
