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
 *
 * Examples:
 *   nameforma task create --title "My Task" --progress 0/1
 *   nameforma task list
 *   nameforma forma create --name "my-forma"
 *   nameforma schema list
 *   nameforma id FormaCollection
 *   nameforma id -g 5
 *   nameforma id -v F13n
 */

import { Command } from 'commander';
import { NameForma } from '../index.js';
import TaskCommand from './cli-task.js';
import FormaCommand from './cli-forma.js';
import SchemaCommand from './cli-schema.js';
import IdCommand from './cli-id.js';

// Preprocess argv to move -h/--help to the end so it applies to the deepest command
function preprocessArgv(argv: string[]): string[] {
  const helpFlags = ['-h', '--help'];
  const withoutHelp: string[] = [];
  let helpFlag: string | null = null;

  for (let i = 2; i < argv.length; i++) {
    if (helpFlags.includes(argv[i])) {
      helpFlag = argv[i];
    } else {
      withoutHelp.push(argv[i]);
    }
  }

  // Return argv with help flag moved to the end
  return helpFlag ? [...argv.slice(0, 2), ...withoutHelp, helpFlag] : argv;
}

const program = new Command();

const helpText = [
  'Examples:',
  '  $ nameforma --help',
  '  $ nameforma -h task',
  '  $ nameforma -h task create',
].join('\n');

program
  .name('nameforma')
  .description('NameForma CLI - Manage tasks, formas, and schemas')
  .version('3.33.0')
  .addHelpText('after', '\n' + helpText);

program
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

TaskCommand.register(taskCmd);

// Forma command
const formaCmd = program
  .command('forma')
  .description('Manage formas (named identifiable objects)');

FormaCommand.register(formaCmd);

// Schema command
const schemaCmd = program
  .command('schema')
  .description('Manage Avro schemas');

SchemaCommand.register(schemaCmd);

// ID command
const idCmd = program
  .command('id')
  .description('Generate/validate numeronym, UUIDv7, UUID64');

IdCommand.register(idCmd);

program.parse(preprocessArgv(process.argv));
