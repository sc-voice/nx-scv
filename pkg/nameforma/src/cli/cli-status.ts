/**
 * Status command handler for nameforma CLI
 * Updates action status with transitions enforced by ActionTransitions map
 *
 * @see doc/task-action.md
 */

import path from 'path';
import { World } from '../world.js';
import { Task } from '../task.js';
import { Action, ActionStatus, ActionTransitions } from '../action.js';

export default class StatusCommand {
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

  static registerCommand(cmd: any) {
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    cmd
      .command('set')
      .description('Set action status (enforces valid transitions)')
      .option('-t, --task <fid>', 'Task fuzzy ID (default: focused task)')
      .requiredOption('-a, --action <fid>', 'Action fuzzy ID')
      .argument('<new-status>', 'New status value')
      .argument('<status-note>', 'Note about this transition')
      .action((newStatus: string, statusNote: string, options: any, cmd: any) => {
        const world = StatusCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = StatusCommand.resolveTask(world, options.task);
        const actionList = task.actions(world);
        const action: Action = actionList.getItem(options.action);

        const oldStatus = action.status;
        const allowed: ActionStatus[] = ActionTransitions[oldStatus as ActionStatus] || [];
        if (!allowed.includes(newStatus as ActionStatus)) {
          throw new Error(
            `invalid transition: ${oldStatus} → ${newStatus}` +
            `\n  allowed: ${allowed.join(', ') || '(none)'}`
          );
        }

        actionList.patchItem(options.action, { status: newStatus, statusNote });
        world.save();

        console.log(`✓ ${oldStatus}->${newStatus} ${statusNote}`);
      });
  }
}
