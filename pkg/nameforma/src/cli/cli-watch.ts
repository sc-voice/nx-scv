/**
 * Watch command handler for nameforma CLI
 * Watches the focused task file and runs task get whenever it changes
 */

import path from 'path';
import fs from 'fs';
import { World } from '../world.js';
import { Task } from '../task.js';
import TaskCommand from './cli-task.js';
import { TuiList } from './tui-list.js';
import { Unicode } from '@sc-voice/tools/text';

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

  static displayStatusLine(verbosity: number): void {
    const { BRIGHT_CYAN } = Unicode.LINUX_COLOR;
    const { RESET } = Unicode.LINUX_STYLE;
    const verbLabel = verbosity === 0 ? 'verbosity' : (verbosity > 0 ? `verbosity+${verbosity}` : `verbosity${verbosity}`);
    const keys = [
      'q:quit',
      'h:help',
      `+/-:${verbLabel}`
    ];
    const statusLine = `[ ${keys.join(' | ')} ]`;
    const cols = process.stdout.columns || 80;
    const padding = Math.max(0, cols - statusLine.length);
    process.stdout.write(`\x1b[${process.stdout.rows};H`); // Move to last line
    process.stdout.write('\x1b[K'); // Clear line
    process.stdout.write(`${BRIGHT_CYAN}${statusLine}${RESET}`);
  }

  static displayHelp(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Available Keys:');
    console.log('  q / Q / ESC         Quit watch mode');
    console.log('  h                   Show this help');
    console.log('  space               Refresh display');
    console.log('  + / → (right)       Increase verbosity level');
    console.log('  - / ← (left)        Decrease verbosity level');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
      .description('Watch focused task file and rerun task get when it changes')
      .addHelpText('after', [
        '',
        'Examples:',
        '  $ nameforma watch',
        '  $ nameforma watch abc123def456',
      ].join('\n'))
      .action((id: string | undefined, options: any, cmd: any) => {
        let world = WatchCommand.getWorld(cmd.optsWithGlobals());
        let task = TaskCommand.resolveTask(world, id);
        let verbosity = parseInt(cmd.optsWithGlobals().verbose || '0', 10);
        const worldPath = (world as any).worldPath || path.join(process.cwd(), '.nameforma');
        const worldFilePath = path.join(worldPath, 'world.json');
        let taskFilePath = path.join(worldPath, 'task', `${task.id.base64}.json`);

        if (!fs.existsSync(taskFilePath)) {
          throw new Error(`Task file not found: ${taskFilePath}`);
        }

        console.log(`🔍 Watching task: ${task.id}`);
        console.log(`📁 File: ${taskFilePath}`);
        console.log(`Press h for help\n`);

        // Display initial state
        TaskCommand.displayTask(world, task, verbosity);
        WatchCommand.displayStatusLine(verbosity);

        // Track mtimes for both world.json and task file
        let mtimes = {
          world: fs.statSync(worldFilePath).mtime.getTime(),
          task: fs.statSync(taskFilePath).mtime.getTime(),
        };

        const watchInterval = setInterval(() => {
          try {
            // Check world.json for focus changes
            if (fs.existsSync(worldFilePath)) {
              const worldStats = fs.statSync(worldFilePath);
              const currentWorldMtime = worldStats.mtime.getTime();

              if (currentWorldMtime !== mtimes.world) {
                mtimes.world = currentWorldMtime;

                // Reload world to detect focus changes
                world = World.fromPath(worldPath);
                const newFocus = world.focusedForma('task');

                // Check if focused task changed
                if (newFocus && newFocus.formaId.base64 !== task.id.base64) {
                  const oldTaskId = task.id.base64;
                  const newTask = world.loadEntity(Task, newFocus.formaId.base64);

                  if (newTask) {
                    task = newTask;
                    taskFilePath = path.join(worldPath, 'task', `${task.id.base64}.json`);

                    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
                    console.log(`📌 Focus changed from ${oldTaskId} to ${task.id.base64}`);
                    console.log(`📁 New file: ${taskFilePath}\n`);

                    // Reset task file mtime for the new task
                    if (fs.existsSync(taskFilePath)) {
                      mtimes.task = fs.statSync(taskFilePath).mtime.getTime();
                    }

                    TaskCommand.displayTask(world, task, verbosity);
                    WatchCommand.displayStatusLine(verbosity);
                  }
                }
              }
            }

            // Check task file for changes
            if (fs.existsSync(taskFilePath)) {
              const taskStats = fs.statSync(taskFilePath);
              const currentTaskMtime = taskStats.mtime.getTime();

              if (currentTaskMtime !== mtimes.task) {
                mtimes.task = currentTaskMtime;

                // Reload task from disk
                const reloadedTask = world.loadEntity(Task, task.id.base64);
                if (reloadedTask) {
                  task = reloadedTask;
                  console.log('\n━'.repeat(74) + '\n');
                  TaskCommand.displayTask(world, task, verbosity);
                  WatchCommand.displayStatusLine(verbosity);
                }
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

        // Handle key presses
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
          process.stdin.on('data', (key: Buffer) => {
            const char = key.toString();
            // Check for arrow keys (multi-byte sequences)
            const isRightArrow = key.length === 3 && key[0] === 27 && key[1] === 91 && key[2] === 67;
            const isLeftArrow = key.length === 3 && key[0] === 27 && key[1] === 91 && key[2] === 68;

            if (char === 'q' || char === 'Q' || (key[0] === 27 && !isRightArrow && !isLeftArrow)) { // 27 is ESC (but not arrow)
              cleanup();
            } else if (char === 'h' || char === 'H') {
              WatchCommand.displayHelp();
              WatchCommand.displayStatusLine(verbosity);
            } else if (char === ' ') {
              console.log('\n━'.repeat(74) + '\n');
              TaskCommand.displayTask(world, task, verbosity);
              WatchCommand.displayStatusLine(verbosity);
            } else if (char === '+' || char === '=' || isRightArrow) {
              verbosity = Math.min(3, verbosity + 1);
              console.log('\n━'.repeat(74) + '\n');
              TaskCommand.displayTask(world, task, verbosity);
              WatchCommand.displayStatusLine(verbosity);
            } else if (char === '-' || char === '_' || isLeftArrow) {
              verbosity = Math.max(0, verbosity - 1);
              console.log('\n━'.repeat(74) + '\n');
              TaskCommand.displayTask(world, task, verbosity);
              WatchCommand.displayStatusLine(verbosity);
            }
          });
        }
      });
  }
}
