/**
 * Watch command handler for nameforma CLI
 * Watches the focused task file and runs task show whenever it changes
 */

import path from 'path';
import fs from 'fs';
import { World } from '../world.js';
import { Task } from '../task.js';
import TaskCommand from './cli-task.js';
import { TuiList } from './tui-list.js';

export default class WatchCommand {
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
   * Display task details
   * @param {World} world - World instance
   * @param {Task} task - Task to display
   */
  static displayTask(world: World, task: Task): void {
    const actions = task.actions(world);
    const references = task.references(world);
    const tui = new TuiList(actions, world, {
      maxWidth: 74,
    });

    console.log(`Task: ${task.id}`);
    console.log(`  name: ${task.name}`);

    // Wrap summary with proper indentation
    if (task.summary) {
      const wrappedSummary = tui.wrapAndTruncate(task.summary, 74, undefined, 'ellipsis', 2);
      const summaryLines = wrappedSummary.split('\n');
      console.log(`  summary: ${summaryLines[0]}`);
      summaryLines.slice(1).forEach((line: string) => {
        console.log(`    ${line}`);
      });
    } else {
      console.log(`  summary:`);
    }

    if (task.rawActions.length > 0) {
      const tui = new TuiList(actions, world, { maxWidth: 74 });
      console.log(`  actions (${task.rawActions.length}):`);
      task.rawActions.forEach((action) => {
        const itemId = actions.itemListId(action) + ':';
        const line = action.listItemString({ itemId });
        const wrapped = tui.wrapAndTruncate(line, 74, undefined, 'ellipsis', itemId.length + 1);
        wrapped.split('\n').forEach((l: string) => console.log(`    ${l}`));
      });
    }

    if (task.rawReferences.length > 0) {
      const tui = new TuiList(references, world, { maxWidth: 74 });
      console.log(`  references (${task.rawReferences.length}):`);
      task.rawReferences.forEach((reference) => {
        const itemId = references.itemListId(reference) + ':';
        const line = reference.listItemString({ itemId });
        const wrapped = tui.wrapAndTruncate(line, 74, undefined, 'ellipsis', itemId.length + 1);
        wrapped.split('\n').forEach((l: string) => console.log(`    ${l}`));
      });
    }
  }

  /**
   * Register watch command
   * @param {Command} cmd - Commander command object
   */
  static registerCommand(cmd: any) {
    // Add global -w/--world option
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // watch [id]
    cmd
      .argument('[id]', 'Task ID to watch (optional, defaults to focused task)')
      .description('Watch focused task file and rerun task show when it changes')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma watch',
        '  $ nameforma watch abc123def456',
      ].join('\n'))
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = WatchCommand.getWorld(cmd.optsWithGlobals());
        const task = TaskCommand.resolveTask(world, id);
        const worldPath = (world as any).worldPath || path.join(process.cwd(), '.nameforma');
        const taskFilePath = path.join(worldPath, 'task', `${task.id.base64}.json`);

        if (!fs.existsSync(taskFilePath)) {
          throw new Error(`Task file not found: ${taskFilePath}`);
        }

        console.log(`🔍 Watching task: ${task.id}`);
        console.log(`📁 File: ${taskFilePath}`);
        console.log(`Press Ctrl+C, q, or ESC to stop\n`);

        // Display initial state
        WatchCommand.displayTask(world, task);

        // Watch file for changes
        let lastMtime = fs.statSync(taskFilePath).mtime.getTime();

        const watchInterval = setInterval(() => {
          try {
            const stats = fs.statSync(taskFilePath);
            const currentMtime = stats.mtime.getTime();

            if (currentMtime !== lastMtime) {
              lastMtime = currentMtime;

              // Reload task from disk
              const reloadedTask = world.loadEntity(Task, task.id.base64);
              if (reloadedTask) {
                console.log('\n━'.repeat(74) + '\n');
                WatchCommand.displayTask(world, reloadedTask);
              }
            }
          } catch (error) {
            console.error(`Error watching file: ${error}`);
          }
        }, 500);

        const cleanup = () => {
          clearInterval(watchInterval);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
            process.stdin.removeAllListeners('data');
          }
          console.log('\n👋 Watch stopped');
          process.exit(0);
        };

        // Handle Ctrl+C
        process.on('SIGINT', cleanup);

        // Handle q and ESC key presses
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
          process.stdin.on('data', (key: Buffer) => {
            const char = key.toString();
            if (char === 'q' || char === 'Q' || key[0] === 27) { // 27 is ESC
              cleanup();
            }
          });
        }
      });
  }
}
