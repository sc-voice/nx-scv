/**
 * Commit message command handler for nameforma CLI
 * Scans focused tasks for actions marked done since last commit
 */

import path from 'path';
import { execSync } from 'child_process';
import { World } from '../world.js';
import { Task } from '../task.js';
import { TuiList } from './tui-list.js';

export default class CommitMsgCommand {
  /**
   * Get or create world instance, either from -w parameter or auto-discovery
   */
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

  /**
   * Get the date of the last commit on current branch
   * Returns ISO timestamp string
   */
  static getLastCommitDate(): Date {
    try {
      const dateStr = execSync('git log -1 --format=%ai', { encoding: 'utf-8' }).trim();
      return new Date(dateStr);
    } catch (err) {
      throw new Error('Failed to get last commit date. Make sure you are in a git repository.');
    }
  }

  /**
   * Register commit-msg command
   */
  static registerCommand(cmd: any) {
    cmd
      .description('List done actions from focused tasks since last commit')
      .addHelpText('after', [
        '',
        'Outputs to stdout. Redirect to file if needed:',
        '  $ nf commit-msg > .commit-msg',
      ].join('\n'))
      .action((options: any, cmdObj: any) => {
        try {
          const world = CommitMsgCommand.getWorld(cmdObj.optsWithGlobals());
          const lastCommitDate = CommitMsgCommand.getLastCommitDate();

          // Get all focused tasks
          const focusStack = Array.from(world.focusStack);
          if (focusStack.length === 0) {
            throw new Error('No focused tasks');
          }

          const lines: string[] = [];

          // Process each focused task
          for (const focus of focusStack) {
            const task = world.loadEntity(Task, focus.formaId.base64);
            if (!task) continue;

            // Get done actions since last commit
            const doneActions = task.rawActions.filter(action => {
              return action.status === 'done' && action.statusDate && new Date(action.statusDate) > lastCommitDate;
            });

            if (doneActions.length === 0) continue;

            // Add task header
            lines.push(`Task: ${task.id.timeId()} ${task.name}`);

            // Add each done action (1-line format)
            const actions = task.actions(world);
            const tui = new TuiList(actions, world, { maxWidth: 74 });
            for (const action of doneActions) {
              const itemId = actions.itemListId(action) + ':';
              const line = action.listItemString({ itemId });
              const wrapped = tui.wrapAndTruncate(line, 74, 1, 'ellipsis', itemId.length);
              lines.push(`  ${wrapped}`);
            }
          }

          // Error if no done actions found
          if (lines.length === 0) {
            throw new Error('No done actions found since last commit');
          }

          // Output to stdout
          console.log(lines.join('\n'));
        } catch (err: any) {
          throw new Error(`commit-msg: ${err.message}`);
        }
      });
  }
}
