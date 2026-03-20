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
 *   uuid64 [subcommand]    Generate and manage UUID64 identifiers
 *
 * Examples:
 *   nameforma task create --title "My Task" --progress 0/1
 *   nameforma task list
 *   nameforma forma create --name "my-forma"
 *   nameforma schema list
 *   nameforma uuid64 generate
 *   nameforma uuid64 generate -c 5
 *   nameforma uuid64 validate <uuid64-string>
 *   nameforma uuid64 convert <uuid-string-or-base64>
 */

import { Command } from 'commander';
import { NameForma } from '../index.js';
import TaskCommand from './commands/task.js';
import FormaCommand from './commands/forma.js';
import SchemaCommand from './commands/schema.js';
import UUIDCommand from './commands/uuid.js';

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

// UUID command
const uuidCmd = program
  .command('uuid64')
  .description('Generate and manage UUID64 identifiers');

UUIDCommand.register(uuidCmd);

program.parse(preprocessArgv(process.argv));
