import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { TuiList } from './tui-list.js';

export default class DocCommand {
  static registerCommand(cmd: any) {
    cmd
      .argument('[doc]', 'Doc name (default: task-action)', 'task-action')
      .action((doc: string) => {
        try {
          const docPath = path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            `../../doc/${doc}.md`
          );
          const content = readFileSync(docPath, 'utf8');
          DocCommand.render(content);
        } catch (err: any) {
          throw new Error(`Doc not found: ${doc}`);
        }
      });
  }

  static render(content: string) {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockType = '';
    let inMarkdownTable = false;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockType = line.slice(3).trim();
          if (codeBlockType === 'mermaid') {
            console.log('\nState Transitions\n');
            console.log('State    Transition  Description');
            console.log('───────────────────────────────────────');
            const transitions = [
              ['req', 'spec', ''],
              ['req', 'done', 'Declined'],
              ['spec', 'work', ''],
              ['spec', 'test', ''],
              ['work', 'test', ''],
              ['test', 'work', 'Expected errors'],
              ['test', 'manage', 'Pass / Unexpected errors'],
              ['manage', 'req', ''],
              ['manage', 'done', 'Formal Consensus'],
              ['done', 'manage', 'Anomaly'],
            ];
            transitions.forEach(([state, trans, desc]) => {
              const padState = state.padEnd(8);
              const padTrans = trans.padEnd(11);
              console.log(`${padState} ${padTrans} ${desc}`);
            });
            console.log('');
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
              i++;
            }
            inCodeBlock = false;
            i++;
            continue;
          }
        } else if (codeBlockType === 'mermaid') {
          inCodeBlock = false;
          i++;
          continue;
        } else {
          inCodeBlock = false;
          console.log(line);
        }
      } else if (inCodeBlock) {
        console.log(line);
      } else if (line.startsWith('| ')) {
        if (!inMarkdownTable) {
          inMarkdownTable = true;
          console.log(line);
        } else {
          console.log(line);
        }
      } else if (line.trim() === '' && inMarkdownTable) {
        inMarkdownTable = false;
        console.log('');
      } else if (line.startsWith('# ')) {
        console.log('\n' + '='.repeat(40));
        console.log(line.slice(2).toUpperCase());
        console.log('='.repeat(40));
      } else if (line.startsWith('## ')) {
        console.log('\n' + '-'.repeat(40));
        console.log(line.slice(3));
        console.log('-'.repeat(40));
      } else if (line.startsWith('### ')) {
        console.log('\n' + line.slice(4));
      } else if (line.startsWith('- ')) {
        const bullet = line.slice(2);
        const wrapped = this.wrapLine(bullet, 78, 2);
        console.log('• ' + wrapped);
      } else if (line.trim() === '') {
        console.log('');
      } else {
        const wrapped = this.wrapLine(line, 80, 0);
        console.log(wrapped);
      }

      i++;
    }
  }

  static wrapLine(text: string, maxWidth: number, indent: number): string {
    const cleaned = text.replace(/\*\*/g, '');
    if (cleaned.length <= maxWidth) {
      return cleaned;
    }

    const words = cleaned.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = ' '.repeat(indent) + word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join('\n');
  }
}
