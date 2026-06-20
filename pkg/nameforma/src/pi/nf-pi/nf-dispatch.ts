import { Command } from 'commander';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import {
  NavigableView, ZenoCoord, zenoStep
} from '../../navigable-view.js';
import { NfSession } from './nf-session.js';
import { NfWatch } from './nf-watch.js';
import { NameFormaTheme } from '../../nameforma-theme.js';
import { NfProgram } from '../../nf-program.js';

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

    program
      .name('nf')
      .exitOverride()
      .description('NameForma pi commands')
      .configureOutput({
        writeOut: (str: string) => this.ctx.ui.notify(str.trim(), 'info'),
        writeErr: (str: string) => this.ctx.ui.notify(str.trim(), 'error'),
        outputError: (str: string, write: (s: string) => void) => {
          this.ctx.ui.notify(str.trim(), 'error');
        },
      });

    this.registerPiWatchCommand();
    this.registerPiSetCommand();
    this.registerPiTestCommand();
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

  private registerPiSetCommand(): void {
    const nfExt = this;
    const session = NfSession.shared;
    const { view } = session;

    this.cmdDelegate
      .command('set <key> <value>')
      .description('Set NameForma properties (detail for zooming[0..1])')
      .action(async (key: string, value: string) => {
        if (key === 'detail') {
          const MAX = ZenoCoord.MAX_ZENO_STEP;
          let newCoord: ZenoCoord;
          if (value.includes('/')) {
            const [a, p] = value.split('/').map(Number);
            if (!Number.isInteger(a) || !Number.isInteger(p) || a < 0 || a > MAX || p < 0 || p > MAX) {
              nfExt.cmdDelegate.error(`Invalid ZenoCoord: ${value} (must be a/b where 0 ≤ a,b ≤ ${MAX})`);
              return;
            }
            newCoord = new ZenoCoord(zenoStep(a), zenoStep(p));
          } else {
            const detail = parseFloat(value);
            if (isNaN(detail) || detail < 0 || detail > 1) {
              nfExt.cmdDelegate.error(`Invalid RenderDetail: ${value} (must be in [0..1])`);
              return;
            }
            newCoord = ZenoCoord.fromRenderDetail(detail);
          }
          session.view.zoomTo(newCoord);
          nfExt.ctx.ui.notify(`Zoom set to ${value}`, 'info');
        } else {
          nfExt.cmdDelegate.error(`Unknown property: ${key}`);
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

  async parse(args: string): Promise<void> {
    await this.cmdDelegate.parseAsync(
      ['node', 'nf', ...args.trim().split(/\s+/).filter(Boolean)],
    );
  }
}

export async function nfDispatch(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const cmd = new NfExtensionCommand(ctx);
  await cmd.parse(args);
}
