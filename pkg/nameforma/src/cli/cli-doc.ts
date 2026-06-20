import { readFileSync } from 'fs';
import { nfTui } from './nf-tui.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { TuiList } from './tui-list.js';
import { Unicode } from '@sc-voice/tools/text';
import { NfProgram } from '../nf-program.js';
import type { ICommand } from '../nf-program.js';

export default class DocCommand {
  static processText(content: string): string {
    const { BRIGHT_MAGENTA, BRIGHT_BLUE, NO_COLOR } = Unicode.LINUX_COLOR;
    const { RIGHT_ARROW } = Unicode;

    let result = content;

    // Convert LaTeX/HTML entities to UTF-8
    result = result.replace(/\$\\rightarrow\$/g, RIGHT_ARROW);
    result = result.replace(/&amp;/g, '&');
    result = result.replace(/&lt;/g, '<');
    result = result.replace(/&gt;/g, '>');
    result = result.replace(/&quot;/g, '"');
    result = result.replace(/&apos;/g, "'");

    // Convert **bold text** to bright magenta (including across newlines)
    result = result.replace(
      /\*\*(.+?)\*\*/gs,
      `${BRIGHT_MAGENTA}$1${NO_COLOR}`,
    );

    // Convert all headings to bright blue
    result = result.replace(
      /^(\s*#+ .+)$/gm,
      `${BRIGHT_BLUE}$1${NO_COLOR}`,
    );

    return result;
  }

  static registerCommand(cmd: ICommand, nfProgram: NfProgram) {
    cmd
      .argument('[doc]', 'Doc name (default: nf-ref)', 'nf-ref')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          '  nf doc nf-ref # overview',
          '  nf doc nf-url # nf URI schema',
          '  nf doc uuid64 # base64 time-based uri',
        ].join('\n'),
      )
      .action((doc: string) => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const docPath = path.join(
          __dirname,
          '../../dist/doc/nf',
          `${doc}.md`,
        );
        try {
          const content = readFileSync(docPath, 'utf8');
          const processed = DocCommand.processText(content);
          const lines = processed.split('\n');

          for (let i = 0; i < lines.length; i++) {
            nfTui.log(lines[i]);
          }

          //DocCommand.render(content);
        } catch (err: any) {
          throw new Error(`Doc not found: ${docPath}`);
        }
      });
  }
}
