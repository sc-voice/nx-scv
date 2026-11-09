import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { NfProgram } from '../src/nf-program.js';
import { createTempDir } from './cli/helpers.js';

/** Run `nf markdown ARGS` and return what it wrote to stdout */
async function runMarkdown(...args: string[]): Promise<string> {
  const out: string[] = [];
  const program = new Command();
  program.configureOutput({ writeOut: (s: string) => out.push(s) });
  const nfp = new NfProgram(program as any);
  nfp.registerMarkdownCommand();
  await program.parseAsync(['node', 'nf', 'markdown', ...args]);
  return out.join('');
}

describe('nf markdown', () => {
  let tempDirObj: ReturnType<typeof createTempDir>;

  beforeEach(() => {
    tempDirObj = createTempDir('nf-markdown-test');
  });

  afterEach(() => {
    tempDirObj.cleanup();
  });

  it('markdownStem prefixes 6 zuid characters and collapses punctuation', () => {
    const nfp = new NfProgram(new Command() as any);
    const stem = nfp.markdownStem(
      '  IaPapo  Wakeword, Training! ',
      '0Q71Oh1234567890ABCDEF',
    );
    expect(stem).toBe('0Q71Oh_IaPapo_Wakeword_Training');
  });

  it('uses the sample title and default header values when no words are given', async () => {
    const md = await runMarkdown();
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/^type: "nameforma\.md"$/m);
    expect(md).toMatch(
      /^title: "[A-Za-z0-9]{6}_Sample_Markdown_Document"$/m,
    );
    expect(md).toMatch(/^status: "draft"$/m);
    expect(md).toMatch(/^tags: "\(none\)"$/m);
    expect(md).toMatch(/^description: "\(none\)"$/m);
    expect(md).toContain('# Sample Markdown Document\n');
    expect(md).toContain('## References\n\n(none)');
  });

  it('joins unquoted title words into the heading and applies overrides', async () => {
    const md = await runMarkdown(
      'IaPapo',
      'Wakeword',
      'Training',
      '--type',
      'Reference',
      '--status',
      'active',
    );
    expect(md).toContain('# IaPapo Wakeword Training\n');
    expect(md).toMatch(/^type: "Reference"$/m);
    expect(md).toMatch(/^status: "active"$/m);
    expect(md).toMatch(
      /^title: "[A-Za-z0-9]{6}_IaPapo_Wakeword_Training"$/m,
    );
  });

  it('--out writes <stem>.md into the directory with the same content as stdout', async () => {
    const dir = tempDirObj.tempDir;
    const out = await runMarkdown('IaPapo', 'Wakeword', '--out', dir);
    const written = out.trim();
    expect(path.dirname(written)).toBe(dir);
    expect(path.basename(written)).toMatch(
      /^[A-Za-z0-9]{6}_IaPapo_Wakeword\.md$/,
    );

    const content = fs.readFileSync(written, 'utf-8');
    const stdoutTitle = content.match(/^title: "(.+)"$/m)?.[1];
    expect(path.basename(written, '.md')).toBe(stdoutTitle);

    // A different title gives a different file name, so both files exist
    await runMarkdown('IaPapo', 'Training', '--out', dir);
    expect(fs.readdirSync(dir).length).toBe(2);
  });
});
