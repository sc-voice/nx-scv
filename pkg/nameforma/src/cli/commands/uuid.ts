/**
 * UUID command handler for nameforma CLI
 * Supports: generate UUID64 base64 strings
 */

import UUID64 from '../../uuid64.js';

export default class UUIDCommand {
  /**
   * Register uuid subcommands
   * @param {Command} cmd - Commander command object
   */
  static register(cmd: any) {
    // uuid generate
    cmd
      .command('generate')
      .alias('gen')
      .description('Generate a UUID64 base64 string')
      .option('-c, --count <n>', 'Generate N UUIDs', (val: string) => parseInt(val, 10), 1)
      .action((options: any) => {
        const count = Math.max(1, options.count);

        if (count === 1) {
          const uuid = new UUID64();
          console.log(uuid.base64);
        } else {
          for (let i = 0; i < count; i++) {
            const uuid = new UUID64();
            console.log(uuid.base64);
          }
        }
      });

    // uuid validate
    cmd
      .command('validate <input>')
      .description('Validate a UUID64 string or UUID string')
      .action((input: string) => {
        try {
          const isValid = UUID64.validate(input);
          if (isValid) {
            console.log(`✓ Valid UUID64: ${input}`);
            // Try to create instance to show it works
            const uuid = UUID64.fromString(input);
            console.log(`  Format:    ${input.includes('-') ? 'UUIDv7' : 'UUID64 base64'}`);
            console.log(`  Base64:    ${uuid.base64}`);
            console.log(`  UUID:      ${uuid.asV7()}`);
            console.log(`  Timestamp: ${uuid.toDate().toISOString()}`);
            console.log(`  Sequence:  ${uuid.getSequence()}`);
          } else {
            console.error(`✗ Invalid UUID64: ${input}`);
            process.exit(1);
          }
        } catch (err: any) {
          console.error(`✗ Error validating UUID64: ${err.message}`);
          process.exit(1);
        }
      });

    // uuid convert
    cmd
      .command('convert <input>')
      .description('Convert between UUID64 base64 and UUIDv7 formats')
      .action((input: string) => {
        try {
          const uuid = UUID64.fromString(input);
          console.log(`UUID64 base64: ${uuid.base64}`);
          console.log(`UUIDv7 string: ${uuid.asV7()}`);
          console.log(`Timestamp:     ${uuid.toDate().toISOString()}`);
        } catch (err: any) {
          console.error(`✗ Error converting UUID: ${err.message}`);
          process.exit(1);
        }
      });
  }
}
