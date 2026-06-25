import { World } from './world.js';
import { Forma } from './forma.js';
import type { FuzzyId } from './identifiable.js';
import { NameFormaTheme } from './nameforma-theme.js';
import path from 'path';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readFileSync, realpathSync } from 'fs';
import { DBG } from './defines.js';

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
  argument(spec: string, description?: string, defaultValue?: unknown): ICommand;

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
    listener: (thisCommand: ICommand, actionCommand: ICommand) => void | Promise<void>,
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
  error(message: string, errorOptions?: { exitCode?: number; code?: string }): never;
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
  static resolveWorld(worldPath?: string): World {
    let resolvedPath = worldPath;
    if (!resolvedPath) {
      resolvedPath = World.findWorld() || undefined;
      if (!resolvedPath) {
        throw new Error(
          `No world found. Run 'nf init' in your project directory to create one.`,
        );
      }
    } else if (!resolvedPath.endsWith('.nameforma')) {
      resolvedPath = path.join(resolvedPath, '.nameforma');
    }
    return World.load(resolvedPath);
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
      )
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
    const msg = 'n7m.parseAsync';
    const dbg = DBG.NF_PROGRAM.ANY;
    try {
      dbg && World.log(msg, args.join(' '));
      return this.cmdDelegate.parseAsync(args);
    } catch (err) {
      dbg && World.log(msg, (err as any)?.message);
      throw err;
    }
  }

  /**
   * Set a field value on a forma by resolving it and persisting via its entity
   * @param formaId - Fuzzy ID of the forma to update
   * @param fieldPath - Field to update (e.g., 'name', 'summary')
   * @param value - New value for the field
   * @returns The updated forma
   */
  setFieldValue(formaId: FuzzyId, fieldPath: string, value: any): Forma {
    const resolved = this.world.resolveFuzzyId(formaId);
    if (!resolved) {
      throw new Error(`Not found: ${formaId}`);
    }

    const { entity, forma } = resolved;
    forma.patch({ [fieldPath]: value });
    this.world.emit('change', {
      type: 'patch',
      item: forma,
      entity,
    });

    return forma;
  }

  /** Parse dotref: FORMA_ID.FIELD_NAME */
  resolveDotRef(dotRef: string): { 
    entity:Forma, forma:Forma, fieldName:string, fuzzyId:string, value:any 
  } {
    const dotIdx = dotRef.indexOf('.');
    if (dotIdx === -1) {
      throw new Error('dotRef must be FORMA_ID.FIELD_NAME');
    }

    const fuzzyId = dotRef.slice(0, dotIdx);
    const fieldName = dotRef.slice(dotIdx + 1);

    const resolved = this.world.resolveFuzzyId(fuzzyId);
    if (!resolved) {
      throw new Error(`Not found: ${fuzzyId}`);
    }
    const { forma, entity } = resolved;
    const value = (forma as any)[fieldName];

    return { entity, forma, fieldName, fuzzyId, value }
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
      writeOut(str+'\n');
    } else {
      console.log("NfProgram.writeOut?", str);
    }
  }

  /** pass through to configuredOutput.writeErr() */
  writeErr(...strs: string[]): void {
    const { writeErr } = this.output;
    const str = strs.join(' ');
    if (typeof writeErr === 'function') {
      writeErr(str);
    } else {
      console.error("NfProgram.writeErr?", str);
    }
  }

  /** Action handler for @see registerAddCommand */
  nfAdd(
    typeName: string, 
    name: string, 
    summary: string | undefined, 
    options: any
  ): void {
    const msg = 'nfAdd';
    const dbg = DBG.NF_PROGRAM.ANY;

    dbg && this.world.log(JSON.stringify({typeName,name,summary}));
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
      .action(( 
        typeName: string, name: string, summary: string | undefined, options: any
        ) => nfp.nfAdd(typeName, name, summary, options)
      );
  }

  registerSetCommand(): void {
    const nfp = this;
    this.cmdDelegate
      .command('set')
      .description('Set a forma field')
      .argument('<dotRef>', 'Forma FUZZY_ID.field')
      .argument('<value...>', 'Value(s) to set')
      .option('-j, --json', 'Output update forma as JSON')
      .action(async (dotRef: string, values: string[], options: any) => {
        const value = values.join(' ').trim();

        try {
          const { 
            forma, fieldName, fuzzyId, value: oldValue 
          } = nfp.resolveDotRef(dotRef);
          const formaId = forma.id.base64;

          // Update and persist
          const updated = nfp.setFieldValue(formaId, fieldName, value);

          // Output result
          if (options.json) {
            nfp.writeOut(JSON.stringify(updated, null, 2));
          } else {
            let id = formaId.replace(fuzzyId, theme.nfLink(fuzzyId));
            nfp.writeOut();
            nfp.writeOut(dotRef+' '+id+'.'+fieldName);
            nfp.writeOut(`- ${theme.nfAttend(oldValue)}`);
            nfp.writeOut(`+ ${theme.nfNominal(value)}`);
          }
        } catch (err: any) {
          nfp.writeErr(`✗ Error: ${err.message}`);
          throw err;
        }
      });
  }

  /** Action handler for @see registerInitCommand */
  nfInit(pathArg: string | undefined, options: any): void {
    const msg = theme.nfAttend('nfInit');
    const dbg = DBG.NF_PROGRAM.ANY;
    try {
      const targetPath = pathArg || process.cwd();
      const worldPath = targetPath.endsWith('.nameforma')
        ? targetPath
        : path.join(targetPath, '.nameforma');

      const world = World.create(worldPath);
      const lines = [
        theme.nfNominal(`✓ Initialized world at ${worldPath}`),
        theme.nfLabel('id:')+world.id.base64,
      ];
      this.writeOut(lines.join('\n'));
    } catch (err) {
      this.writeErr(theme.nfAttend(
        `Failed to initialize world: ${err instanceof Error ? err.message : String(err)}`,
      ));
    }
  }

  registerInitCommand(): void {
    this.cmdDelegate
      .command('init')
      .description('Initialize NameForma environment')
      .argument('[path]', 'Directory to initialize (defaults to current directory)')
      .action(this.nfInit);
  }

}
