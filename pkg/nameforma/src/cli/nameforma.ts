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
import TaskCommand from './cli-task.js';
import FormaCommand from './cli-forma.js';
import SchemaCommand from './cli-schema.js';
import IdCommand from './cli-id.js';
import FocusCommand from './cli-focus.js';
import ActionCommand from './cli-action.js';
import StatusCommand from './cli-status.js';

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

program
  .name('nameforma')
  .description('NameForma CLI - Manage tasks, formas, and schemas')
  .version('3.33.0')
  .addHelpText('after', '\n' + helpText);

program
  .option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)')
  .option('-d, --debug', 'Enable debug output')
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

// Status command
const statusCmd = program
  .command('status')
  .description('Manage action status');

StatusCommand.registerCommand(statusCmd);

program.parse(preprocessArgv(process.argv));
