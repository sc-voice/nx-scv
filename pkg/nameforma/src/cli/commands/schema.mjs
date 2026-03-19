/**
 * Schema command handler for nameforma CLI
 * Supports: list, show, register
 */

import { NameForma } from '../../../index.mjs';

const { Schema } = NameForma;

export default class SchemaCommand {
  /**
   * Register schema subcommands
   * @param {Command} cmd - Commander command object
   */
  static register(cmd) {
    // schema list
    cmd
      .command('list')
      .description('List registered schemas')
      .action(() => {
        const registry = Schema.REGISTRY || {};
        const schemaNames = Object.keys(registry);

        if (schemaNames.length === 0) {
          console.log('No registered schemas');
          return;
        }

        console.log(`Registered Schemas (${schemaNames.length}):`);
        schemaNames.forEach((name) => {
          console.log(`  - ${name}`);
        });
      });

    // schema show
    cmd
      .command('show <name>')
      .description('Show schema details')
      .action((name) => {
        const registry = Schema.REGISTRY || {};
        const schema = registry[name];

        if (!schema) {
          console.error(`Schema not found: ${name}`);
          process.exit(1);
        }

        console.log(`Schema: ${name}`);
        console.log(JSON.stringify(schema.toJSON ? schema.toJSON() : schema, null, 2));
      });

    // schema info
    cmd
      .command('info')
      .description('Show schema registry information')
      .action(() => {
        const registry = Schema.REGISTRY || {};
        const schemaNames = Object.keys(registry);

        console.log('Schema Registry Information');
        console.log(`Total schemas registered: ${schemaNames.length}`);

        if (schemaNames.length > 0) {
          console.log('\nSchemas:');
          schemaNames.forEach((name) => {
            console.log(`  - ${name}`);
          });
        }
      });
  }
}
