import { FileRepository } from './file-repository.js';
import { logger } from './logger.js';
import { World } from './world.js';
import { Forma } from './forma.js';
import { Entity, IEntity } from './entity.js';
import type { FuzzyId } from './identifiable.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { Mutator } from './mutator.js';
import { EntityCursor } from './entity-cursor.js';
import { NfFindCommand } from './nf-find-command.js';
import { NfThemeCommand } from './nf-theme-command.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';
import path from 'path';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'fs';
import { DBG, findWorld } from './defines.js';
import { ZUID } from './zuid.js';

const Hjson = HJSON_CJS as any;
const USER = process.env.CLAUDECODE ? 'Claude' : 'Standard';
const IS_CLAUDE = USER === 'Claude';
const theme = NameFormaTheme.shared;

/** Default agent_instructions header value for `nf markdown` */
export const DEFAULT_AGENT_INSTRUCTIONS =
  'Maintain synchronous awareness without a persistent urge to solve or fix anything until a consensus call to action emerges.';

/** Default title for `nf markdown` */
export const DEFAULT_MARKDOWN_TITLE = 'Sample Markdown Document';

/** Placeholder for an unset `nf markdown` header field */
export const NO_VALUE = '(none)';

/** Default description header value for `nf markdown` */
export const DEFAULT_MARKDOWN_DESCRIPTION = NO_VALUE;

/** Default status header value for `nf markdown` */
export const DEFAULT_MARKDOWN_STATUS = 'draft';

/** Default tags header value for `nf markdown` */
export const DEFAULT_MARKDOWN_TAGS = NO_VALUE;

/** Default type header value for `nf markdown` */
export const DEFAULT_MARKDOWN_TYPE = 'nameforma.md';

/** Default body of the References section for `nf markdown` */
export const DEFAULT_MARKDOWN_REFERENCES = NO_VALUE;

/**
 * Author from the nearest package.json at or above startDir.
 * @returns the package.json author (string or `name`), or NO_VALUE
 */
export function markdownAuthor(startDir: string = process.cwd()): string {
  let dir = startDir;
  for (;;) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const { author } = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (typeof author === 'string') return author;
        return author?.name ?? NO_VALUE;
      } catch {
        return NO_VALUE;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return NO_VALUE;
    dir = parent;
  }
}

/** @returns local date as YYYY-MM-DD */
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Header and body fields of an `nf markdown` article */
export interface IMarkdownFields {
  type: string;
  title: string;
  description: string;
  status: string;
  tags: string;
  author: string;
  agentInstructions: string;
  references: string;
  zuid: string;
  updated: string;
}

export interface IOutputConfiguration {
  writeOut?(str: string): void;
  writeErr?(str: string): void;
  outputError?(str: string, write: (str: string) => void): void;
}

/**
 * ICommand: Formalized builder contract for CLI command definition
 *
 * Abstracts the chainable fluent API of commander.js Command, enabling
 * declarative command configuration separate from commander internals.
 * Both root and subcommands implement ICommand.
 *
 * All methods are chainable (return ICommand) except:
 * - parseAsync(): terminal operation, returns Promise<ICommand>
 */
export interface ICommand {
  /** Set the command name. */
  name(str: string): ICommand;
  name(): string;

  /** Set the command description. */
  description(str: string): ICommand;

  /** Set the program version (auto-registers -V/--version flag). */
  version(str: string): ICommand;

  /**
   * Add a subcommand with given name.
   * Returns a new ICommand instance for the subcommand.
   */
  command(nameAndArgs: string): ICommand;

  /**
   * Add a positional argument to this command.
   * @param spec argument spec: <required> or [optional] or [variadic...]
   * @param description help text for the argument
   * @param defaultValue optional default value
   */
  argument(
    spec: string,
    description?: string,
    defaultValue?: unknown,
  ): ICommand;

  /**
   * Add an option/flag to this command.
   * @param spec option spec: '-f, --flag' or '--flag <value>'
   * @param description help text for the option
   * @param defaultValue optional default value
   */
  option(
    spec: string,
    description?: string,
    defaultValue?: string | boolean | string[],
  ): ICommand;

