/**
 * ID command handler for nameforma CLI
 * Converts words to numeronym format (e.g., FormaList -> F7t)
 * Generates UUID64 identifiers
 * Validates ID types
 */

import { execSync } from 'child_process';
import { nfTui } from './nf-tui.js';
import { validate as validateUUID } from 'uuid';
import { Identifiable } from '../identifiable.js';
import { World } from '../world.js';
import { User } from '../user.js';
import UUID64 from '../uuid64.js';
import type { GlobalOpts } from './nf-cli.js';

export default class IdCommand {
  /**
   * Validate an ID and return its type
   * @param id - The ID to validate
   * @returns 'numeronym', 'UUID64', or 'UUIDv7'
   * @throws Error if ID type is unknown
   */
  static validateId(id: string): string {
    // Check if it's a UUID (v7 format or UUID64 base64)
    if (validateUUID(id)) {
      // If it matches UUIDv7 format (version 7 in the version field)
      if (
        id.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
      ) {
        return 'UUIDv7';
      }
      // Otherwise it's a valid UUID
      return 'UUID64';
    }

    // Check if it's a UUID64 base64 string
    if (UUID64.validate(id)) {
      return 'UUID64';
    }

    // Check if it's a numeronym (format: X#Y where X is letter, # is digits, Y is letter)
    if (id.match(/^[a-zA-Z]\d+[a-z]$/)) {
      return 'numeronym';
    }

    throw new Error(`unknown id: ${id}`);
  }

