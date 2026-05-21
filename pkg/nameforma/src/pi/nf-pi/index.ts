import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from '@earendil-works/pi-coding-agent';
import { NfSession } from './nf-session.js';
import { nfTool } from './tools/nf-tool.js';
import { nfDispatch } from './nf-dispatch.js';

export default function (pi: ExtensionAPI) {
  NfSession.init();

  // The single heartbeat for the entire extension
  setInterval(() => {
    NfSession.shared.emit('tick');
  }, 1000);

  // The nf CLI within Pi provides minimalist NameForma UX
  pi.registerCommand('nf', {
    description: 'NameForma command with subcommands (status, edit)',
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      await nfDispatch(args, ctx);
    },
  });

  pi.registerTool(nfTool);
}
