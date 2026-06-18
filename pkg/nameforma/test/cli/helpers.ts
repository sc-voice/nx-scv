import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { World } from '@sc-voice/nameforma';
import type { GlobalOpts } from '@sc-voice/nameforma/internal';

/**
 * Create an isolated temporary directoryt
 * @param {string} prefix - Prefix for temp directory name (default: 'nf-test')
 */
export function createTempDir(prefix = 'nf-test') {
  const tempDir: string = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return { 
    tempDir,
    cleanup() {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }
}

/**
 * Create an isolated temporary world for testing
 * @param {string} prefix - Prefix for temp directory name (default: 'nf-test')
 * @returns {object} - { worldPath, cleanup() }
 */
export function createTempWorld(prefix = 'nf-test') {
  const { tempDir, cleanup } = createTempDir(prefix);
  const worldPath = path.join(tempDir, '.nameforma');
  fs.mkdirSync(worldPath, { recursive: true });

  // Force world creation in tests so world.json exists
  const world = World.create(worldPath);
  const msg = 'createTempWorld';
  const jsonPath = path.join(worldPath, "world.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`${msg} ${jsonPath}?`);
  }

  return { worldPath, tempDir, cleanup };
}

/**
 * Read a task JSON file directly from disk
 * @param {string} worldPath - Path to .nameforma directory
 * @param {string} id - Task ID
 * @returns {object|null} - Parsed task data or null if not found
 */
export function readTaskFile(worldPath, id) {
  const filePath = path.join(worldPath, 'task', `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

/**
 * List all task files in a world
 * @param {string} worldPath - Path to .nameforma directory
 * @returns {string[]} - Array of task IDs
 */
export function listTaskFiles(worldPath) {
  const taskDir = path.join(worldPath, 'task');
  if (!fs.existsSync(taskDir)) {
    return [];
  }
  return fs
    .readdirSync(taskDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5)); // remove .json
}

/**
 * Count tasks in a world
 * @param {string} worldPath - Path to .nameforma directory
 * @returns {number}
 */
export function countTasks(worldPath) {
  return listTaskFiles(worldPath).length;
}

/**
 * Create a test command runner that pre-fills world path
 * @param {Command} program - Commander program instance
 * @param {string} worldPath - Path to .nameforma directory
 * @returns {object} - { testCmd(...args), getGlobalOpts() }
 */
export function createTestCmd(program: Command, worldPath: string) {
  let globalOpts: GlobalOpts = {
    world: World.fromPath(worldPath),
    verbosity: 0,
    testRunner: true,
  };

  program
    .option(
      '-w, --world <path>',
      'Path to .nameforma directory (or auto-discover)',
    )
    .option('-v, --verbose <level>', 'Verbosity level', '0')
    .hook('preAction', (thisCommand: any) => {
      const opts = thisCommand.optsWithGlobals();
      let resolvedPath = opts.world || worldPath;
      if (!resolvedPath.endsWith('.nameforma')) {
        resolvedPath = path.join(resolvedPath, '.nameforma');
      }
      globalOpts = {
        world: World.fromPath(resolvedPath),
        verbosity: parseInt(opts.verbose || '0', 10),
        testRunner: true,
      };
    });

  const getGlobalOpts = () => globalOpts;

  return {
    testCmd: (...args: string[]) =>
      program.parseAsync(['node', 'test', '-w', worldPath, ...args]),
    getGlobalOpts,
  };
}

/**
 * Create a program with global options setup for testing
 * @param {string} worldPath - Path to .nameforma directory
 * @returns {object} - { program, getGlobalOpts }
 */
export function createTestProgram(worldPath: string) {
  const program = new Command();
  let globalOpts: GlobalOpts = {
    world: World.fromPath(worldPath),
    verbosity: 0,
    testRunner: true,
  };

  program
    .option(
      '-w, --world <path>',
      'Path to .nameforma directory (or auto-discover)',
    )
    .hook('preAction', (thisCommand: any) => {
      const opts = thisCommand.optsWithGlobals();
      let resolvedPath = opts.world || worldPath;
      if (!resolvedPath.endsWith('.nameforma')) {
        resolvedPath = path.join(resolvedPath, '.nameforma');
      }
      globalOpts = {
        world: World.fromPath(resolvedPath),
        verbosity: 0,
        testRunner: true,
      };
    });

  const getGlobalOpts = () => globalOpts;

  return { program, getGlobalOpts };
}
