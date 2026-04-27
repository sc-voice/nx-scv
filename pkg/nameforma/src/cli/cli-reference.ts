/**
 * Reference command handler for nameforma CLI
 * Lists references for the currently focused task
 */

import path from 'path';
import fs from 'fs';
import { World } from '../world.js';
import { Task } from '../task.js';

export default class ReferenceCommand {
  static readonly EXAMPLES: Record<string, string[]> = {
    list: [
      '$ nf reference list # list references for focused task',
    ],
    show: [
      '$ nf ref show REF_ID # show a specific reference',
    ],
    add: [
      '$ nf ref add "src/cli/cli-task.ts" # auto-sets source=nf:./src/cli/cli-task.ts',
      '$ nf ref add "Design doc" "Optional summary" --source "https://example.com/design"',
      '$ nf ref add "External issue" --relevance 0.9',
    ],
    json: [
      '$ nf ref json REF_ID # output single reference as JSON',
      '$ nf ref json # output all references as JSON array',
    ],
    set: [
      '$ nf ref set REF_ID.name "New name"',
      '$ nf ref set REF_ID.summary "Updated summary"',
      '$ nf ref set REF_ID.relevance 0.9 # highly relevant to task',
      '$ nf ref set REF_ID.source "https://example.com"',
    ],
    delete: [
      '$ nf ref delete REF_ID # delete a reference',
    ],
  };

  static getWorld(options: any): World {
    let worldPath = options.world;

    if (!worldPath) {
      worldPath = World.findWorld();
      if (!worldPath) {
        worldPath = path.join(process.cwd(), '.nameforma');
      }
    } else {
      if (!worldPath.endsWith('.nameforma')) {
        worldPath = path.join(worldPath, '.nameforma');
      }
    }

    return World.fromPath(worldPath);
  }

  static getFocusedTask(world: World): Task | null {
    const focus = world.focusedForma('task');
    if (!focus) {
      return null;
    }
    return world.loadFuzzy(Task, focus.formaId.toString()) || null;
  }

  static printReference(reference: any, index: number) {
    console.log(`${index}. ${reference.name}`);
    if (reference.summary) {
      console.log(`   ${reference.summary}`);
    }
    if (reference.source) {
      console.log(`   source: ${reference.source}`);
    }
    if (reference.relevance) {
      console.log(`   relevance: ${reference.relevance}`);
    }
  }


