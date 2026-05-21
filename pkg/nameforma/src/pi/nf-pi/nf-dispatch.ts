import { Command } from 'commander';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { ZenoCoord } from '../../navigable-view.js';
import { NfStatus } from './nf-status.js';
import { NfEditor } from './nf-edit.js';
import { NfSession } from './nf-session.js';

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
    .command('status')
    .description('Toggle NameForma status visibility')
    .action(async () => {
      const s4s = session.getStatus();

      if (s4s) {
        session.setStatus(null);
        ctx.ui.setWidget(NfStatus.WIDGET_NAME, [], { placement: 'belowEditor' });
        ctx.ui.notify('NameForma status hidden', 'info');
      } else {
        const status = new NfStatus(
          ctx.ui.theme,
          () => {
            const s4s = session.getStatus();
            if (s4s) {
              ctx.ui.setWidget(NfStatus.WIDGET_NAME, s4s.getContent(), {
                placement: 'belowEditor',
              });
            }
          },
        );
        session.setStatus(status);

        ctx.ui.setWidget(NfStatus.WIDGET_NAME, status.getContent(), {
          placement: 'belowEditor',
        });

        ctx.ui.notify('NameForma status displayed', 'info');
      }
    });

  program
    .command('edit')
    .description('Open NameForma editor')
    .action(async () => {
      let editorHandle: any;
      await ctx.ui.custom(
        (tui, theme, _keybindings, done) =>
          new NfEditor(tui, theme, () => {
            if (editorHandle) {
              editorHandle.unfocus();
            }
            done(undefined);
          }),
        {
          overlay: true,
          overlayOptions: {
            width: '100%',
            anchor: 'top-left',
          },
          onHandle: (handle) => {
            editorHandle = handle;
            handle.focus();
          },
        },
      );
    });

  program
    .command('set <key> <value>')
    .description('Set NameForma properties (z for anchorStep)')
    .action(async (key: string, value: string) => {
      if (key === 'z') {
        const step = parseInt(value, 10);
        if (isNaN(step) || step < 0) {
          ctx.ui.notify(`Invalid anchorStep: ${value}`, 'error');
          return;
        }
        const newCoord = new ZenoCoord(step as any, 0 as any);
        session.view.zoomTo(newCoord);
        ctx.ui.notify(`Zoom set to ${step}`, 'info');
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
