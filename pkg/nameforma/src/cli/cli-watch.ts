/**
 * Watch command handler for nameforma CLI
 * Watches the focused task file and runs task get whenever it changes
 */

import path from 'path';
import fs from 'fs';
import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import { FileRepository } from '../file-repository.js';
import { Task } from '../task.js';
import TaskCommand from './cli-task.js';
import { TuiList } from './tui-list.js';
import { Unicode } from '@sc-voice/tools/text';
import { NfProgram } from '../nf-program.js';
import type { ICommand } from '../nf-program.js';

export default class WatchCommand {
  static displayStatusLine(verbosity: number): void {
    const { BRIGHT_CYAN } = Unicode.LINUX_COLOR;
    const { RESET } = Unicode.LINUX_STYLE;
    const verbLabel =
      verbosity === 0
        ? 'verbosity'
        : verbosity > 0
          ? `verbosity+${verbosity}`
          : `verbosity${verbosity}`;
    const keys = ['q:quit', 'h:help', `+/-:${verbLabel}`];
    const statusLine = `[ ${keys.join(' | ')} ]`;
    const cols = process.stdout.columns || 80;
    const padding = Math.max(0, cols - statusLine.length);
    process.stdout.write(`\x1b[${process.stdout.rows};H`); // Move to last line
    process.stdout.write('\x1b[K'); // Clear line
    process.stdout.write(`${BRIGHT_CYAN}${statusLine}${RESET}`);
  }

  static displayHelp(): void {
    nfTui.log(
      '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    );
    nfTui.log('Available Keys:');
    nfTui.log('  q / Q / ESC         Quit watch mode');
    nfTui.log('  h                   Show this help');
    nfTui.log('  space               Refresh display');
    nfTui.log('  + / → (right)       Increase verbosity level');
    nfTui.log('  - / ← (left)        Decrease verbosity level');
    nfTui.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
    );
  }

  /**
   * Register watch command
   * @param {Command} cmd - Commander command object
   * @param {Function} getGlobalOpts - Closure that returns global options
   */
  static registerCommand(cmd: ICommand, nfProgram: NfProgram) {
    // watch [id]
    cmd
      .argument(
        '[id]',
        'Task ID to watch (optional, defaults to focused task)',
      )
      .description(
        'Watch focused task file and rerun task get when it changes',
      )
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          '  $ nameforma watch',
          '  $ nameforma watch abc123def456',
        ].join('\n'),
      )
      .action((id: string | undefined, options: any, cmd: any) => {
        if (!nfProgram.world) throw new Error('World not initialized');
        let world = nfProgram.world;
        let verbosity = nfProgram.verbosity;
        let task = TaskCommand.resolveTask(world, id);
        const worldPath =
          (world as any).worldPath ||
          path.join(process.cwd(), '.nameforma');
        const worldFilePath = path.join(worldPath, 'world.json');
        let taskFilePath = path.join(
          worldPath,
          'task',
          `${task.id.base64}.json`,
        );

        if (!fs.existsSync(taskFilePath)) {
          throw new Error(`Task file not found: ${taskFilePath}`);
        }

        nfTui.log(`🔍 Watching task: ${world.namespace.fuzzyIdOf(task)}`);
        nfTui.log(`Press h for help\n`);

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
                world = FileRepository.worldFromPath(worldPath);
                const newTask = world.focusedForma('task') as Task | null;

                // Check if focused task changed
                if (
                  newTask &&
                  newTask.id.base64 !== task.id.base64
                ) {
                  const oldTaskId = world.namespace.fuzzyIdOf(task);
                  task = newTask;
                  taskFilePath = path.join(
                    worldPath,
                    'task',
                    `${task.id.base64}.json`,
                  );

                  nfTui.log(
                    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
                  );
                  nfTui.log(
                    `📌 Focus changed from ${oldTaskId} to ${world.namespace.fuzzyIdOf(task)}`,
                  );

                  // Reset task file mtime for the new task
                  if (fs.existsSync(taskFilePath)) {
                    mtimes.task = fs
                      .statSync(taskFilePath)
                      .mtime.getTime();
                  }

                  TaskCommand.displayTask(world, task, verbosity);
                  WatchCommand.displayStatusLine(verbosity);
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
                const reloadedTask = world.loadEntity(
                  Task,
                  task.id.base64,
                );
                if (reloadedTask) {
                  task = reloadedTask;
                  nfTui.log('\n━'.repeat(74) + '\n');
                  TaskCommand.displayTask(world, task, verbosity);
                  WatchCommand.displayStatusLine(verbosity);
                }
              }
            }
          } catch (error) {
            nfTui.error(`Error watching file: ${error}`);
          }
        }, 500);

        const cleanup = () => {
          clearInterval(watchInterval);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
            process.stdin.removeAllListeners('data');
          }
          nfTui.log('\n👋 Watch stopped');
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
            const isRightArrow =
              key.length === 3 &&
              key[0] === 27 &&
              key[1] === 91 &&
              key[2] === 67;
            const isLeftArrow =
              key.length === 3 &&
              key[0] === 27 &&
              key[1] === 91 &&
              key[2] === 68;

            if (
              char === 'q' ||
              char === 'Q' ||
              (key[0] === 27 && !isRightArrow && !isLeftArrow)
            ) {
              // 27 is ESC (but not arrow)
              cleanup();
            } else if (char === 'h' || char === 'H') {
              WatchCommand.displayHelp();
              WatchCommand.displayStatusLine(verbosity);
            } else if (char === ' ') {
              nfTui.log('\n━'.repeat(74) + '\n');
              TaskCommand.displayTask(world, task, verbosity);
              WatchCommand.displayStatusLine(verbosity);
            } else if (char === '+' || char === '=' || isRightArrow) {
              verbosity++;
              nfTui.log('\n━'.repeat(74) + '\n');
              TaskCommand.displayTask(world, task, verbosity);
              WatchCommand.displayStatusLine(verbosity);
            } else if (char === '-' || char === '_' || isLeftArrow) {
              verbosity--;
              nfTui.log('\n━'.repeat(74) + '\n');
              TaskCommand.displayTask(world, task, verbosity);
              WatchCommand.displayStatusLine(verbosity);
            }
          });
        }
      });
  }
}
