#!/usr/bin/env node

/**
 * NameForma shell CLI
 */

import { Command } from 'commander';
import path from 'path';
import { nfTui, ReplRenderer } from './nf-tui.js';
import { USER } from './env.js';
import { settings } from './settings.js';
import { stdin as input, stdout as output } from 'process';
import { exec } from 'child_process';
import { promisify } from 'util';
import TaskCommand from './cli-task.js';
import { readFileSync, realpathSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import IdCommand from './cli-id.js';
import GetCommand from './cli-get.js';
import ActionCommand from './cli-action.js';
import ReferenceCommand from './cli-reference.js';
import WatchCommand from './cli-watch.js';
import DocCommand from './cli-doc.js';
import InitCommand from './cli-init.js';
import { World } from '../world.js';
import { NfProgram } from '../nf-program.js';
import { IS_CLAUDE } from './env.js';
import type { IReplRenderer } from './nf-tui.js';

const execAsync = promisify(exec);

export type GlobalOpts = {
  world: World;
  verbosity: number;
  testRunner: boolean;
};

export class REPL {
  private world: World;
  private inREPL = false;
  private rendererOverride?: IReplRenderer;

  constructor(world: World, renderer?: IReplRenderer) {
    this.world = world;
    this.rendererOverride = renderer;
    this.setupProcessHandlers();
  }

  private setupProcessHandlers() {
    const originalExit = process.exit;
    (process.exit as any) = (code?: number) => {
      if (this.inREPL) {
        try {
          nfTui.error('[repl15] error code:' + code);
        } catch {}
        return;
      }
      originalExit.call(process, code);
    };

    process.on('uncaughtException', (err) => {
      if (this.inREPL) {
        try {
          nfTui.error('[repl25] error: ' + String(err));
        } catch {}
        return;
      }
      throw err;
    });

    process.on('unhandledRejection', (reason) => {
      if (this.inREPL) {
        try {
          nfTui.error('[repl35] error: ' + String(reason));
        } catch {}
        return;
      }
      throw reason;
    });
  }

  async start(): Promise<void> {
    const renderer = this.rendererOverride ?? new ReplRenderer();
    nfTui.setRenderer(renderer);
    renderer.start();

    this.inREPL = true;
    try {
      while (true) {
        let trimmed = '';
        try {
          trimmed = (await renderer.readLine()).trim();
        } catch (err) {
          try {
            nfTui.error('[repl64] error: ' + String(err));
          } catch {}
          continue;
        }

        renderer.clearErrors();

        if (trimmed === '') {
          continue;
        }

        if (trimmed === '/exit' || trimmed === '/quit') {
          break;
        }

        let stdout = '';
        try {
          ({ stdout } = await execAsync(`nf --args ${trimmed}`));
        } catch (err: any) {
          try {
            const msg = String(
              err?.stderr || err?.message || err || 'Unknown error',
            );
            nfTui.error(msg);
          } catch {
            // swallow error logging failures
          }
          continue;
        }

        let args: any[];
        try {
          args = JSON.parse(stdout);
        } catch (parseErr: any) {
          try {
            nfTui.error('[repl97] error: ' + String(parseErr));
          } catch {
            // swallow
          }
          continue;
        }

        try {
          await NfCLI.exec(args);
          this.world.sync();
        } catch (execErr: any) {
          try {
            const msg = String(
              execErr?.message || execErr || 'Execution failed',
            );
            nfTui.error('[repl11] error: ' + msg);
          } catch {
            // swallow
          }
        }
      }
    } catch (err) {
      try {
        nfTui.error('[repl119] error: ' + String(err));
      } catch {}
    } finally {
      this.inREPL = false;
      try {
        renderer.stop();
      } catch {}
      try {
        nfTui.log('\nGoodbye!');
      } catch {}
    }
  }
}

export function resolveWorld(worldPath?: string): World {
  return NfProgram.resolveWorld(worldPath);
}

/** NameForma command-line interface for managing tasks, formas, and schemas */
export class NfCLI extends NfProgram {
  /** Initialize NfCLI with commander program */
  constructor() {
    super(new Command());
    this.createProgram();
  }

  private createProgram(): void {
    const program = this.cmdDelegate;
    const helpText = [
      'Examples:',
      '  $ nameforma --help',
      '  $ nameforma -h task',
      '  $ nameforma -h task add',
    ].join('\n');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgJson = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf-8'),
    );
    const version = pkgJson.version;
    const nfCli = this;

    program
      .addHelpText('after', '\n' + helpText)
      .configureOutput({
        writeOut: (str) => nfTui.log(str.trim()),
        writeErr: (str) => nfTui.error(str.trim()),
        outputError: (str, write) => nfTui.error(str.trim()),
      })
      .option(
        '-w, --world <path>',
        'Path to .nameforma directory (or auto-discover)',
      )
      .option('-d, --debug', 'Enable debug output')
      .option(
        '-v, --verbose <level>',
        'Verbosity level: -2 (omit refs), -1 (single-line refs), 0 (default)',
        '0',
      )
      .option(
        '--agent',
        'Run as agent (requires consensus for done/manage transitions)',
      )
      .option(
        '--test-runner',
        'Run as test runner (for vitest/jest integration)',
      )
      .hook('preAction', (thisCommand: any) => {
        const opts = thisCommand.optsWithGlobals();
        const cmdName = thisCommand._name || thisCommand.name?.();
        const isInitCommand =
          cmdName === 'init' ||
          process.argv.includes('init');

        let world: World | undefined;
        if (!isInitCommand) {
          try {
            world = NfProgram.resolveWorld(opts.world);
          } catch (err) {
            nfTui.error(err instanceof Error ? err.message : String(err));
            process.exit(1);
          }
        }

        if (world) {
          nfCli.initialize(world, {
            verbosity: parseInt(opts.verbose || '0', 10),
            testRunner: opts.testRunner || false,
            debug: opts.debug || false,
            isAgent: opts.agent || false,
          });
        }
        if (opts.debug) process.env.DEBUG = '1';
        if (opts.agent) settings.isAgent = true;
      });

    InitCommand.registerCommand(
      program.command('init2').description('Initialize a new world'),
      this,
    );
    TaskCommand.registerCommand(
      program.command('task').description('Manage tasks'),
      this,
    );
    IdCommand.registerCommand(
      program
        .command('id')
        .description('Generate/validate numeronym, UUIDv7, UUID64'),
      this,
    );
    GetCommand.registerCommand(
      program
        .command('get')
        .description('Get a forma by fuzzy ID'),
      this,
    );
    ActionCommand.registerCommand(
      program
        .command('action')
        .description('List actions for the focused task'),
      this,
    );

    const refCmd = program
      .command('reference')
      .alias('ref')
      .description('List references for the focused task');
    ReferenceCommand.registerCommand(refCmd, this);

    WatchCommand.registerCommand(
      program
        .command('watch')
        .description(
          'Watch focused task file and rerun task get when it changes',
        ),
      this,
    );
    DocCommand.registerCommand(
      program
        .command('doc')
        .description('Display TUI-formatted documentation'),
      this,
    );

    // predefined commands
    this.registerInitCommand();
    this.registerSetCommand();
    program.configureOutput({
      writeOut: (str: string) => nfTui.log(str),
      writeErr: (str: string) => nfTui.error(str),
      //outputError: (str: string, write: (str: string) => void): void;
    })
  }

  private preprocessArgv(argv: string[]): string[] {
    const globalOptions = ['-w', '--world', '--debug', '-v', '--verbose'];
    const helpFlags = ['-h', '--help'];
    const globalArgs: string[] = [];
    const commandArgs: string[] = [];
    let helpFlag: string | null = null;
    let foundCommand = false;

    for (let i = 2; i < argv.length; i++) {
      const arg = argv[i];

      if (helpFlags.includes(arg)) {
        helpFlag = arg;
        continue;
      }

      if (globalOptions.includes(arg)) {
        globalArgs.push(arg);
        if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
          globalArgs.push(argv[++i]);
        }
        continue;
      }

      if (!foundCommand && !arg.startsWith('-')) {
        foundCommand = true;
      }

      commandArgs.push(arg);
    }

    const result = [...argv.slice(0, 2), ...globalArgs, ...commandArgs];
    return helpFlag ? [...result, helpFlag] : result;
  }

  /** Parse command-line arguments and execute matching command
   * @param argv Node process argv format (program, script, ...args)
   * @returns Promise resolving to commander Command
   * @example
   * const cli = new NfCLI();
   * await cli.parseArgv(['node', 'nf', 'task', 'list']);
   */
  parseArgv(argv: string[]): Promise<Command> {
    const processed = this.preprocessArgv(argv);
    return this.cmdDelegate.parseAsync(processed) as Promise<Command>;
  }

  /** Create new CLI instance and execute command with given arguments
   * @param args Command arguments (no program/script prefix)
   * @returns Promise resolving to commander Command
   * @example
   * await NfCLI.exec(['task', 'add', 'My Task']);
   */
  static exec(args: string[]): Promise<Command> {
    const cli = new NfCLI();
    return cli.parseArgv(['node', 'nf', ...args]);
  }

  /** Get underlying commander program instance for advanced usage
   * @returns Commander Command object
   * @example
   * const cli = new NfCLI();
   * const program = cli.getProgram();
   * console.log(program.version());
   */
  getProgram(): Command {
    return this.cmdDelegate as Command;
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const isTestRunner = process.argv.includes('--test-runner');

  if (!isTestRunner) {
    const argsIdx = process.argv.indexOf('--args');
    if (argsIdx !== -1) {
      console.log(JSON.stringify(process.argv.slice(argsIdx + 1)));
      process.exit(0);
    }

    if (process.argv.length <= 2) {
      const world = NfProgram.resolveWorld(process.env.WORLD);
      const repl = new REPL(world);
      repl.start().catch((err) => {
        nfTui.error(err);
        process.exit(1);
      });
    } else {
      const cli = new NfCLI();
      cli.parseArgv(process.argv).catch((err) => {
        nfTui.error(err);
        process.exit(1);
      });
    }
  }
}
