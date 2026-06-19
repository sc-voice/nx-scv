/**
 * SET command handler for nameforma CLI
 * Sets forma fields by dotref (e.g., FORMA_ID.FIELD_NAME)
 */

import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import { NfProgram } from '../nf-program.js';
import { NameFormaTheme } from '../nameforma-theme.js';
import type { GlobalOpts } from './nf-cli.js';
const theme = NameFormaTheme.shared;

export default class SetCommand {
  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    cmd
      .argument('<dotref>', 'Dotref to set (e.g., FORMA_ID.field)')
      .argument('<value...>', 'Value(s) to set')
      .option('-j, --json', 'Output result as JSON')
      .action(async (dotref: string, values: string[], options: any) => {
        const world = getGlobalOpts().world;
        const program = new NfProgram(world);
        const value = values.join(' ').trim();

        try {
          // Parse dotref: FORMA_ID.FIELD_NAME
          const dotIdx = dotref.indexOf('.');
          if (dotIdx === -1) {
            throw new Error('Dotref must be FORMA_ID.FIELD_NAME');
          }

          const formaId = dotref.slice(0, dotIdx);
          const fieldPath = dotref.slice(dotIdx + 1);

          // Get current value for display
          const resolved = world.resolveFuzzyId(formaId);
          if (!resolved) {
            throw new Error(`Not found: ${formaId}`);
          }
          const oldValue = (resolved.forma as any)[fieldPath];

          // Update and persist
          const updated = program.setFieldValue(formaId, fieldPath, value);

          // Output result
          if (options.json) {
            nfTui.log(JSON.stringify(updated, null, 2));
          } else {
            let id = updated.id.base64.replace(formaId, theme.nfLink(formaId));
            nfTui.log(`✓ ${theme.nfBoundary("Updated:")} ${id}.${fieldPath}`);
            nfTui.log(`  ${theme.nfAttend(oldValue)}`);
            nfTui.log(`→ ${theme.nfNominal(value)}`);
          }
        } catch (err: any) {
          nfTui.error(`✗ Error: ${err.message}`);
          throw err;
        }
      });
  }
}
