import { Command } from 'commander';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { ZenoCoord, zenoStep } from '../../navigable-view.js';
import { NfSession } from './nf-session.js';
import { NfWatch } from './nf-watch.js';
import { NameFormaTheme } from '../../nameforma-theme.js';

let nfWatchInstance: NfWatch | null = null;

export async function nfDispatch(
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const msg = "nfDispatch";
  const session = NfSession.shared;

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

  program
    .command('watch')
    .description('Watch .nameforma files and display status updates')
    .action(async () => {
      if (nfWatchInstance) {
        await nfWatchInstance.stop();
        nfWatchInstance = null;
        ctx.ui.notify('NameForma watch stopped', 'info');
      } else {
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

  try {
    program.parse(
      ['node', 'nf', ...args.trim().split(/\s+/).filter(Boolean)],
    );
  } catch(err) {
    // Commander emits error so we swallow redundant exception
  }
}
