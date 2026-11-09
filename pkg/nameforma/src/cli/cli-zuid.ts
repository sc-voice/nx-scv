/**
 * ZUID command handler for nameforma CLI.
 * - `nf zuid` prints a new ZUID (22-character base-63 id) for the current time.
 * - `nf zuid --time PREFIX` prints the start time and resolution of the
 *   window covered by a ZUID text prefix.
 */

import { statSync } from 'fs';
import { basename } from 'path';
import { nfTui } from './nf-tui.js';
import { ZUID } from '../zuid.js';
import { OPB63_64 } from '../opb63_64.js';
import type { NfProgram, ICommand } from '../nf-program.js';

const NAME_LEAD = 'A'; // lead character that keeps the variant bits valid
const NAME_CHARS = 10; // name characters after the lead
const SIGNATURE_MASK = (1n << 62n) - 1n;

export default class ZuidCommand {
  /**
   * Signature derived from a file name: lead 'A', then the basename with
   * non-alphanumeric characters removed, clipped or '0'-padded to 10 characters.
   * @param filePath - Path whose basename is used
   * @returns 62-bit signature for ZUID.create()
   */
  static nameSignature(filePath: string): bigint {
    const name = basename(filePath)
      .replace(/[^0-9A-Za-z_]/g, '')
      .slice(0, NAME_CHARS)
      .padEnd(NAME_CHARS, '0');
    return OPB63_64.decode(NAME_LEAD + name) & SIGNATURE_MASK;
  }

  /**
   * Register zuid command. It needs no world, so it runs without one.
   * @param cmd - Commander command object
   * @param nfProgram - Program instance (unused: zuid needs no world)
   */
  static registerCommand(cmd: ICommand, nfProgram: NfProgram) {
    cmd
      .argument('[words...]', 'ZUID text prefix (with --time)')
      .option(
        '-t, --time',
        'Interpret PREFIX as a ZUID time prefix and print its start time and resolution',
      )
      .option(
        '--file-mod <path>',
        'Print the ZUID time block of the modification time of PATH (sequence 0)',
      )
      .action(
        (
          words: string[] = [],
          options: { time?: boolean; fileMod?: string },
        ) => {
        if (options.fileMod !== undefined) {
          try {
            // Sequence 0 makes the output a stable function of the file's mtime.
            const millis = Math.floor(statSync(options.fileMod).mtimeMs);
            const z = ZUID.create(
              millis,
              0,
              ZuidCommand.nameSignature(options.fileMod),
            );
            nfTui.log(z.timeId());
            nfTui.log(z.toString());
          } catch (err) {
            nfTui.error(
              `✗ Error: ${err instanceof Error ? err.message : String(err)}`,
            );
            process.exitCode = 1;
          }
          return;
        }
        if (!options.time) {
          if (words.length > 0) {
            nfTui.error('✗ Error: Prefix arguments require --time');
            process.exitCode = 1;
            return;
          }
          nfTui.log(ZUID.create().toString());
          return;
        }
        if (words.length !== 1) {
          nfTui.error('✗ Error: Single ZUID prefix expected');
          process.exitCode = 1;
          return;
        }
        try {
          // A full ZUID is accepted: keep only its 11-character time block.
          const { start, end } = ZUID.timeRangeOf(words[0].slice(0, 11));
          nfTui.log(new Date(start).toISOString());
          nfTui.log(`resolution: ${((end - start) / 1000).toFixed(3)}s`);
        } catch (err) {
          nfTui.error(
            `✗ Error: ${err instanceof Error ? err.message : String(err)}`,
          );
          process.exitCode = 1;
        }
      });
  }
}
