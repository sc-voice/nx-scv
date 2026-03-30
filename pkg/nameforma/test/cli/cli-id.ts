import { describe, it, expect, beforeEach, afterEach } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { validate as validateUUID } from 'uuid';
import UUID64 from '../../src/uuid64.js';
import IdCommand from '../../src/cli/cli-id.js';
import { World } from '../../src/world.js';

describe('CLI: id command', () => {
  let program: Command;
  let idCmd: Command;
  let output: string[];
  let errors: string[];
  let originalLog: any;
  let originalError: any;

  beforeEach(() => {
    // Capture console output
    output = [];
    errors = [];

    originalLog = console.log;
    originalError = console.error;

    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    console.error = (...args: any[]) => {
      errors.push(args.join(' '));
    };

    // Setup commander program
    program = new Command();
    idCmd = program.command('id');
    IdCommand.register(idCmd);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  describe('numeronym conversion', () => {
    it('converts single word to numeronym', async () => {
      await program.parseAsync(['node', 'test', 'id', 'FormaCollection']);
      expect(output).toEqual(['F13n']);
    });

    it('converts with -n flag for multiple words', async () => {
      await program.parseAsync([
        'node',
        'test',
        'id',
        '-n',
        'Python',
        'Go',
        'Rust',
      ]);
      expect(output).toEqual(['P4n G0o R2t']);
    });

    it('converts with --numeronym flag for multiple words', async () => {
      await program.parseAsync([
        'node',
        'test',
        'id',
        '--numeronym',
        'FormaCollection',
        'Internationalization',
      ]);
      expect(output).toEqual(['F13n I18n']);
    });

    it('errors with multiple words without flag', async () => {
      try {
        await program.parseAsync(['node', 'test', 'id', 'Python', 'Go']);
      } catch (err: any) {
        // Commander throws on exit(1)
      }
      expect(errors.some(e => e.includes('Single word expected')))
        .toBe(true);
    });

    it('generates UUID64 when no words provided', async () => {
      await program.parseAsync(['node', 'test', 'id']);
      expect(output.length).toBe(1);
      expect(UUID64.validate(output[0])).toBe(true);
    });
  });

  describe('UUID64 generation and validation', () => {
    it('generates UUID64 with -u flag', async () => {
      await program.parseAsync(['node', 'test', 'id', '-u']);
      expect(output.length).toBe(1);
      expect(UUID64.validate(output[0])).toBe(true);
    });

    it('generates UUID64 with --uuid64 flag', async () => {
      await program.parseAsync(['node', 'test', 'id', '--uuid64']);
      expect(output.length).toBe(1);
      expect(UUID64.validate(output[0])).toBe(true);
    });

    it('generates different UUIDs on each call', async () => {
      await program.parseAsync(['node', 'test', 'id', '-u']);
      const uuid1 = output[0];
      output = [];

      await program.parseAsync(['node', 'test', 'id', '-u']);
      const uuid2 = output[0];

      expect(uuid1).not.toBe(uuid2);
    });

    it('validates UUID64 base64 with -u <uuid64>', async () => {
      const testUuid = '0Pqw5C1h00cxobnpVR4j7W';
      await program.parseAsync(['node', 'test', 'id', '-u', testUuid]);
      expect(output.length).toBe(5); // Format, Base64, UUID, Timestamp, Sequence
      expect(output[0]).toMatch(/^Format:/);
      expect(output[1]).toMatch(/^Base64:/);
      expect(output[2]).toMatch(/^UUID:/);
      expect(output[3]).toMatch(/^Timestamp:/);
      expect(output[4]).toMatch(/^Sequence:/);
    });

    it('validates UUIDv7 with -u <uuidv7>', async () => {
      const testUuid = '019d3a14-c06b-7000-a6ef-2971cdf6c4b4';
      await program.parseAsync(['node', 'test', 'id', '-u', testUuid]);
      expect(output.length).toBe(5);
      expect(output[0]).toContain('UUIDv7');
      expect(output[1]).toContain('Base64:');
      expect(output[2]).toContain('UUID:');
    });

    it('errors with multiple UUIDs', async () => {
      try {
        await program.parseAsync([
          'node',
          'test',
          'id',
          '-u',
          '0Pqw5C1h00cxobnpVR4j7W',
          '0Pqw5C1h00cxobnpVR4j7W',
        ]);
      } catch (err: any) {
        // Commander throws on exit(1)
      }
      expect(errors.some(e => e.includes('Single UUID64'))).toBe(true);
    });
  });

  describe('UUID64 generation with count', () => {
    it('generates multiple UUIDs with -g <count>', async () => {
      await program.parseAsync(['node', 'test', 'id', '-g', '3']);
      expect(output.length).toBe(3);
      output.forEach(uuid => {
        expect(UUID64.validate(uuid)).toBe(true);
      });
    });

    it('generates multiple UUIDs with --generate <count>', async () => {
      await program.parseAsync(['node', 'test', 'id', '--generate', '5']);
      expect(output.length).toBe(5);
      output.forEach(uuid => {
        expect(UUID64.validate(uuid)).toBe(true);
      });
    });

    it('generates single UUID when count is 1', async () => {
      await program.parseAsync(['node', 'test', 'id', '-g', '1']);
      expect(output.length).toBe(1);
      expect(UUID64.validate(output[0])).toBe(true);
    });

    it('generates nothing when count is 0', async () => {
      await program.parseAsync(['node', 'test', 'id', '-g', '0']);
      expect(output.length).toBe(0);
    });

    it('generates all different UUIDs', async () => {
      await program.parseAsync(['node', 'test', 'id', '-g', '3']);
      expect(output.length).toBe(3);
      expect(new Set(output).size).toBe(3); // All unique
    });
  });

  describe('UUIDv7 generation', () => {
    it('generates UUIDv7 with -7 flag', async () => {
      await program.parseAsync(['node', 'test', 'id', '-7']);
      expect(output.length).toBe(1);
      expect(validateUUID(output[0])).toBe(true);
      expect(output[0]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('generates UUIDv7 with --uuidv7 flag', async () => {
      await program.parseAsync(['node', 'test', 'id', '--uuidv7']);
      expect(output.length).toBe(1);
      expect(validateUUID(output[0])).toBe(true);
      expect(output[0]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('generates different UUIDs on each call', async () => {
      await program.parseAsync(['node', 'test', 'id', '-7']);
      const uuid1 = output[0];
      output = [];

      await program.parseAsync(['node', 'test', 'id', '-7']);
      const uuid2 = output[0];

      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('ID validation', () => {
    it('validates numeronym', async () => {
      await program.parseAsync(['node', 'test', 'id', '-v', 'F13n']);
      expect(output).toEqual(['numeronym']);
    });

    it('validates UUID64 base64', async () => {
      await program.parseAsync(['node', 'test', 'id', '-v', '0Pqvz51J006XNHphPhfTNW']);
      expect(output).toEqual(['UUID64']);
    });

    it('validates UUIDv7', async () => {
      const uuidv7 = '019d39f6-80a4-7000-b9de-e4b8f180e193';
      await program.parseAsync(['node', 'test', 'id', '-v', uuidv7]);
      expect(output).toEqual(['UUIDv7']);
    });

    it('validates with --validate flag', async () => {
      await program.parseAsync(['node', 'test', 'id', '--validate', 'I18n']);
      expect(output).toEqual(['numeronym']);
    });

    it('errors with unknown ID', async () => {
      try {
        await program.parseAsync(['node', 'test', 'id', '-v', 'unknown']);
      } catch (err: any) {
        // Commander throws on exit(1)
      }
      expect(errors.some(e => e.includes('unknown id'))).toBe(true);
    });

    it('errors when no ID provided', async () => {
      try {
        await program.parseAsync(['node', 'test', 'id', '-v']);
      } catch (err: any) {
        // Commander throws on exit(1)
      }
      expect(errors.some(e => e.includes('ID required'))).toBe(true);
    });

    it('errors with multiple IDs', async () => {
      try {
        await program.parseAsync(['node', 'test', 'id', '-v', 'F13n', 'I18n']);
      } catch (err: any) {
        // Commander throws on exit(1)
      }
      expect(errors.some(e => e.includes('Single ID'))).toBe(true);
    });
  });

  describe('Default behavior (no options)', () => {
    it('converts word to numeronym', async () => {
      await program.parseAsync(['node', 'test', 'id', 'FormaCollection']);
      expect(output).toEqual(['F13n']);
    });

    it('returns numeronym as-is for numeronym input', async () => {
      await program.parseAsync(['node', 'test', 'id', 'F13n']);
      expect(output).toEqual(['F13n']);
    });

    it('generates UUID64 with no arguments', async () => {
      await program.parseAsync(['node', 'test', 'id']);
      expect(output.length).toBe(1);
      expect(UUID64.validate(output[0])).toBe(true);
    });
  });

  describe('Inspect option (-i, --inspect)', () => {
    it('inspects numeronym with -i', async () => {
      // Create temp world to avoid interference from project's .nameforma
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-id-test'));
      const worldPath = path.join(tempDir, '.nameforma');
      fs.mkdirSync(worldPath, { recursive: true });

      try {
        // Use a new program with -w option support
        const testProgram = new Command();
        testProgram.option('-w, --world <path>', 'Path to .nameforma directory');
        const testIdCmd = testProgram.command('id');
        IdCommand.register(testIdCmd);

        const testOutput: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => {
          testOutput.push(args.join(' '));
        };

        try {
          await testProgram.parseAsync(['node', 'test', '-w', tempDir, 'id', '-i', 'F13n']);
          expect(testOutput.length).toBe(2);
          expect(testOutput[0]).toContain('Type: numeronym');
          expect(testOutput[1]).toContain('Value: F13n');
        } finally {
          console.log = originalLog;
        }
      } finally {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });

    it('generates and inspects UUID64 with -i and no args', async () => {
      await program.parseAsync(['node', 'test', 'id', '-i']);
      expect(output.length).toBe(5); // Format, Base64, UUID, Timestamp, Sequence
      expect(output[0]).toContain('Format:');
      expect(output[1]).toContain('Base64:');
    });

    it('inspects UUID64 base64 with -i', async () => {
      const testUuid = '0PqwE5zR00IBJRhs3y4zNW';
      await program.parseAsync(['node', 'test', 'id', '-i', testUuid]);
      expect(output.length).toBe(5);
      expect(output[0]).toContain('Format:');
      expect(output[0]).toContain('UUID64 base64');
    });

    it('inspects UUIDv7 with -i', async () => {
      const testUuid = '019d3a38-61a8-7000-9df7-0978ac37cf9a';
      await program.parseAsync(['node', 'test', 'id', '-i', testUuid]);
      expect(output.length).toBe(5);
      expect(output[0]).toContain('UUIDv7');
    });
  });

  describe('Numeronym generation with save (-s -n)', () => {
    let tempDir: string;
    let worldPath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'id-test-'));
      worldPath = path.join(tempDir, '.nameforma');
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('generates and saves numeronym with -s -n', async () => {
      // Create new program for this test to isolate world directory
      const testProgram = new Command();
      testProgram.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');
      const testIdCmd = testProgram.command('id');
      IdCommand.register(testIdCmd);

      const testOutput: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        testOutput.push(args.join(' '));
      };

      try {
        // Test with -w before id subcommand
        await testProgram.parseAsync([
          'node',
          'test',
          '-w',
          worldPath,
          'id',
          '-s',
          '-n',
          'FormaCollection',
        ]);

        // Check output
        expect(testOutput).toEqual(['F13n']);

        // Check world.json
        const worldFile = path.join(worldPath, 'world.json');
        expect(fs.existsSync(worldFile)).toBe(true);

        const data = fs.readFileSync(worldFile, 'utf8');
        const json = JSON.parse(data);
        expect(json.numeronym).toBeDefined();
        expect(json.numeronym['F13n']).toBe('FormaCollection');
      } finally {
        console.log = originalLog;
      }
    });

    it('uses -w option before command to specify world directory', async () => {
      const testProgram = new Command();
      testProgram.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');
      const testIdCmd = testProgram.command('id');
      IdCommand.register(testIdCmd);

      const testOutput: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        testOutput.push(args.join(' '));
      };

      try {
        // Global option -w must come BEFORE the command
        await testProgram.parseAsync([
          'node',
          'test',
          '-w',
          worldPath,
          'id',
          '-s',
          '-n',
          'Internationalization',
        ]);

        const worldFile = path.join(worldPath, 'world.json');
        expect(fs.existsSync(worldFile)).toBe(true);

        const data = fs.readFileSync(worldFile, 'utf8');
        const json = JSON.parse(data);
        expect(json.numeronym['I18n']).toBe('Internationalization');
      } finally {
        console.log = originalLog;
      }
    });

    it('generates and saves numeronym with --save --numeronym', async () => {
      const testProgram = new Command();
      testProgram.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');
      const testIdCmd = testProgram.command('id');
      IdCommand.register(testIdCmd);

      const testOutput: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        testOutput.push(args.join(' '));
      };

      try {
        // Test with long form options
        await testProgram.parseAsync([
          'node',
          'test',
          '-w',
          worldPath,
          'id',
          '--save',
          '--numeronym',
          'JavaScript',
        ]);

        // Check output
        expect(testOutput).toEqual(['J8t']);

        // Check world.json
        const worldFile = path.join(worldPath, 'world.json');
        expect(fs.existsSync(worldFile)).toBe(true);

        const data = fs.readFileSync(worldFile, 'utf8');
        const json = JSON.parse(data);
        expect(json.numeronym['J8t']).toBe('JavaScript');
      } finally {
        console.log = originalLog;
      }
    });
  });
});
