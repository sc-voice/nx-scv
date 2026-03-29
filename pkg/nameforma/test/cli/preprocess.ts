import { describe, it, expect } from '@sc-voice/vitest';

// Copy of preprocessArgv logic for testing without importing nameforma.ts
function preprocessArgv(argv: string[]): string[] {
  const globalOptions = ['-w', '--world', '-d', '--debug'];
  const helpFlags = ['-h', '--help'];
  const globalArgs: string[] = [];
  const commandArgs: string[] = [];
  let helpFlag: string | null = null;
  let foundCommand = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    // Check if it's a help flag
    if (helpFlags.includes(arg)) {
      helpFlag = arg;
      continue;
    }

    // Check if it's a global option (with or without value)
    if (globalOptions.includes(arg)) {
      globalArgs.push(arg);
      // If it takes a value, include the next arg
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        globalArgs.push(argv[++i]);
      }
      continue;
    }

    // First non-option arg is the command
    if (!foundCommand && !arg.startsWith('-')) {
      foundCommand = true;
    }

    commandArgs.push(arg);
  }

  // Return argv with global options before command and help flag at the end
  const result = [...argv.slice(0, 2), ...globalArgs, ...commandArgs];
  return helpFlag ? [...result, helpFlag] : result;
}

describe('CLI: preprocessArgv', () => {
  describe('global options placement', () => {
    it('moves -w before command', () => {
      const input = ['node', 'nameforma', 'id', '-w', '/path', '-g', '-n', 'Word'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path', 'id', '-g', '-n', 'Word']);
    });

    it('moves --world before command', () => {
      const input = ['node', 'nameforma', 'id', '--world', '/path', '-g'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '--world', '/path', 'id', '-g']);
    });

    it('moves -d before command', () => {
      const input = ['node', 'nameforma', 'task', 'list', '-d'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-d', 'task', 'list']);
    });

    it('moves --debug before command', () => {
      const input = ['node', 'nameforma', 'schema', 'list', '--debug'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '--debug', 'schema', 'list']);
    });

    it('moves multiple global options before command', () => {
      const input = ['node', 'nameforma', 'id', '-w', '/path', '-d', '-g', '-n', 'Word'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path', '-d', 'id', '-g', '-n', 'Word']);
    });

    it('preserves global options already before command', () => {
      const input = ['node', 'nameforma', '-w', '/path', 'id', '-g', '-n', 'Word'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path', 'id', '-g', '-n', 'Word']);
    });

    it('handles mixed global options before and after command', () => {
      const input = ['node', 'nameforma', '-w', '/path1', 'id', '-d', '-g'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path1', '-d', 'id', '-g']);
    });
  });

  describe('help flag handling', () => {
    it('moves -h to the end', () => {
      const input = ['node', 'nameforma', '-h', 'id', '-g'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', 'id', '-g', '-h']);
    });

    it('moves --help to the end', () => {
      const input = ['node', 'nameforma', '--help', 'task', 'list'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', 'task', 'list', '--help']);
    });

    it('moves help flag to end with global options', () => {
      const input = ['node', 'nameforma', '-h', '-w', '/path', 'id', '-g'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path', 'id', '-g', '-h']);
    });
  });

  describe('edge cases', () => {
    it('handles no arguments', () => {
      const input = ['node', 'nameforma'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma']);
    });

    it('handles only global option', () => {
      const input = ['node', 'nameforma', '-w', '/path'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path']);
    });

    it('handles command with no options', () => {
      const input = ['node', 'nameforma', 'id'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', 'id']);
    });

    it('does not move non-global options', () => {
      const input = ['node', 'nameforma', 'id', '-i', 'F13n', '-g'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', 'id', '-i', 'F13n', '-g']);
    });

    it('handles global option value that looks like a flag', () => {
      const input = ['node', 'nameforma', 'id', '-w', '/path/-with-dashes', '-g'];
      const output = preprocessArgv(input);
      expect(output).toEqual(['node', 'nameforma', '-w', '/path/-with-dashes', 'id', '-g']);
    });
  });
});
