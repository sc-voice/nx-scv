/**
 * Reference command handler for nameforma CLI
 * Lists references for the currently focused task
 */

import path from 'path';
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
      '$ nf ref add "External issue" --summary "GitHub issue #123" --relevance 0.9',
      '$ nf ref add "Design doc" --source "https://example.com/design"',
    ],
    update: [
      '$ nf ref update REF_ID --summary "Updated summary"',
      '$ nf ref update REF_ID --relevance 0.9 # an important reference',
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

    // reference add
    cmd
      .command('add <name>')
      .description('Add a reference to the focused task')
      .option('-s, --summary <summary>', 'Reference summary')
      .option('-r, --relevance <number>', 'Relevance score (0-1)', '0')
      .option('--source <url>', 'Source URL or reference')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.add.map(e => `  ${e}`)
      ].join('\n'))
      .action((name: string, options: any, cmd: any) => {
        const world = ReferenceCommand.getWorld(cmd.parent.optsWithGlobals());
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const relevance = parseFloat(options.relevance);
        if (isNaN(relevance) || relevance < 0 || relevance > 1) {
          throw new Error('Relevance must be a number between 0 and 1');
        }

        const referenceConfig: any = { name, relevance };
        if (options.summary) {
          referenceConfig.summary = options.summary;
        }
        if (options.source) {
          referenceConfig.source = options.source;
        }

        const reference = task.references(world).addItem(referenceConfig);
        world.save();

        console.log(`✓ Reference added: ${reference.id.base64}`);
        console.log(`  ${reference.name}`);
      });

    // reference update <id>
    cmd
      .command('update <id>')
      .description('Update a reference field')
      .option('-n, --name <name>', 'Reference name')
      .option('-s, --summary <summary>', 'Reference summary')
      .option('-r, --relevance <number>', 'Relevance score (0-1)')
      .option('--source <url>', 'Source URL or reference')
      .addHelpText('after', ['', 'Examples:',
        ...ReferenceCommand.EXAMPLES.update.map(e => `  ${e}`)
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

        if (!options.name && !options.summary && !options.relevance && !options.source) {
          throw new Error('At least one field must be specified (--name, --summary, --relevance, or --source)');
        }

        const refList = task.references(world);

        const updateCfg: any = {};
        if (options.name) updateCfg.name = options.name;
        if (options.summary) updateCfg.summary = options.summary;
        if (options.source) updateCfg.source = options.source;
        if (options.relevance !== undefined) {
          const relevance = parseFloat(options.relevance);
          if (isNaN(relevance) || relevance < 0 || relevance > 1) {
            throw new Error('Relevance must be a number between 0 and 1');
          }
          updateCfg.relevance = relevance;
        }

        try {
          const reference = refList.patchItem(id, updateCfg);
          world.save();

          console.log(`✓ Reference updated`);
          console.log(`  ${reference.name}`);
        } catch (err: any) {
          throw new Error(`Reference not found: ${id}`);
        }
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