  /**
   * Register id command
   * @param {Command} cmd - Commander command object
   * @param {Function} getGlobalOpts - Closure that returns global options
   */
  static registerCommand(cmd: any, getGlobalOpts: () => GlobalOpts) {
    // id [words...]
    cmd
      .argument('[words...]', 'Words to convert to numeronym format')
      .option('-n, --numeronym', 'Return numeronyms of all words')
      .option('-u, --uuid64', 'Validate UUID64 or generate if no args')
      .option('-7, --uuidv7', 'Generate a new UUIDv7 identifier')
      .option('-v, --validate', 'Validate an ID and return its type')
      .option('-g, --generate [count]', 'Generate N UUIDs (default: 1)')
      .option('-s, --save', 'Save numeronym to world')
      .option('-i, --inspect', 'Inspect a numeronym, UUID64 or UUIDv7')
      .option('--user <user>', 'Generate UUID64 for user')
      .option('--git-user', 'Generate UUID64 for current git user')
      .option('--git-email', 'Generate UUID64 for current git user email')
      .option('--git-observed <commit>', 'Generate UUID64 for git commit observation')
      .action((words: string[], options: any, cmd: any) => {
        const world = getGlobalOpts().world;
        try {
          // If --user flag is set, generate UUID64 for user
          if (options.user) {
            const user = new User(undefined, options.user);
            const uuid = user.generateUUID64();
            nfTui.log(uuid.base64);
            return;
          }

          // If --git-user flag is set, generate UUID64 for git user name
          if (options.gitUser) {
            const gitUserName = execSync('git config user.name', {
              encoding: 'utf-8',
            }).trim();
            const user = new User(undefined, gitUserName);
            const uuid = user.generateUUID64();
            nfTui.log(uuid.base64);
            return;
          }

          // If --git-email flag is set, generate UUID64 for git user email
          if (options.gitEmail) {
            const gitUserEmail = execSync('git config user.email', {
              encoding: 'utf-8',
            }).trim();
            const user = new User(gitUserEmail);
            const uuid = user.generateUUID64();
            nfTui.log(uuid.base64);
            return;
          }

          // If --git-observed flag is set, generate UUID64 for git commit observation
          if (options.gitObserved) {
            const json = UUID64.forGitObserved(options.gitObserved);
            nfTui.log(JSON.stringify(json));
            return;
          }

          // If --inspect flag is set, inspect the ID or generate and inspect new UUID64
          if (options.inspect) {
            let uuid: UUID64;

            if (words && words.length > 0) {
              // Inspect provided ID
              if (words.length > 1) {
                nfTui.error('✗ Error: Single ID expected for inspection');
                process.exit(1);
              }

              // Check if it's a numeronym first
              if (Identifiable.isNumeronym(words[0])) {
                const numeronymMap = world.getNumeronym();
                const word = numeronymMap.get(words[0]);

                nfTui.log(`Type: numeronym`);
                nfTui.log(`Value: ${words[0]}`);
                if (word) {
                  nfTui.log(`Word: ${word}`);
                }
              } else {
                // Try to parse as UUID
                try {
                  uuid = UUID64.fromString(words[0]);
                  const inputId = words[0];
                  nfTui.log(
                    `Format:    ${inputId.includes('-') ? 'UUIDv7' : 'UUID64 base64'}`,
                  );
                  nfTui.log(`Base64:    ${uuid.base64}`);
                  nfTui.log(`UUID:      ${uuid.asV7()}`);
                  nfTui.log(`Timestamp: ${uuid.toDate().toISOString()}`);
                  nfTui.log(`Sequence:  ${uuid.getSequence()}`);
                } catch (err: any) {
                  nfTui.error(`✗ Error: ${err.message}`);
                  process.exit(1);
                }
              }
            } else {
              // Generate new UUID64 and inspect it
              uuid = new UUID64();
              nfTui.log(`Format:    UUID64 base64`);
              nfTui.log(`Base64:    ${uuid.base64}`);
              nfTui.log(`UUID:      ${uuid.asV7()}`);
              nfTui.log(`Timestamp: ${uuid.toDate().toISOString()}`);
              nfTui.log(`Sequence:  ${uuid.getSequence()}`);
            }
            return;
          }

          // If --save flag is set with --numeronym, save and generate numeronym
          if (options.save) {
            if (!options.numeronym) {
              nfTui.error(
                '✗ Error: -n/--numeronym required with -s/--save',
              );
              process.exit(1);
            }
            if (!words || words.length === 0) {
              nfTui.error(
                '✗ Error: Word required for numeronym generation',
              );
              process.exit(1);
            }
            if (words.length > 1) {
              nfTui.error(
                '✗ Error: Single word expected for numeronym generation',
              );
              process.exit(1);
            }

            const word = words[0];
            const numeronym = Identifiable.numeronym(word);
            if (numeronym === undefined) {
              nfTui.error(
                `✗ Error: cannot create valid numeronym from "${word}"`,
              );
              process.exit(1);
            }

            // Save to world
            const numeronymMap = world.getNumeronym();
            numeronymMap.set(numeronym, word);
            world.setNumeronym(numeronymMap);
            world.save();

            nfTui.log(numeronym);
            return;
          }

          // If --generate flag is set, generate N UUIDs
          if (options.generate !== undefined) {
            const count =
              options.generate === true ? 1 : Number(options.generate);
            if (isNaN(count) || count < 0) {
              nfTui.error(
                `✗ Error: invalid count for -g: ${options.generate}`,
              );
              process.exit(1);
            }
            for (let i = 0; i < count; i++) {
              const uuid = new UUID64();
              nfTui.log(uuid.base64);
            }
            return;
          }
          // If --validate flag is set, validate the ID
          if (options.validate) {
            if (!words || words.length === 0) {
              nfTui.error('✗ Error: ID required for validation');
              process.exit(1);
            }
            if (words.length > 1) {
              nfTui.error('✗ Error: Single ID expected for validation');
              process.exit(1);
            }
            const idType = IdCommand.validateId(words[0]);
            nfTui.log(idType);
            return;
          }

          // If --uuid64 flag is set, validate/convert ID or generate new UUID64
          if (options.uuid64) {
            if (words && words.length > 0) {
              // Validate and show details of the provided UUID64
              if (words.length > 1) {
                nfTui.error('✗ Error: Single UUID64 expected');
                process.exit(1);
              }
              try {
                const uuid = UUID64.fromString(words[0]);
                nfTui.log(
                  `Format:    ${words[0].includes('-') ? 'UUIDv7' : 'UUID64 base64'}`,
                );
                nfTui.log(`Base64:    ${uuid.base64}`);
                nfTui.log(`UUID:      ${uuid.asV7()}`);
                nfTui.log(`Timestamp: ${uuid.toDate().toISOString()}`);
                nfTui.log(`Sequence:  ${uuid.getSequence()}`);
              } catch (err: any) {
                nfTui.error(`✗ Error: ${err.message}`);
                process.exit(1);
              }
            } else {
              // Generate new UUID64
              const uuid = new UUID64();
              nfTui.log(uuid.base64);
            }
            return;
          }

          // If --uuidv7 flag is set, generate a new UUIDv7
          if (options.uuidv7) {
            const uuid = new UUID64();
            nfTui.log(uuid.asV7());
            return;
          }

          // Handle when no words provided
          if (!words || words.length === 0) {
            // Default: generate UUID64
            const uuid = new UUID64();
            nfTui.log(uuid.base64);
            return;
          }

          // If --numeronym or -n flag is set, convert all words and show them
          if (options.numeronym) {
            const numeronyms = words.map((word) => {
              const numeronym = Identifiable.numeronym(word);
              if (numeronym === undefined) {
                throw new Error(
                  `cannot create valid numeronym from "${word}"`,
                );
              }
              return numeronym;
            });
            nfTui.log(numeronyms.join(' '));
          } else {
            // Default: single word conversion or return numeronym as-is
            if (words.length > 1) {
              nfTui.error(
                '✗ Error: Single word expected. Use --numeronym to convert multiple words',
              );
              process.exit(1);
            }

            // Try to identify if it's a numeronym
            if (Identifiable.isNumeronym(words[0])) {
              // It's a numeronym - return it as-is
              nfTui.log(words[0]);
            } else {
              // Try to convert to numeronym
              try {
                const numeronym = Identifiable.numeronym(words[0]);
                if (numeronym === undefined) {
                  // Result is not a valid numeronym, just echo back the input
                  nfTui.log(words[0]);
                } else {
                  nfTui.log(numeronym);
                }
              } catch (err: any) {
                // If conversion fails, just echo back the input
                nfTui.log(words[0]);
              }
            }
          }
        } catch (err: any) {
          nfTui.error(`✗ Error: ${err.message}`);
          process.exit(1);
        }
      });
  }
}