  /**
   * Set the action handler for this command.
   * Called when the command is executed with parsed arguments and options.
   */
  action(fn: (...args: any[]) => void | Promise<void>): ICommand;

  /**
   * Register a lifecycle hook (preAction, postAction, etc).
   * @param event hook event name
   * @param listener callback executed at the hook point
   */
  hook(
    event: string,
    listener: (
      thisCommand: ICommand,
      actionCommand: ICommand,
    ) => void | Promise<void>,
  ): ICommand;

  /** Add an alias for this command. */
  alias(alias: string): ICommand;

  /**
   * Add formatted help text at a specific position.
   * @param position 'beforeAll' | 'before' | 'after' | 'afterAll'
   * @param text help text to append
   */
  addHelpText(position: string, text: string): ICommand;

  /**
   * Customize output behavior (write stdout, stderr, format errors).
   */
  configureOutput(config: IOutputConfiguration): ICommand;
  configureOutput(): IOutputConfiguration;

  /**
   * Parse command-line arguments and execute the command.
   * Terminal operation: does not return ICommand.
   */
  parseAsync(argv: string[]): Promise<ICommand>;

  /**
   * Report an error and exit.
   * With exitOverride(), throws CommanderError; without it calls process.exit().
   */
  error(
    message: string,
    errorOptions?: { exitCode?: number; code?: string },
  ): never;
}

/**
 * NfProgram - Command orchestrator for nameforma operations
 * Holds both domain logic (World) and CLI structure (ICommand).
 * Separates construction (CLI building) from initialization (World resolution).
 */
export class NfProgram {
  protected _world?: World;
  verbosity: number = 0;
  testRunner: boolean = false;
  debug: boolean = false;
  isAgent: boolean = false;
  findCommand: NfFindCommand;
  themeCommand: NfThemeCommand;

  /**
   * Resolve a World by path. Auto-discovers if no path given.
   * Static method for use by different CLI implementations.
   */
  static async resolveWorld(worldPath?: string): Promise<World> {
    let resolvedPath = worldPath;
    if (!resolvedPath) {
      resolvedPath = findWorld() || undefined;
      if (!resolvedPath) {
        throw new Error(
          `No world found. Run 'nf init' in your project directory to create one.`,
        );
      }
    } else if (!resolvedPath.endsWith('.nameforma')) {
      resolvedPath = path.join(resolvedPath, '.nameforma');
    }
    return await FileRepository.loadWorld(resolvedPath);
  }

  /** Return true iff val is: true, non-zero number, "1", "yes", "y" */
  static parseBoolean(val: any, defaultVal: boolean = false): boolean {
    if (val === undefined) {
      return defaultVal;
    }
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      return (
        lower === 'true' ||
        lower === '1' ||
        lower === 'yes' ||
        lower === 'y'
      );
    }

