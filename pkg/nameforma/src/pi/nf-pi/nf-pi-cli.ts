import { Command } from 'commander';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import {
  NavigableView, ZenoCoord, zenoStep
} from '../../navigable-view.js';
import { NfSession } from './nf-session.js';
import { NfWatch } from './nf-watch.js';
import { NameFormaTheme } from '../../nameforma-theme.js';
import { NfProgram, ICommand } from '../../nf-program.js';
import { DBG } from '../../defines.js';

const theme = NameFormaTheme.shared;

/** NfExtensionCommand: NameForma CLI for pi extension environment */
export class NfExtensionCommand extends NfProgram {
  constructor(private readonly ctx: ExtensionCommandContext) {
    super(new Command());
    this.createProgram();
  }

  private createProgram(): void {
    const program = this.cmdDelegate as any;

    if (!this.ctx.hasUI) {
      this.ctx.ui.notify('nameforma extension requires interactive mode', 'error');
      return;
    }
    const ctxui = this.ctx.ui;

    program
      .name('nf')
      .exitOverride((err:any) => this.exitCallback(err))
      .description('NameForma pi commands')
      .configureOutput({
        writeOut: (str: string) => ctxui.notify(str.trim(), 'info'),
        writeErr: (str: string) => ctxui.notify(str.trim(), 'error'),
        outputError: (str: string, write: (s: string) => void) => {
          ctxui.notify(str.trim(), 'error');
        },
      });

    this.registerPiWatchCommand();
    this.registerInitCommand();
    this.registerAddCommand();
    this.registerSetCommand();
    this.registerPiTestCommand();
  }

  private exitCallback(err:any) {
    const msg = 'nf-pi-cli.exitCallback';
    const nfp = this;
    if (err.exitCode !== 0) {
      this.writeErr(`${msg} Error: ${JSON.stringify(err)}`);
    } else {
      this.writeOut(`${msg} ${JSON.stringify(err)} n/a`);
      // Async callback from spawn events, not useful to throw.
    }
  }

  private registerPiWatchCommand(): void {
    const nfExt = this;
    const session = NfSession.shared;
    const { view } = session;

    this.cmdDelegate
      .command('watch')
      .option('-l, --lines <val>', '<MAX_LINES(7)>[@DETAIL]')
      .option('-q, --quit', 'Close NfWatch')
      .description('Watch .nameforma files and display status updates')
      .action(async (options: any) => {
        session.watchCount++;
        if (options.lines) {
          const [sLines, sDetail] = options.lines?.split('@');
          const lines = parseInt(sLines);
          const detail = (sDetail && parseFloat(sDetail)) ?? view.detail;
          if (Number.isNaN(lines) || lines <= 0) {
            nfExt.cmdDelegate.error(`--lines:${options.lines}?`);
            return;
          }
          view.setMaxLines(lines);
          if (sLines && (typeof detail === 'number')) {
            if (Number.isNaN(detail) || detail < 0 || 1 < detail) {
              nfExt.cmdDelegate.error(`line detail must be between 0 and 1: ${sDetail}?`);
              return;
            }
            view.setDetail(detail);
          }
          const zc = NavigableView.linesToZenoCoord(lines, detail);
          view.zoomTo(zc);

          nfExt.ctx.ui.notify(`detail: ${detail} ${session.view.detail}`, 'warning');
        } else {
          nfExt.ctx.ui.notify('options:' + JSON.stringify(options), 'warning');
        }

        if (session.watchInstance && options.quit) {
          await session.watchInstance.stop();
          session.watchInstance = null;
          nfExt.ctx.ui.notify('NameForma watch stopped', 'info');
        } else if (session.watchInstance == null) {
          session.watchInstance = new NfWatch(nfExt.ctx);
          await session.watchInstance.start();
          nfExt.ctx.ui.notify('NameForma watch started', 'info');
        }
      });
  }

  private registerPiTestCommand(): void {
    const nfExt = this;

    this.cmdDelegate
      .command('test <value>')
      .description('A self-diagnostic')
      .action(async (value?: string) => {
        const testValue = value ?? 'value?';
        const theme = NameFormaTheme.load();
        const msg = [
          theme.nfBoundary('TEST BEGIN'),
          new Date(),
          theme.nfText(JSON.stringify({ value: testValue }, null, 2)),
          new Date(),
        ];
        switch (testValue) {
          case 'more':
            msg.push('one');
            msg.push('two');
            msg.push('three');
            break;
          default:
            break;
        }
        msg.push(theme.nfBoundary('TEST END'));
        nfExt.ctx.ui.notify(msg.join('\n'));
      });
  }

  async parse(str: string): Promise<ICommand> {
    const msg = 'NfExtensionCommand.parse';
    const args = ['node', 'nf', ...str.trim().split(/\s+/).filter(Boolean)];
    return await this.parseAsync(args);
  }
} // NfExtensionCommand

/** NfExtensionCommand adapter */
export async function nfPiCli(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const msg = 'nfPiCli';
  const cmd = new NfExtensionCommand(ctx);
  const session = NfSession.shared;
  const dbg = DBG.NF_PROGRAM.NF_PI_CLI;
  const { watchCount:oldCount, world } = session;
  cmd.initialize(world, { isAgent: true });
  await cmd.parse(args);
  const { watchCount:newCount, watchInstance } = session;
  if (oldCount === newCount && watchInstance) { 
    // stop watching if we processed a different nf command

    dbg && world.log(msg, 'watchInstance.stop');
    await watchInstance.stop();
    session.watchInstance = null;
  }
}
