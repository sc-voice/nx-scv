import { Command } from 'commander';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { 
  NavigableView, ZenoCoord, zenoStep 
} from '../../navigable-view.js';
import { NfSession } from './nf-session.js';
import { NfWatch } from './nf-watch.js';
import { NameFormaTheme } from '../../nameforma-theme.js';

const DEFAULT_WATCH_LINES =  7;
const BASE_10 = 10;

let nfWatchInstance: NfWatch | null = null;

export async function nfDispatch(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const msg = "nfDispatch";
  const session = NfSession.shared;
  const { view } = session;
  const { notify } = ctx.ui;

  if (!ctx.hasUI) {
    ctx.ui.notify('nameforma extension requires interactive mode', 'error');
    return;
  }

  const program = new Command('nf')
    .exitOverride() // prevent process.exit()
    .description('NameForma pi commands')
    .configureOutput({
      writeOut: (str) => ctx.ui.notify(str.trim(), 'info'),
      writeErr: (str) => ctx.ui.notify(str.trim(), 'error'),
      outputError: (str) => ctx.ui.notify(str.trim(), 'error'),
    });

  program
    .command('watch')
    .option('-l, --lines <val>', '<MAX_LINES(7)>[@DETAIL]')
    .option('-q, --quit', 'Close NfWatch')
    .description('Watch .nameforma files and display status updates')
    .action(async (options:any) => {
      if (options.lines) {
        const [sLines, sDetail] = options.lines?.split('@');
        const lines = parseInt(sLines);
        const detail = (sDetail && parseFloat(sDetail)) ?? view.detail;
        if (Number.isNaN(lines) || lines <= 0) {
          throw new Error(`--lines:${options.lines}?`);
        }
        view.setMaxLines(lines);
        if (sLines && (typeof detail === 'number')) {
          if (Number.isNaN(detail) || detail < 0 || 1 < detail) {
            throw new Error(`line detail must be between 0 and 1: ${sDetail}?`);
          }
          view.setDetail(detail);
        }
        const zc = NavigableView.linesToZenoCoord(lines, detail);
        view.zoomTo(zc);
        
        notify(`detail: ${detail} ${session.view.detail}`, 'warning');
      } else {
        notify('options:'+JSON.stringify(options), 'warning');
      }

      if (nfWatchInstance && options.quit) {
        await nfWatchInstance.stop();
        nfWatchInstance = null;
        ctx.ui.notify('NameForma watch stopped', 'info');
      } else if (nfWatchInstance == null) {
        nfWatchInstance = new NfWatch(ctx);
        await nfWatchInstance.start();
        ctx.ui.notify('NameForma watch started', 'info');
      }
    });

  program
    .command('set <key> <value>')
    .description('Set NameForma properties (detail for zooming[0..1])')
    .action(async (key: string, value: string) => {
      if (key === 'detail') {
        const MAX = ZenoCoord.MAX_ZENO_STEP;
        let newCoord: ZenoCoord;
        if (value.includes('/')) {
          const [a, p] = value.split('/').map(Number);
          if (!Number.isInteger(a) || !Number.isInteger(p) || a < 0 || a > MAX || p < 0 || p > MAX) {
            ctx.ui.notify(`Invalid ZenoCoord: ${value} (must be a/b where 0 ≤ a,b ≤ ${MAX})`, 'error');
            return;
          }
          newCoord = new ZenoCoord(zenoStep(a), zenoStep(p));
        } else {
          const detail = parseFloat(value);
          if (isNaN(detail) || detail < 0 || detail > 1) {
            ctx.ui.notify(`Invalid RenderDetail: ${value} (must be in [0..1])`, 'error');
            return;
          }
          newCoord = ZenoCoord.fromRenderDetail(detail);
        }
        session.view.zoomTo(newCoord);
        ctx.ui.notify(`Zoom set to ${value}`, 'info');
      } else {
        ctx.ui.notify(`Unknown property: ${key}`, 'error');
      }
    });

  program
    .command('test <value>')
    .description('A self-diagnostic')
    .action(async(value:string = "value?") => {
      const { notify } = ctx.ui;
      const theme = NameFormaTheme.load();
      const msg = [
        theme.nfBoundary("TEST BEGIN"),
        new Date(),
        theme.nfText(JSON.stringify({value}, null, 2)),
        new Date(),
      ];
      switch (value) {
        case "more":
          msg.push("one");
          msg.push("two");
          msg.push("three");
          break;
        default:
          break;
      }
      msg.push(theme.nfBoundary("TEST END"));
      notify(msg.join("\n"));
    });

  try {
    program.parse(
      ['node', 'nf', ...args.trim().split(/\s+/).filter(Boolean)],
    );
  } catch(err) {
    // Commander emits error so we swallow redundant exception
  }
}
