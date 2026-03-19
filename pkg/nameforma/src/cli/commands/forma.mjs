/**
 * Forma command handler for nameforma CLI
 * Supports: create, list, show, update
 */

import { NameForma } from '../../../index.mjs';

const { Forma } = NameForma;

// Instance storage for CLI session
let formas = new Map();

export default class FormaCommand {
  /**
   * Register forma subcommands
   * @param {Command} cmd - Commander command object
   */
  static register(cmd) {
    // forma create
    cmd
      .command('create')
      .description('Create a new forma')
      .requiredOption('-n, --name <name>', 'Forma name')
      .option('--prop <key=value>', 'Additional properties (repeatable)', (val, acc) => {
        const [key, value] = val.split('=');
        acc[key] = value;
        return acc;
      }, {})
      .action((options) => {
        const config = {
          name: options.name,
          ...options.prop,
        };

        const forma = new Forma(config);
        formas.set(forma.id, forma);

        console.log(`✓ Forma created: ${forma.id}`);
        console.log(`  name: ${forma.name}`);
      });

    // forma list
    cmd
      .command('list')
      .description('List all formas')
      .action(() => {
        if (formas.size === 0) {
          console.log('No formas');
          return;
        }

        console.log(`Formas (${formas.size}):`);
        formas.forEach((forma) => {
          console.log(`  ${forma.id}: ${forma.name}`);
        });
      });

    // forma show
    cmd
      .command('show <id>')
      .description('Show forma details')
      .action((id) => {
        const forma = formas.get(id);
        if (!forma) {
          console.error(`Forma not found: ${id}`);
          process.exit(1);
        }

        console.log(`Forma: ${forma.id}`);
        console.log(`  name: ${forma.name}`);

        // Show custom properties
        Object.entries(forma).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'name') {
            console.log(`  ${key}: ${value}`);
          }
        });
      });

    // forma update
    cmd
      .command('update <id>')
      .description('Update a forma')
      .option('-n, --name <name>', 'Update name')
      .option('--prop <key=value>', 'Update properties (repeatable)', (val, acc) => {
        const [key, value] = val.split('=');
        acc[key] = value;
        return acc;
      }, {})
      .action((id, options) => {
        const forma = formas.get(id);
        if (!forma) {
          console.error(`Forma not found: ${id}`);
          process.exit(1);
        }

        const updates = {};

        if (options.name) {
          updates.name = options.name;
        }

        Object.assign(updates, options.prop);

        forma.patch(updates);
        console.log(`✓ Forma updated: ${forma.id}`);
        console.log(`  name: ${forma.name}`);
      });

    // forma delete
    cmd
      .command('delete <id>')
      .description('Delete a forma')
      .action((id) => {
        if (!formas.has(id)) {
          console.error(`Forma not found: ${id}`);
          process.exit(1);
        }

        formas.delete(id);
        console.log(`✓ Forma deleted: ${id}`);
      });
  }
}
