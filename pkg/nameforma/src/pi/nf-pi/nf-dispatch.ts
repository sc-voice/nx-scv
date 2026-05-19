import { Command } from 'commander';
import type { ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { NfWidget } from './nf-widget.js';

interface PiContext {
  ctx: ExtensionCommandContext;
  widgetRef: { current: NfWidget | null };
}

export async function nfDispatch(
  args: string,
  piContext: PiContext,
): Promise<void> {
  const msg = "nfDispatch";
  const { ctx, widgetRef } = piContext;

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
    .command('show')
    .description('Display nf-widget with focused task')
    .action(async () => {
      console.log(msg, "show start");
      if (widgetRef.current) {
        widgetRef.current.dispose();
      }

      widgetRef.current = new NfWidget(
        ctx.ui.theme,
        'nf-widget',
        () => {
          if (widgetRef.current) {
            ctx.ui.setWidget('nf-widget', widgetRef.current.getContent());
          }
        },
      );

      ctx.ui.setWidget('nf-widget', widgetRef.current.getContent());
      ctx.ui.notify(
        'nf-widget displayed. Use /nf hide to remove.',
        'info',
      );
      console.log(msg, "show end");
    });

  program
    .command('hide')
    .description('Hide nf-widget')
    .action(async () => {
      if (widgetRef.current) {
        widgetRef.current.dispose();
        widgetRef.current = null;
      }
      ctx.ui.setWidget('nf-widget', []);
      ctx.ui.notify('nf-widget hidden', 'info');
    });

  try {
    program.parse(
      ['node', 'nf', ...args.trim().split(/\s+/).filter(Boolean)],
    );
  } catch(err) {
    // Commander emits error so we swallow redundant exception
  }
}
