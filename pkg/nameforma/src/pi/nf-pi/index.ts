import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from '@earendil-works/pi-coding-agent';
import type { TextContent } from '@earendil-works/pi-ai';
import { NfSession } from './nf-session.js';
import { nfTool } from './tools/nf-tool.js';
import { nfPiCli } from './nf-pi-cli.js';
import { NameFormaTheme } from '../../nameforma-theme.js';

const theme = NameFormaTheme.shared;

/** Mouse clicks are difficult to manage in pi-tui
 * onTerminalInput swallows SGR mouse events
 * intercepting OS stdin events is really hacky and fragile
 */
const MOUSE_CLICKS = false;
const mouse = { row: '', col: '' };

/** EXPERIMENTAL: Tracking mouse clicks does not work well */
function trackMouseClicks(pi: ExtensionAPI) {
  pi.on('session_start', (event, ctx) => {
    const msg = theme.nfAttend('session_start_mouse');
    const dbg = 0;
    dbg && console.log(msg);

    // enable mouse click tracking
    process.stdout.write('\x1b[?1000h\x1b[?1006h');

    ctx.ui.onTerminalInput((data: string) => {
      //
      const sgrMatch = data.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);

      if (sgrMatch) {
        const [_, button, col, row, action] = sgrMatch;
        if (action === 'M') {
          // Button down
          mouse.row = row;
          mouse.col = col;
        } else if (action === 'm') {
          // Button up
          if (row === mouse.row && col === mouse.col) {
            dbg && console.log(msg, 'click', { button, col, row });
          } else {
            dbg &&
              console.log(msg, 'drag', {
                button,
                from: `${mouse.col}/${mouse.row}`,
                to: `${mouse.col}/${mouse.row}`,
              });
          }
        }
        //return { consume: true }; // swallow click
      }
      return undefined; // pass-through
    }); // onTerminalInput

    pi.registerMessageRenderer('text', (message, options, theme) => {
      const mc: any = message.content;
      let lines: string[] = [];

      if (typeof mc === 'string') {
        lines = mc.split('\n');
      } else if (mc?.text) {
        lines = mc.text.split('\n');
      }
      console.log(msg, `lines: ${lines.length}`);
      return undefined; // pass-through
    });
  });
} // trackMouseClicks

export default async function (pi: ExtensionAPI) {
  await NfSession.init();

  // The single heartbeat for the entire extension
  setInterval(() => {
    NfSession.shared.emit('tick');
  }, 1000);

  //trackMouseClicks(pi);

  // NameForma CLI within Pi coding agent
  pi.registerCommand('nf', {
    description: 'NameForma CLI for Pi: /nf help',
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      await nfPiCli(args, ctx);
    },
  });

  pi.registerTool(nfTool);
}