    return false;
  }

  constructor(protected readonly rootCmd: ICommand) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf-8'),
    );
    this.rootCmd = rootCmd;
    const version = pkgJson.version;
    this.findCommand = new NfFindCommand(this);
    this.themeCommand = new NfThemeCommand(this);

    this.rootCmd
      .name('nf')
      .option('--tui', 'Output in Terminal User Interface format')
      .option('-j, --out-json', 'Output as JSON')
      .version(version)
      .description(
        `NameForma/${USER} CLI - Personal reality manager for human/agent cooperation`,
      );
  }

  get world(): World {
    if (!this._world) {
      throw new Error('NfProgram not initialized: World not set');
    }
    return this._world;
  }

  /**
   * Initialize NfProgram with a World and configuration options.
   * Called after World is resolved, typically in a preAction hook.
   */
  initialize(
    world: World,
    opts?: {
      verbosity?: number;
      testRunner?: boolean;
      debug?: boolean;
      isAgent?: boolean;
    },
  ): void {
    this._world = world;
    if (opts?.verbosity !== undefined) this.verbosity = opts.verbosity;
    if (opts?.testRunner !== undefined) this.testRunner = opts.testRunner;
    if (opts?.debug !== undefined) this.debug = opts.debug;
    if (opts?.isAgent !== undefined) this.isAgent = opts.isAgent;
  }

  async parseAsync(args: string[]): Promise<ICommand> {
    const ctx = 'n7m.parseAsync';
    const dbg = DBG.NF_PROGRAM.ANY;
    try {
      dbg && logger.debug({ ctx, args });
      return this.rootCmd.parseAsync(args);
    } catch (err) {
      logger.error({ ctx, err });
      throw err;
    }
  }

  /** Parse dotref: FORMA_ID.FIELD_NAME */
  async resolveDotRef(dotRef: string): Promise<{
    entity: Forma;
    forma: Forma;
    fieldName: string;
    fuzzyId: string;
    value: any;
  }> {
    const dotIdx = dotRef.indexOf('.');
    if (dotIdx === -1) {
      throw new Error('dotRef must be FORMA_ID.FIELD_NAME');
    }

    const fuzzyId = dotRef.slice(0, dotIdx);
    const fieldName = dotRef.slice(dotIdx + 1);

    const resolved = await this.world.resolveFuzzyId(fuzzyId);
    if (!resolved) {
      throw new Error(`Not found: ${fuzzyId}`);
    }
    const { forma, entity } = resolved;
    const value = (forma as any)[fieldName];

    return { entity, forma, fieldName, fuzzyId, value };
  }

  /** @returns current output configuration */
  get output(): IOutputConfiguration {
    return this.rootCmd.configureOutput();
  }

  /** Pass through to configuredOutput.writeOut()
   * nf-cli: console.log()
   * nf-cli: notify() // overwrite successive calls
   */
  writeOut(...strs: string[]): void {
    const { writeOut } = this.output;
    const str = strs.join(' ');
    if (typeof writeOut === 'function') {
      //console.log(str);
      writeOut(str + '\n');
    } else {
      console.log('NfProgram.writeOut?', str);
    }
  }

  /** pass through to configuredOutput.writeErr() */
  writeErr(...strs: string[]): void {
    const { writeErr } = this.output;
    const str = strs.join(' ');
    if (typeof writeErr === 'function') {
      writeErr(str);
    } else {
      console.error('NfProgram.writeErr?', str);
    }
  }

  /** Action handler for @see registerAddCommand */
  nfAdd(
    typeName: string,
    name: string,
    summary: string | undefined,
    options: any,
  ): void {
    const ctx = 'nfAdd';
    const dbg = DBG.NF_PROGRAM.ANY;
    dbg && logger.debug({ ctx, typeName, name, summary });
  }

  registerAddCommand(): void {
    const msg = 'n7m.registerAddCommand';
    const nfp = this;
    this.rootCmd
      .command('add')
      .description('Add a new unfocused `typeName` Entity')
      .argument('<typeName>', 'Entity type: Plan, ... (required)')
      .argument('<name>', 'Name or title (required)')
      .argument('[summary...]', 'Optional descriptive summary')
      .option('-j, --out-json', 'Output update forma as JSON')
      .addHelpText(
        'after',
        [
          '',
          'Examples:',
          ' nf add plan "Buttermilk_Pancakes" "Fluffy breakfast buttermilk pancakes"',
          ' nf add plan Buttermilk_Pancakes Fluffy breakfast buttermilk pancakes',
        ].join('\n'),
      )
      .action(
        (
          typeName: string,
          name: string,
          summary: string | undefined,
          options: any,
        ) => nfp.nfAdd(typeName, name, summary, options),
      );
  }

  /** Action handler for @see registerInitCommand */
  async nfInit(pathArg: string | undefined, options: any): Promise<void> {
    const msg = theme.nfAttend('nfInit');
    const dbg = DBG.NF_PROGRAM.ANY;
    try {
      const targetPath = pathArg || process.cwd();
      const worldPath = targetPath.endsWith('.nameforma')
        ? targetPath
        : path.join(targetPath, '.nameforma');

      const world = await FileRepository.createWorld(worldPath);
      const lines = [
        theme.nfNominal(`✓ Initialized world at ${worldPath}`),
        theme.nfLabel('id:') + world.id.base64,
      ];
      this.writeOut(lines.join('\n'));
    } catch (err) {
      this.writeErr(
        theme.nfAttend(
          `Failed to initialize world: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  registerInitCommand(): void {
    const nfp = this;
    this.rootCmd
      .command('init')
      .description('Initialize NameForma environment')
      .argument(
        '[path]',
        'Directory to initialize (defaults to current directory)',
      )
      .action((pathArg, options) => nfp.nfInit(pathArg, options));
  }

  applyProjection(
    obj: any,
    projection: Record<string, any>,
  ): Record<string, any> {
    return EntityCursor.applyProjection(obj, projection);
  }

  registerUpdateCommand(): void {
    const nfp = this;
    this.rootCmd
      .command('update')
      .alias('updateOne')
      .alias('patch')
      .description(
        'Apply mutations to a forma using operator-based commands',
      )
      .argument('<fuzzyId>', 'Forma FUZZY_ID to mutate')
      .argument('<mutation...>', 'Mutation commands as HJSON')
      .addHelpText(
        'after',
        `
Examples:
  nf update TASK_ID name:'new name'
  nf update focus name:'new name'
  nf update world name:'new name'
  nf update ACTION_ID status:work statusNote:prototype
  nf update ACTION_ID "$set: {status: 'work'}"
  nf update ACTION_ID "$push: {tags: 'urgent'}"`,
      )
      .action(
        async (fuzzyId: string, mutation: string[], options: any) => {
          let json;
          let hjsonStr;
          let lines: string[] = [];
          try {
            const resolved = await nfp.world.resolveFuzzyId(fuzzyId);
            if (!resolved) {
              throw new Error(`Not found: ${fuzzyId}`);
            }

            hjsonStr = mutation.join(' ').trim();
            json = Object.assign(
              {},
              ...mutation.map((s) => Hjson.parse(s)),
            );
            json.id = resolved.forma.id.base64;

            const mutator = Mutator.fromJson(json);
            const { forma: oldForma } = resolved;
            const oldSnapshot = JSON.parse(JSON.stringify(oldForma));

            const delta = await nfp.world.mutate(
              fuzzyId,
              mutator.commands,
            );
            const updated = (await nfp.world.resolveFuzzyId(fuzzyId))
              ?.forma;

            if (json) {
              lines.push(
                theme.nfNote(
                  `requested patch: ${JSON.stringify(json, null, 2)}`,
                ),
              );
            }
            const formaId = theme.nfLink(oldForma.id.base64);
            const formaType = oldForma.constructor.name;
            lines.push(`${formaType} ${fuzzyId} ${formaId}`);
            for (const [key, oldValue] of Object.entries(delta)) {
              const newValue = (updated as any)?.[key];
              const oldStr = JSON.stringify(oldValue);
              const newStr = JSON.stringify(newValue);
              lines.push(`- ${key}: ${theme.nfAttend(oldStr)}`);
              lines.push(`+ ${key}: ${theme.nfNominal(newStr)}`);
            }
            nfp.writeOut(lines.join('\n'));
          } catch (err: any) {
            if (json) {
              lines.push(
                'requested patch:' + JSON.stringify(json, null, 2),
              );
            } else if (hjsonStr) {
              lines.push('hjsonStr:' + hjsonStr);
            }
            nfp.writeErr(`${lines.join('\n')}\n✗ Error: ${err.message}`);
            throw err;
          }
        },
      );
  } // registerUpdateCommand

  registerSystemCommand(): void {
    const nfp = this;
    this.rootCmd
      .command('system')
      .description('Show system/environmental info')
      .action(async (options: any) => {
        const { rows, columns } = process.stdout ?? {};
        const { _world } = nfp;
        const ns = _world && _world.namespace;
        const nsSize = (ns && ns.size) || 'uninitialized';
        nfp.writeOut(
          JSON.stringify({
            rows,
            columns,
            nsSize,
          }),
        );
      });
  } // registerSystemCommand

  /**
   * Identifying title of an article: first 6 zuid characters, then the
   * title words joined with underscores. It is the YAML title and the
   * file name without the .md suffix, as in the iapapo articles folder.
   * @returns e.g. "0Q71Oh_Sample_Markdown_Document"
   */
  markdownStem(title: string, zuid: string): string {
    const slug = title
      .trim()
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${zuid.slice(0, 6)}_${slug}`;
  }

  /**
   * Build a nameforma Markdown article: YAML header, a heading with the
   * human-readable title, and an Overview section.
   * JSON.stringify yields valid YAML double-quoted scalars for the values.
   * @param f header and body fields; title is shown in the body
   * @returns Markdown text without a trailing newline
   */
  markdownArticle(f: IMarkdownFields): string {
    const stem = this.markdownStem(f.title, f.zuid);
    return [
      '---',
      `type: ${JSON.stringify(f.type)}`,
      'collection: world',
      `zuid: ${f.zuid}`,
      `title: ${JSON.stringify(stem)}`,
      `description: ${JSON.stringify(f.description)}`,
      `status: ${JSON.stringify(f.status)}`,
      `tags: ${JSON.stringify(f.tags)}`,
      `author: ${JSON.stringify(f.author)}`,
      `updated: ${f.updated}`,
      `agent_instructions: ${JSON.stringify(f.agentInstructions)}`,
      '---',
      '',
      `# ${f.title}`,
      '',
      '## Overview',
      '',
      '## References',
      '',
      f.references,
    ].join('\n');
  }

  /** Action handler for @see registerMarkdownCommand */
  nfMarkdown(title: string, options: any): void {
    const zuid = ZUID.create().toString();
    const markdown = this.markdownArticle({
      type: options.type,
      title,
      description: options.description,
      status: options.status,
      tags: options.tags,
      author: options.author ?? markdownAuthor(),
      agentInstructions: options.agent_instructions,
      references: options.references,
      zuid,
      updated: localDateString(),
    });
    if (!options.out) {
      this.writeOut(markdown);
      return;
    }
    const stem = this.markdownStem(title, zuid);
    const filePath = join(options.out, `${stem}.md`);
    writeFileSync(filePath, markdown + '\n', { flag: 'wx' });
    this.writeOut(filePath);
  }

  registerMarkdownCommand(): void {
    const nfp = this;
    this.rootCmd
      .command('markdown')
      .description('Print a nameforma Markdown article with a YAML header')
      .argument(
        '[title...]',
        'Article title: unquoted words, joined by spaces',
      )
      .option('--type <text>', 'type header value', DEFAULT_MARKDOWN_TYPE)
      .option(
        '--description <text>',
        'description header value',
        DEFAULT_MARKDOWN_DESCRIPTION,
      )
      .option(
        '--status <text>',
        'status header value',
        DEFAULT_MARKDOWN_STATUS,
      )
      .option('--tags <text>', 'tags header value', DEFAULT_MARKDOWN_TAGS)
      .option(
        '--author <text>',
        'author header value (default: package.json author, if any)',
      )
      .option(
        '--references <text>',
        'References section body',
        DEFAULT_MARKDOWN_REFERENCES,
      )
      .option(
        '--agent_instructions <text>',
        'agent_instructions header value',
        DEFAULT_AGENT_INSTRUCTIONS,
      )
      .option(
        '--out <dir>',
        'Write the article to a new file in DIR instead of stdout',
      )
      .action((titleWords: string[] | undefined, options: any) =>
        nfp.nfMarkdown(
          titleWords?.join(' ') || DEFAULT_MARKDOWN_TITLE,
          options,
        ),
      );
  }

  registerThemeCommand(): void {
    this.themeCommand.register(this.rootCmd);
  }
  registerFindCommand(): void {
    this.findCommand.register(this.rootCmd);
  }
}
