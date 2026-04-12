import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

/**
 * Prompt user for yes/no confirmation
 * @param {string} message - Confirmation message to display
 * @param {object} options - Optional configuration
 * @param {NodeJS.ReadableStream} options.input - Input stream (default: process.stdin)
 * @param {NodeJS.WritableStream} options.output - Output stream (default: process.stdout)
 * @returns {Promise<boolean>} - True if user types "yes", false otherwise
 */
export async function confirm(
  message: string,
  options?: {
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
  }
): Promise<boolean> {
  const rl = createInterface({
    input: options?.input || input,
    output: options?.output || output,
  });

  const answer = await rl.question(message);
  rl.close();

  return answer.toLowerCase() === 'yes';
}

/**
 * Confirm deletion of an entity
 * Displays entity details (id, name, summary) and prompts for confirmation
 * @param {object} entity - Entity to delete (must have id, name, and optional summary)
 * @param {object} options - Optional configuration (same as confirm())
 * @returns {Promise<boolean>} - True if user confirms deletion
 */
export async function confirmDelete(
  entity: any,
  options?: {
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
  }
): Promise<boolean> {
  const output_stream = options?.output || output;
  const lines: string[] = [
    `\nEntity: ${entity.id}`,
    `  name: ${entity.name}`,
  ];

  if (entity.summary) {
    lines.push(`  summary: ${entity.summary}`);
  }

  lines.forEach(line => {
    (output_stream as any).write(line + '\n');
  });

  return confirm('\nDelete this entity? (yes/no) ', options);
}
