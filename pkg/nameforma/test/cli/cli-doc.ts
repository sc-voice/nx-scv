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

  it('nf doc prints task-action.md by default', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    expect(text).toMatch(/TASKS AND ACTIONS/);
  });

  it('nf doc task-action prints same output explicitly', async () => {
    await program.parseAsync(['node', 'test', 'doc', 'task-action']);
    const text = output.join('\n');
    expect(text).toMatch(/TASKS AND ACTIONS/);
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

  it('nf doc contains States section with state definitions', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    expect(text).toMatch(/States/);
    expect(text).toMatch(/Req:\s+Enumerate requirements/);
    expect(text).toMatch(/Done:\s+Stable final state/);
  });

  it('nf doc strips bold markers from output', async () => {
    await program.parseAsync(['node', 'test', 'doc']);
    const text = output.join('\n');
    expect(text).not.toMatch(/\*\*/);
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
      expect(cleanLine.length).toBeLessThanOrEqual(100);
    });
  });
});
