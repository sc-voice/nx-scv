/**
 * Reference command handler for nameforma CLI
 * Lists references for the currently focused task
 */

import path from 'path';
import fs from 'fs';
import { nfTui } from './nf-tui.js';
import { World } from '../world.js';
import { Task } from '../task.js';
import type { GlobalOpts } from './nf-cli.js';

export default class ReferenceCommand {
  static readonly EXAMPLES: Record<string, string[]> = {
    list: ['$ nf reference list # list references for focused task'],
    get: ['$ nf ref get REF_ID # get a specific reference'],
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
    delete: ['$ nf ref delete REF_ID # delete a reference'],
  };

  static getFocusedTask(world: World): Task | null {
    const focus = world.focusedForma('task');
    if (!focus) {
      return null;
    }
    return world.loadFuzzy(Task, focus.formaId.toString()) || null;
  }

  static probeSource(
    name: string,
    world: World,
    explicitSource?: string,
  ): { refName: string; source?: string } {
    let source = explicitSource;
    let refName = name;
    if (!source) {
      const worldRoot = path.dirname(world.worldPath);
      let probePath = name;
      if (name.startsWith('@')) {
        probePath = name.slice(1);
      }
      const probe = path.join(worldRoot, probePath);
      if (fs.existsSync(probe)) {
        source = `nf:./${probePath}`;
        refName = path.basename(probePath);
      }
    }
    return { refName, source };
  }

  static printReference(reference: any, index: number) {
    nfTui.log(`${index}. ${reference.name}`);
    if (reference.summary) {
      nfTui.log(`   ${reference.summary}`);
    }
    if (reference.source) {
      nfTui.log(`   source: ${reference.source}`);
    }
    if (reference.relevance) {
      nfTui.log(`   relevance: ${reference.relevance}`);
    }
  }

  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    const helpText = [
      'Examples:',
      ...Object.values(ReferenceCommand.EXAMPLES)
        .flat()
        .map((e) => `  ${e}`),
    ].join('\n');
    cmd.addHelpText('after', '\n' + helpText);

