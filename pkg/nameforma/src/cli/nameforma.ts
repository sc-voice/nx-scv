#!/usr/bin/env node

/**
 * NameForma CLI - Command-line interface for NameForma package
 *
 * Usage: nameforma [command] [options]
 *
 * Commands:
 *   task [subcommand]      Manage tasks
 *   forma [subcommand]     Manage formas
 *   schema [subcommand]    Manage schemas
 *   id [subcommand]        Convert to numeronym, generate/validate IDs
 *   focus <id>             Set focus on an entity by ID
 *
 * Examples:
 *   nameforma task add --title "My Task" --progress 0/1
 *   nameforma task list
 *   nameforma forma add --name "my-forma"
 *   nameforma schema list
 *   nameforma id FormaList
 *   nameforma id -g 5
 *   nameforma id -v F13n
 *   nameforma focus abc123def456
 */

import { Command } from 'commander';
import { NameForma } from '../index.js';
import { USER, IS_AGENT } from './env.js';
import TaskCommand from './cli-task.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import FormaCommand from './cli-forma.js';
import SchemaCommand from './cli-schema.js';
import IdCommand from './cli-id.js';
import FocusCommand from './cli-focus.js';
import ActionCommand from './cli-action.js';
import ReferenceCommand from './cli-reference.js';
import WatchCommand from './cli-watch.js';
import DocCommand from './cli-doc.js';

// Preprocess argv to move global options before command and help flags to the end
function preprocessArgv(argv: string[]): string[] {
  const globalOptions = ['-w', '--world', '--debug'];
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

const program = new Command();

const helpText = [
  'Examples:',
  '  $ nameforma --help',
  '  $ nameforma -h task',
  '  $ nameforma -h task add',
].join('\n');

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const version = pkgJson.version;

program
  .name('nameforma')
  .description(`NameForma/${USER} CLI - Manage tasks, formas, and schemas`)
  .version(version)
  .addHelpText('after', '\n' + helpText);

program
  .option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)')
  .option('-d, --debug', 'Enable debug output')
  .option('-v, --verbose <level>', 'Verbosity level: -2 (omit refs), -1 (single-line refs), 0 (default)', '0')
  .hook('preAction', (thisCommand: any) => {
    if (thisCommand.optsWithGlobals().debug) {
      process.env.DEBUG = '1';
    }
  });

// Task command
const taskCmd = program
  .command('task')
  .description('Manage tasks');

TaskCommand.registerCommand(taskCmd);

// Forma command
const formaCmd = program
  .command('forma')
  .description('Manage formas (named identifiable objects)');

FormaCommand.registerCommand(formaCmd);

// Schema command
const schemaCmd = program
  .command('schema')
  .description('Manage Avro schemas');

SchemaCommand.registerCommand(schemaCmd);

// ID command
const idCmd = program
  .command('id')
  .description('Generate/validate numeronym, UUIDv7, UUID64');

IdCommand.registerCommand(idCmd);

// Focus command
const focusCmd = program
  .command('focus')
  .description('Set focus on an entity by ID');

FocusCommand.registerCommand(focusCmd);

// Action command
const actionCmd = program
  .command('action')
  .description('List actions for the focused task');

ActionCommand.registerCommand(actionCmd);

// Reference command
const referenceCmd = program
  .command('reference')
  .alias('ref')
  .description('List references for the focused task');

ReferenceCommand.registerCommand(referenceCmd);

// Watch command
const watchCmd = program
  .command('watch')
  .description('Watch focused task file and rerun task get when it changes');

WatchCommand.registerCommand(watchCmd);

// Doc command
const docCmd = program
  .command('doc')
  .description('Display TUI-formatted documentation');

DocCommand.registerCommand(docCmd);

program.parse(preprocessArgv(process.argv));
