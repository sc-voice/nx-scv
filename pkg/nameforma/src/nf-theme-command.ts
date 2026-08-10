import { logger } from './file-repository.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { MonoTable } from './mono-table.js';
import type { NfProgram, ICommand } from './nf-program.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';

const Hjson = HJSON_CJS as any;

/**
 * NfThemeCommand - documents NameFormaTheme
 */
export class NfThemeCommand {
  nfProgram: NfProgram;

  constructor(nfProgram: NfProgram) {
    this.nfProgram = nfProgram;
  }

  async action(options: any) {
    const ctx = 'NfThemeCommand.action';
    const { nfProgram } = this;
    let lines: string[] = [];
    try {
      const theme = NameFormaTheme.shared;
      const doc = theme.documentation();
      const { columnSeparator } = theme;
      if (options.tui) {
        const mt = new MonoTable(doc);
        lines.push(mt.format({ columnSeparator }));
      } else {
        lines.push(JSON.stringify(doc, null, 2));
      }
      nfProgram.writeOut(lines.join('\n'));
    } catch (err: any) {
      logger.error({ ctx, err });
      nfProgram.writeErr(`✗ ${ctx} Error: ${err.message}`);
      throw err;
    }
  }

  register(rootCmd: ICommand): ICommand {
    const { nfProgram } = this;
    const subCmd = rootCmd.command('theme');
    subCmd
      .description('Describe NameFormaTheme palette')
      .addHelpText(
        'after',
        `
Examples:
  nf theme`,
      )
      .action(async (options: any, command: any) => {
        const opts = command.optsWithGlobals();
        return this.action(opts);
      });
    return subCmd;
  } // register
}
