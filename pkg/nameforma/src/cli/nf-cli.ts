#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { nfTui, ReplRenderer } from './nf-tui.js';
import { USER } from './env.js';
import { settings } from './settings.js';
import { stdin as input, stdout as output } from 'process';
import { exec } from 'child_process';
import { promisify } from 'util';
import TaskCommand from './cli-task.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import IdCommand from './cli-id.js';
import ActionCommand from './cli-action.js';
import ReferenceCommand from './cli-reference.js';
import WatchCommand from './cli-watch.js';
import DocCommand from './cli-doc.js';
import CommitMsgCommand from './cli-commit-msg.js';
import { World } from '../world.js';
import { IS_CLAUDE } from './env.js';
import type { IReplRenderer } from './nf-tui.js';

const execAsync = promisify(exec);

export type GlobalOpts = { world: World; verbosity: number };

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
            const msg = String(err?.stderr || err?.message || err || 'Unknown error');
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
          await CLI.exec(args);
          this.world.sync();
          this.world.logCommand(trimmed, IS_CLAUDE ? 'agent' : 'human');
        } catch (execErr: any) {
          try {
            const msg = String(execErr?.message || execErr || 'Execution failed');
            nfTui.error('[repl11] error: '+msg);
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
  if (!worldPath) {
    worldPath = World.findWorld() || path.join(process.cwd(), '.nameforma');
  } else if (!worldPath.endsWith('.nameforma')) {
    worldPath = path.join(worldPath, '.nameforma');
  }
  return World.fromPath(worldPath);
}

export class CLI {
  private program: Command;

  constructor() {
    this.program = this.createProgram();
  }

  private createProgram(): Command {
    const program = new Command();

    const helpText = [
      'Examples:',
      '  $ nameforma --help',
      '  $ nameforma -h task',
      '  $ nameforma -h task add',
    ].join('\n');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    const version = pkgJson.version;

    let globalOpts: GlobalOpts = { world: resolveWorld(), verbosity: 0 };

    program
      .name('nameforma')
      .description(`NameForma/${USER} CLI - Manage tasks, formas, and schemas`)
      .version(version)
      .addHelpText('after', '\n' + helpText)
      .configureOutput({
        writeOut: (str) => nfTui.log(str.trim()),
        writeErr: (str) => nfTui.error(str.trim()),
        outputError: (str, write) => nfTui.error(str.trim()),
      })
      .option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)')
      .option('-d, --debug', 'Enable debug output')
      .option('-v, --verbose <level>', 'Verbosity level: -2 (omit refs), -1 (single-line refs), 0 (default)', '0')
      .option('--agent', 'Run as agent (requires consensus for done/manage transitions)')
      .hook('preAction', (thisCommand: any) => {
        const opts = thisCommand.optsWithGlobals();
        globalOpts = {
          world: resolveWorld(opts.world),
          verbosity: parseInt(opts.verbose || '0', 10),
        };
        if (opts.debug) process.env.DEBUG = '1';
        if (opts.agent) settings.isAgent = true;
      });

    const getGlobalOpts = () => globalOpts;

    TaskCommand.registerCommand(program.command('task').description('Manage tasks'), getGlobalOpts);
    IdCommand.registerCommand(program.command('id').description('Generate/validate numeronym, UUIDv7, UUID64'), getGlobalOpts);
    ActionCommand.registerCommand(program.command('action').description('List actions for the focused task'), getGlobalOpts);

    const refCmd = program.command('reference').alias('ref').description('List references for the focused task');
    ReferenceCommand.registerCommand(refCmd, getGlobalOpts);

    WatchCommand.registerCommand(program.command('watch').description('Watch focused task file and rerun task get when it changes'), getGlobalOpts);
    DocCommand.registerCommand(program.command('doc').description('Display TUI-formatted documentation'), getGlobalOpts);
    CommitMsgCommand.registerCommand(program.command('commit-msg').description('List done actions from focused tasks since last commit'), getGlobalOpts);

    return program;
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

  parseArgv(argv: string[]): Promise<Command> {
    const processed = this.preprocessArgv(argv);
    return this.program.parseAsync(processed);
  }

  static exec(args: string[]): Promise<Command> {
    const cli = new CLI();
    return cli.parseArgv(['node', 'nf', ...args]);
  }

  getProgram(): Command {
    return this.program;
  }
}

const isTestRunner = process.argv.some(arg => arg.includes('vitest') || arg.includes('jest'));

if (!isTestRunner) {
  const argsIdx = process.argv.indexOf('--args');
  if (argsIdx !== -1) {
    console.log(JSON.stringify(process.argv.slice(argsIdx + 1)));
    process.exit(0);
  }

  else if (process.argv.includes('--pi-tui-test')) {
    const { TUI, Text, ProcessTerminal } = await import('@mariozechner/pi-tui');
    const tui = new TUI(new ProcessTerminal());
    const scrollText = new Text();
    tui.addChild(scrollText);
    const footerText = new Text();
    tui.showOverlay(footerText, { anchor: 'bottom-left' });
    tui.start();
    const lines: string[] = [];
    const interval = setInterval(() => {
      const len = 3 + Math.floor(Math.random() * 18);
      const word = Array.from({ length: len }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26))
      ).join('');
      lines.push(word);
      if (lines.length > 75) lines.shift();
      scrollText.setText(lines.join('\n'));
      footerText.setText(new Date().toLocaleTimeString());
      tui.requestRender();
    }, 200);
    const stop = () => { clearInterval(interval); tui.stop(); process.exit(0); };
    setTimeout(stop, 30000);
    process.on('SIGINT', stop);
  }

  else if (process.argv.length <= 2) {
    const world = resolveWorld(process.env.WORLD);
    const repl = new REPL(world);
    repl.start().catch(err => {
      nfTui.error(err);
      process.exit(1);
    });
  } else {
    const cli = new CLI();
    cli.parseArgv(process.argv).catch(err => {
      nfTui.error(err);
      process.exit(1);
    });
  }
}
