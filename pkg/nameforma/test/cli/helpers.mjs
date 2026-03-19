import fs from 'fs';
import path from 'path';
import os from 'os';
import { World } from '../../src/world.ts';

/**
 * Create an isolated temporary world for testing
 * @param {string} prefix - Prefix for temp directory name (default: 'nameforma-test')
 * @returns {object} - { worldPath, cleanup() }
 */
export function createTempWorld(prefix = 'nameforma-test') {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const worldPath = path.join(tempDir, '.nameforma');
  fs.mkdirSync(worldPath, { recursive: true });

  return {
    worldPath,
    tempDir,
    cleanup() {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    },
  };
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
