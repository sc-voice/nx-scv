/**
 * Hash command handler for nameforma CLI
 * Prints the OPB64 encoding of the SHA-256 digest of a file
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { nfTui } from './nf-tui.js';
import { UUID64 } from '../uuid64.js';
import type { NfProgram, ICommand } from '../nf-program.js';

export default class HashCommand {
  /**
   * Compute the OPB64 encoding of the SHA-256 digest of a file.
   * The file is streamed, so large files are not read into memory.
   * @param filePath - Path to the file to hash
   * @returns 43-character order-preserving base64 string (no padding)
   * @throws Error if the file cannot be read
   */
  static async hashFile(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve());
    });
    return UUID64.toOrderPreservingBase64(hash.digest());
  }

  /**
   * Register hash command
   * @param cmd - Commander command object
   * @param nfProgram - Program instance (unused: hash needs no world)
   */
  static registerCommand(cmd: ICommand, nfProgram: NfProgram) {
    cmd
      .argument('<file>', 'File to hash')
      .action(async (file: string) => {
        try {
          nfTui.log(await HashCommand.hashFile(file));
        } catch (err) {
          nfTui.error(
            `✗ Error: ${err instanceof Error ? err.message : String(err)}`,
          );
          process.exitCode = 1;
        }
      });
  }
}