  static registerCommand(cmd: any) {
    const helpText = ['Examples:',
      ...Object.values(ReferenceCommand.EXAMPLES).flat().map(e => `  ${e}`)
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);
    cmd.option('-w, --world <path>', 'Path to .nameforma directory (or auto-discover)');

    // Default action: list references of focused task
    cmd
      .description('Manage references linking tasks/actions to external resources')
      .action((options: any, cmd: any) => {
        const world = ReferenceCommand.getWorld(cmd.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          console.log('No task is currently focused');
          return;
        }

        const refList = task.references(world);
        refList.sort((a, b) => b.relevance - a.relevance);
        const references = refList.items;

        if (references.length === 0) {
          console.log('No references');
          return;
        }

        console.log(`References for: ${task.name}`);
        console.log('');
        references.forEach((reference: any, index: number) => {
          ReferenceCommand.printReference(reference, index + 1);
        });
      });

    // reference list
    cmd
      .command('list')
      .description('List references for the focused task')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.list.map(e => `  ${e}`)
      ].join('\n'))
      .action((options: any, cmd: any) => {
        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          console.log('No task is currently focused');
          return;
        }

        const refList = task.references(world);
        refList.sort((a, b) => b.relevance - a.relevance);
        const references = refList.items;

        if (references.length === 0) {
          console.log('No references');
          return;
        }

        console.log(`References for: ${task.name}`);
        console.log('');
        references.forEach((reference: any, index: number) => {
          ReferenceCommand.printReference(reference, index + 1);
        });
      });

    // reference show <id>
    cmd
      .command('show <id>')
      .description('Show a specific reference')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.show.map(e => `  ${e}`)
      ].join('\n'))
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        try {
          const reference = refList.getItem(id);
          console.log(`Reference: ${task.name}`);
          console.log('');
          const index = refList.items.indexOf(reference) + 1;
          ReferenceCommand.printReference(reference, index);
        } catch (err: any) {
          throw new Error(`Reference not found: ${id}`);
        }
      });

    // reference json [id]
    cmd
      .command('json [id]')
      .description('Output reference(s) as JSON')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.json.map(e => `  ${e}`)
      ].join('\n'))
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        if (id) {
          try {
            const reference = refList.getItem(id);
            console.log(JSON.stringify(reference, null, 2));
          } catch (err: any) {
            throw new Error(`Reference not found: ${id}`);
          }
        } else {
          console.log(JSON.stringify(refList.items, null, 2));
        }
      });

    // reference set <dotref> <value...>
    cmd
      .command('set <dotref> <value...>')
      .description('Set a reference field')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.set.map(e => `  ${e}`)
      ].join('\n'))
      .action((dotref: string, values: string[], options: any, cmd: any) => {
        if (!dotref.includes('.')) {
          throw new Error('dotref must be in format REF_ID.field');
        }

        const parts = dotref.split('.');
        const refId = parts[0];
        const field = parts[1];

        if (!['name', 'summary', 'relevance', 'source'].includes(field)) {
          throw new Error(`Invalid field: ${field}. Allowed: name, summary, relevance, source`);
        }

        const value = values.join(' ').replace(/\n/g, ' ').trim();

        if (field === 'name' && !value) {
          throw new Error('Reference name cannot be blank');
        }

        if (field === 'relevance') {
          const relevance = parseFloat(value);
          if (isNaN(relevance) || relevance < 0 || relevance > 1) {
            throw new Error('Relevance must be a number between 0 and 1');
          }
        }

        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        try {
          const updateCfg: any = {};
          if (field === 'relevance') {
            updateCfg[field] = parseFloat(value);
          } else {
            updateCfg[field] = value;
          }

          const reference = refList.patchItem(refId, updateCfg);
          world.save();

          console.log(`✓ Reference updated`);
          console.log(`  ${reference.name}`);
        } catch (err: any) {
          throw new Error(`Reference not found: ${refId}`);
        }
      });

    // reference add
    cmd
      .command('add <name> [summary]')
      .description('Add a reference to the focused task')
      .option('-r, --relevance <number>', 'Relevance score (0-1)', '0.5')
      .option('--source <uri>', 'Source URI or text hint')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.add.map(e => `  ${e}`)
      ].join('\n'))
      .action((name: string, summary: string | undefined, options: any, cmd: any) => {
        const globalOpts = cmd.parent.optsWithGlobals();
        const world = ReferenceCommand.getWorld(globalOpts);
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const relevance = parseFloat(options.relevance);
        if (isNaN(relevance) || relevance < 0 || relevance > 1) {
          throw new Error('Relevance must be a number between 0 and 1');
        }

        // Silent existence probe: if name resolves to a file, auto-set source
        let source = options.source;
        let refName = name;
        if (!source) {
          const worldRoot = path.dirname(world.worldPath);
          const probe = path.join(worldRoot, name);
          if (fs.existsSync(probe)) {
            source = `nf:./${name}`;
            refName = path.basename(name);
          }
        }

        const referenceConfig: any = { name: refName, relevance };
        if (summary) {
          referenceConfig.summary = summary;
        }
        if (source) {
          referenceConfig.source = source;
        }

        const reference = task.references(world).addItem(referenceConfig);
        world.save();

        console.log(`✓ Reference added: ${reference.id.base64}`);
        console.log(`  ${reference.name}`);
      });

    // reference delete <id>
    cmd
      .command('delete <id>')
      .description('Delete a reference')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.delete.map(e => `  ${e}`)
      ].join('\n'))
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        try {
          const reference = refList.deleteItem(id);
          world.save();

          console.log(`✓ Reference deleted`);
          console.log(`  ${reference.name}`);
        } catch (err: any) {
          throw new Error(`Reference not found: ${id}`);
        }
      });
  }
}