    // Default action: list references of focused task
    cmd
      .description(
        'Manage references linking tasks/actions to external resources',
      )
      .action((options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          nfTui.log('No task is currently focused');
          return;
        }

        const refList = task.references(world);
        refList.sort((a, b) => b.relevance - a.relevance);
        const references = refList.items;

        if (references.length === 0) {
          nfTui.log('No references');
          return;
        }

        nfTui.log(`References for: ${task.name}`);
        nfTui.log('');
        references.forEach((reference: any, index: number) => {
          ReferenceCommand.printReference(reference, index + 1);
        });
      });

    // reference list
    cmd
      .command('list')
      .description('List references for the focused task')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...ReferenceCommand.EXAMPLES.list.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          nfTui.log('No task is currently focused');
          return;
        }

        const refList = task.references(world);
        refList.sort((a, b) => b.relevance - a.relevance);
        const references = refList.items;

        if (references.length === 0) {
          nfTui.log('No references');
          return;
        }

        nfTui.log(`References for: ${task.name}`);
        nfTui.log('');
        references.forEach((reference: any, index: number) => {
          ReferenceCommand.printReference(reference, index + 1);
        });
      });

    // reference get <id>
    cmd
      .command('get <id>')
      .description('Get a specific reference')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...ReferenceCommand.EXAMPLES.get.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = getGlobalOpts().world;
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        try {
          const reference = refList.getItem(id);
          nfTui.log(`Reference: ${task.name}`);
          nfTui.log('');
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
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...ReferenceCommand.EXAMPLES.json.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((id: string | undefined, options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        if (id) {
          try {
            const reference = refList.getItem(id);
            nfTui.log(JSON.stringify(reference, null, 2));
          } catch (err: any) {
            throw new Error(`Reference not found: ${id}`);
          }
        } else {
          nfTui.log(JSON.stringify(refList.items, null, 2));
        }
      });

    // reference set <dotref> <value...>
    cmd
      .command('set <dotref> <value...>')
      .description('Set a reference field')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...ReferenceCommand.EXAMPLES.set.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action(
        (dotref: string, values: string[], options: any, cmd: any) => {
          if (!dotref.includes('.')) {
            throw new Error('dotref must be in format REF_ID.field');
          }

          const parts = dotref.split('.');
          const refId = parts[0];
          const field = parts[1];

          if (
            !['name', 'summary', 'relevance', 'source'].includes(field)
          ) {
            throw new Error(
              `Invalid field: ${field}. Allowed: name, summary, relevance, source`,
            );
          }

          const value = values.join(' ').replace(/\n/g, ' ').trim();

          if (field === 'name' && !value) {
            throw new Error('Reference name cannot be blank');
          }

          if (field === 'relevance') {
            const relevance = parseFloat(value);
            if (isNaN(relevance) || relevance < 0 || relevance > 1) {
              throw new Error(
                'Relevance must be a number between 0 and 1',
              );
            }
          }

          const world = getGlobalOpts().world;
          const task = ReferenceCommand.getFocusedTask(world);

          if (!task) {
            throw new Error('No task is currently focused');
          }

          const refList = task.references(world);

          try {
            const updateCfg: any = {};
            if (field === 'relevance') {
              updateCfg[field] = parseFloat(value);
            } else if (field === 'name') {
              const { refName, source } = ReferenceCommand.probeSource(
                value,
                world,
              );
              updateCfg.name = refName;
              if (source) {
                updateCfg.source = source;
              }
            } else {
              updateCfg[field] = value;
            }

            const reference = refList.patchItem(refId, updateCfg);
            world.save();

            nfTui.log(`✓ Reference updated`);
            nfTui.log(`  ${reference.name}`);
          } catch (err: any) {
            throw new Error(`Reference not found: ${refId}`);
          }
        },
      );

    // reference add
    cmd
      .command('add <name> [summary]')
      .description('Add a reference to the focused task')
      .option('-r, --relevance <number>', 'Relevance score (0-1)', '0.5')
      .option('--source <uri>', 'Source URI or text hint')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...ReferenceCommand.EXAMPLES.add.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action(
        (
          name: string,
          summary: string | undefined,
          options: any,
          cmd: any,
        ) => {
          const world = getGlobalOpts().world;
          const task = ReferenceCommand.getFocusedTask(world);

          if (!task) {
            throw new Error('No task is currently focused');
          }

          const relevance = parseFloat(options.relevance);
          if (isNaN(relevance) || relevance < 0 || relevance > 1) {
            throw new Error('Relevance must be a number between 0 and 1');
          }

          const { refName, source } = ReferenceCommand.probeSource(
            name,
            world,
            options.source,
          );

          const referenceConfig: any = { name: refName, relevance };
          if (summary) {
            referenceConfig.summary = summary;
          }
          if (source) {
            referenceConfig.source = source;
          }

          const reference = task
            .references(world)
            .addItem(referenceConfig);
          world.save();

          nfTui.log(`✓ Reference added: ${reference.id.base64}`);
          nfTui.log(`  ${reference.name}`);
        },
      );

    // reference delete <id>
    cmd
      .command('delete <id>')
      .description('Delete a reference')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ...ReferenceCommand.EXAMPLES.delete.map((e) => `  ${e}`),
        ].join('\n'),
      )
      .action((id: string, options: any, cmd: any) => {
        if (id.length < 3) {
          throw new Error('ID must be at least 3 characters');
        }

        const world = getGlobalOpts().world;
        const task = ReferenceCommand.getFocusedTask(world);

        if (!task) {
          throw new Error('No task is currently focused');
        }

        const refList = task.references(world);

        try {
          const reference = refList.deleteItem(id);
          world.save();

          nfTui.log(`✓ Reference deleted`);
          nfTui.log(`  ${reference.name}`);
        } catch (err: any) {
          throw new Error(`Reference not found: ${id}`);
        }
      });
  }
}
