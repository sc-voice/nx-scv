import { FileRepository, logger } from './file-repository.js';
import { World } from './world.js';
import { Forma } from './forma.js';
import type { FuzzyId } from './identifiable.js';
import { NameFormaTheme } from './nameforma-theme.js';
import { Mutator } from './mutator.js';
// @ts-ignore - hjson has no type definitions
import * as HJSON_CJS from 'hjson';
import path from 'path';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readFileSync, realpathSync } from 'fs';
import { DBG } from './defines.js';

const Hjson = HJSON_CJS as any;
const USER = process.env.CLAUDECODE ? 'Claude' : 'Standard';
const IS_CLAUDE = USER === 'Claude';
const theme = NameFormaTheme.shared;

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

  /**
   * Resolve a World by path. Auto-discovers if no path given.
   * Static method for use by different CLI implementations.
   */
  static async resolveWorld(worldPath?: string): Promise<World> {
    let resolvedPath = worldPath;
    if (!resolvedPath) {
      resolvedPath = FileRepository.findWorld() || undefined;
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

  constructor(protected readonly cmdDelegate: ICommand) {
    let program = this.cmdDelegate;

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf-8'),
    );
    const version = pkgJson.version;

    program
      .name('nf')
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
      return this.cmdDelegate.parseAsync(args);
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
    return this.cmdDelegate.configureOutput();
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
    this.cmdDelegate
      .command('add')
      .description('Add a new unfocused `typeName` Entity')
      .argument('<typeName>', 'Entity type: Plan, ... (required)')
      .argument('<name>', 'Name or title (required)')
      .argument('[summary...]', 'Optional descriptive summary')
      .option('-j, --json', 'Output update forma as JSON')
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
    this.cmdDelegate
      .command('init')
      .description('Initialize NameForma environment')
      .argument(
        '[path]',
        'Directory to initialize (defaults to current directory)',
      )
      .action((pathArg, options) => nfp.nfInit(pathArg, options));
  }

  registerFindCommand(): void {
    const nfp = this;
    this.cmdDelegate
      .command('find')
      .alias('findOne')
      .description('Find a Forma')
      .argument('<fuzzyId>', 'Forma FUZZY_ID to find')
      .argument(
        '[hjson...]',
        'Optional projection, e.g.: {name:1, summary:1}',
      )
      .addHelpText(
        'after',
        `
Examples:
  nf find TASK_ID
  nf find focus name:1 summary:1
  nf find world summary:0
  nf find ACTION_ID`,
      )
      .action(
        async (fuzzyId: string, hjson: string[] = [], options: any) => {
          const ctx = 'NfProgram.registerFindCommand';
          let lines: string[] = [];
          try {
            const resolved = await nfp.world.resolveFuzzyId(fuzzyId);
            if (!resolved) {
              throw new Error(`Not found: ${fuzzyId}`);
            }

            const hjsonStr = hjson.join(' ').trim();
            const projection = Object.assign(
              {},
              ...hjson.map((s) => Hjson.parse(s)),
            );
            const pv = Object.values(projection);
            const optIn = !pv.some((v) => v === 0);

            const { forma } = resolved;
            const fkv = Object.entries(forma);

            const output: Record<string, any> = {};

            for (const [k, v] of Object.entries(forma)) {
              if (projection[k] !== 0 || (optIn && projection[k] === 1)) {
                output[k] = v;
              }
            }
            lines.push(JSON.stringify(output, null, 2));

            nfp.writeOut(lines.join('\n'));
          } catch (err: any) {
            logger.error({ ctx, err });
            nfp.writeErr(`✗ ${ctx} Error: ${err.message}`);
            throw err;
          }
        },
      );
  } // registerFindCommand

  registerUpdateCommand(): void {
    const nfp = this;
    this.cmdDelegate
      .command('update')
      .alias('updateOne')
      .alias('patch')
      .description(
        'Apply mutations to a forma using operator-based commands',
      )
      .argument('<fuzzyId>', 'Forma FUZZY_ID to mutate')
      .argument('<hjson...>', 'Mutation commands as HJSON')
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
      .action(async (fuzzyId: string, hjson: string[], options: any) => {
        let json;
        let hjsonStr;
        let lines: string[] = [];
        try {
          const resolved = await nfp.world.resolveFuzzyId(fuzzyId);
          if (!resolved) {
            throw new Error(`Not found: ${fuzzyId}`);
          }

          hjsonStr = hjson.join(' ').trim();
          json = Object.assign({}, ...hjson.map((s) => Hjson.parse(s)));
          json.id = resolved.forma.id.base64;

          const mutator = Mutator.fromJson(json);
          const { forma: oldForma } = resolved;
          const oldSnapshot = JSON.parse(JSON.stringify(oldForma));

          const delta = await nfp.world.mutate(fuzzyId, mutator.commands);
          const updated = (await nfp.world.resolveFuzzyId(fuzzyId))?.forma;

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
            lines.push('requested patch:' + JSON.stringify(json, null, 2));
          } else if (hjsonStr) {
            lines.push('hjsonStr:' + hjsonStr);
          }
          nfp.writeErr(`${lines.join('\n')}\n✗ Error: ${err.message}`);
          throw err;
        }
      });
  } // registerUpdateCommand
}
