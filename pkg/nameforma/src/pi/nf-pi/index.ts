import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from '@earendil-works/pi-coding-agent';
import { NfPrompt } from './nf-prompt.js';
import { NfWidget } from './nf-widget.js';
import { NfSession } from './nf-session.js';
import { nfTool } from './tools/nf-tool.js';
import { nfDispatch } from './nf-dispatch.js';

let activeWidget: NfWidget | null = null;

export default function (pi: ExtensionAPI) {
  NfSession.init();

  // The single heartbeat for the entire extension
  setInterval(() => {
    NfSession.shared.emit('tick');
  }, 1000);

  pi.registerCommand('nf', {
    description: 'NameForma command with subcommands (show, hide)',
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const widgetRef = { current: activeWidget };
      await nfDispatch(args, { ctx, widgetRef });
      activeWidget = widgetRef.current;
    },
  });

  pi.registerCommand('nf-prompt', {
    description: 'Display nf-prompt with focused task',
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      if (!ctx.hasUI) {
        ctx.ui.notify(
          'nameforma extension requires interactive mode',
          'error',
        );
        return;
      }

      await ctx.ui.custom(
        (tui: any, theme: any, _keybindings: any, done: any) =>
          new NfPrompt(tui, theme, done),
        {
          overlay: true,
          overlayOptions: {
            width: 80,
            anchor: 'top-right',
          },
        },
      );
    },
  });

  pi.registerCommand('nf-show', {
    description: 'Display nf-widget with focused task',
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      if (!ctx.hasUI) {
        ctx.ui.notify('nf-widget requires interactive mode', 'error');
        return;
      }

      // Dispose previous widget if any
      if (activeWidget) {
        activeWidget.dispose();
      }

      activeWidget = new NfWidget(ctx.ui.theme, 'nf-widget', () => {
        if (activeWidget) {
          ctx.ui.setWidget('nf-widget', activeWidget.getContent());
        }
      });

      ctx.ui.setWidget('nf-widget', activeWidget.getContent());
      ctx.ui.notify(
        'nf-widget displayed. Use /nf-hide to remove.',
        'info',
      );
    },
  });

  pi.registerCommand('nf-hide', {
    description: 'Hide nf-widget',
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      if (activeWidget) {
        activeWidget.dispose();
        activeWidget = null;
      }
      ctx.ui.setWidget('nf-widget', []);
      ctx.ui.notify('nf-widget hidden', 'info');
    },
  });

  pi.registerTool(nfTool);
}
