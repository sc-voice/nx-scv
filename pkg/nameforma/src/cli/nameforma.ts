#!/usr/bin/env node

/**
 * NameForma CLI - Command-line interface for NameForma package
 *
 * Usage: nameforma [command] [options]
 *
 * Commands:
 *   task [subcommand]    Manage tasks
 *   forma [subcommand]   Manage formas
 *   schema [subcommand]  Manage schemas
 *
 * Examples:
 *   nameforma task create --title "My Task" --progress 0/1
 *   nameforma task list
 *   nameforma forma create --name "my-forma"
 *   nameforma schema list
 */

import { Command } from 'commander';
import { NameForma } from '../index.js';
import TaskCommand from './commands/task.js';
import FormaCommand from './commands/forma.js';
import SchemaCommand from './commands/schema.js';

const program = new Command();

program
  .name('nameforma')
  .description('NameForma CLI - Manage tasks, formas, and schemas')
  .version('3.33.0')
  .addHelpText('after', '\nFor detailed help on a command:\n  $ nameforma help <command>\n\nFor detailed help on a subcommand:\n  $ nameforma <command> help <subcommand>\n\nExamples:\n  $ nameforma help task\n  $ nameforma task help create\n  $ nameforma task create --help');

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

program.parse();
