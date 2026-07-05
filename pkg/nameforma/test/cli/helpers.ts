import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { FileRepository, World, NfProgram } from '@sc-voice/nameforma';
import type { GlobalOpts } from '@sc-voice/nameforma/unstable';

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
    },
  };
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
  const world = FileRepository.create(worldPath);
  const msg = 'createTempWorld';
  const jsonPath = path.join(worldPath, 'world.json');
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
  const nfProgram = new NfProgram(program as any);
  const world = FileRepository.worldFromPath(worldPath);
  nfProgram.initialize(world, { verbosity: 0, testRunner: true });

  program.option(
    '-w, --world <path>',
    'Path to .nameforma directory (or auto-discover)',
  );

  program.hook('preAction', () => {
    // Reload world from disk to pick up any persisted focus state
    const reloadedWorld = FileRepository.worldFromPath(worldPath);
    nfProgram.initialize(reloadedWorld, {
      verbosity: 0,
      testRunner: true,
    });
  });

  const getGlobalOpts = () => ({
    world: nfProgram.world!,
    verbosity: nfProgram.verbosity,
    testRunner: nfProgram.testRunner,
  });

  return {
    testCmd: (...args: string[]) =>
      program.parseAsync(['node', 'test', '-w', worldPath, ...args]),
    getGlobalOpts,
    nfProgram,
  };
}

/**
 * Create a program with global options setup for testing
 * @param {string} worldPath - Path to .nameforma directory
 * @returns {object} - { program, getGlobalOpts }
 */
export function createTestProgram(worldPath: string) {
  const program = new Command();
  const nfProgram = new NfProgram(program as any);
  const world = FileRepository.worldFromPath(worldPath);
  nfProgram.initialize(world, { verbosity: 0, testRunner: true });

  program.option(
    '-w, --world <path>',
    'Path to .nameforma directory (or auto-discover)',
  );

  program.hook('preAction', () => {
    // Reload world from disk to pick up any persisted focus state
    const reloadedWorld = FileRepository.worldFromPath(worldPath);
    nfProgram.initialize(reloadedWorld, {
      verbosity: 0,
      testRunner: true,
    });
  });

  const getGlobalOpts = () => ({
    world: nfProgram.world!,
    verbosity: nfProgram.verbosity,
    testRunner: nfProgram.testRunner,
  });

  return { program, getGlobalOpts, nfProgram };
}
