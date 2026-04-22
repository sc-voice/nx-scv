import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import { Command } from 'commander';
import DocCommand from '../../src/cli/cli-doc.js';

describe('DocCommand', () => {
  let output: string[] = [];
  let originalLog: any;
  let program: Command;

  beforeEach(() => {
    output = [];
    originalLog = console.log;
    console.log = (...args: any[]) => output.push(args.join(' '));

    program = new Command();
    program.exitOverride();

    const docCmd = program.command('doc');
    DocCommand.registerCommand(docCmd);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('nf doc prints nf-task.md by default', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    expect(text).toMatch(/NAMEFORMA \(NF\) TASK & ACTION SYSTEM/);
  });

  it('nf doc nf-task prints same output explicitly', async () => {
    await program.parseAsync(['node', 'test', 'doc', 'nf-task']);
    const text = output.join('\n');
    expect(text).toMatch(/NAMEFORMA \(NF\) TASK & ACTION SYSTEM/);
  });

  it('nf doc contains State Diagram section with transition table', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    expect(text).toMatch(/State Diagram/);
    expect(text).toMatch(/req/);
    expect(text).toMatch(/spec/);
    expect(text).toMatch(/manage/);
    expect(text).toMatch(/Formal Consensus/);
  });

  it('nf doc contains State Definition section with state definitions', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    expect(text).toMatch(/State Definitions/);
    expect(text).toMatch(/\x1b\[95mReq\x1b\[39m:\s+Enumerate/);
    expect(text).toMatch(/\x1b\[95mDone\x1b\[39m:\s+The stable/);
  });

  it('nf doc converts bold markers to bright magenta ANSI codes', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    // Bold markers should be converted to bright magenta color codes, not present as **
    expect(text).not.toMatch(/\*\*/);
    expect(text).toMatch(/\x1b\[95m[\s\S]+?\x1b\[39m/); // bright magenta ... no_color
  });

  it('nf doc nonexistent throws error', async () => {
    try {
      await program.parseAsync(['node', 'test', 'doc', 'nonexistent']);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toMatch(/Doc not found/);
    }
  });

  it('output lines do not exceed 100 characters', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    output.forEach((line) => {
      // Allow for ANSI codes and markdown table content
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
//0PsmmIHG00auPU-q_AgmtW
      console.error("DEBUG", cleanLine.length, cleanLine);
      expect(cleanLine.length).toBeLessThanOrEqual(100);
    });
  });
});
