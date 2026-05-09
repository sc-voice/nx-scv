import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from '@mariozechner/pi-coding-agent';
import { EventEmitter } from 'events';
import { NfOverlay } from './nf-overlay.js';
import { NfWidget } from './nf-widget.js';
import { World } from '../../world.js';

const extensionEvents = new EventEmitter();

// The single heartbeat for the entire extension
setInterval(() => {
  extensionEvents.emit('tick');
}, 1000);

let activeWidget: NfWidget | null = null;
let world: World | null = null;

function initializeWorld(): void {
  if (world) return;
  try {
    const worldPath = World.findWorld();
    if (worldPath) {
      world = World.fromPath(worldPath);
    }
  } catch (error) {
    // World not found, widget will work without anchor
  }
}

export default function (pi: ExtensionAPI) {
  initializeWorld();

  pi.registerCommand('nf-overlay', {
    description: 'Display nf-overlay with focused task',
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
          new NfOverlay(
            tui,
            theme,
            done,
            extensionEvents,
            world ?? undefined,
          ),
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

      activeWidget = new NfWidget(
        ctx.ui.theme,
        'nf-widget',
        () => {
          if (activeWidget) {
            ctx.ui.setWidget('nf-widget', activeWidget.getContent());
          }
        },
        extensionEvents,
        world ?? undefined,
      );

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
}
