import { Type } from 'typebox';
import { StringEnum } from '@earendil-works/pi-ai';
import { execSync } from 'child_process';

function arg(s: string) {
  return s ? ` "${s.replace(/"/g, '\\"')}"` : '';
}

class Operation {
  public name: string;
  public summary: string;
  public required_parameters: any;

  constructor(name:string, summary:string, required_parameters: any[]) {
    this.name = name;
    this.summary = summary;
    this.required_parameters = required_parameters;
  }

  get description(): string {
    return JSON.stringify(this);
  }
}

const operations = [
  new Operation('add', 'Add a Forma class', ['forma', 'name', 'summary']),
  new Operation('focus', 'Focus a task', ['more_less', 'fuzzy_id'] ),
  new Operation('set_field_value', 'Set a Forma field value', 
    ['forma', 'fuzzy_id', 'field', 'value']),
  new Operation('get_forma_json', 'Get JSON for a Forma', ['forma', 'fuzzy_id']), ]

const opNames = [
  ...operations.map(op=>op.name),
];
const opDescriptions = JSON.stringify(
  operations.map(op=>op.description),
)



export const nfTool = {
  name: 'nf',
  label: 'Nameforma',
  description: 'Manage nameforma tasks, actions, and references',
  promptSnippet: 'Create and manage tasks, actions, and references',
  promptGuidelines: [
    'Use nf tool to create and manage tasks, actions, and references when the user asks for task management.',
  ],

  parameters: Type.Object({
    operation: StringEnum(opNames, { description: opDescriptions }),
    forma: Type.Optional(
      StringEnum(['task', 'action', 'reference'] as const, {
        description: 'Forma class (required for add operation)',
      }),
    ),
    debug: Type.Optional(
      StringEnum(['--debug'], {
        description: 'Include [DEBUG] output',
      }),
    ),
    more_less: Type.Optional(
      StringEnum(['more', 'less'], {
        description: 'Increase or decrease Forma attribute, condition or relationship',
      }),
    ),
    name: Type.Optional(
      Type.String({
        description: 'Short mnemonic identifier derived from summary',
      }),
    ),
    summary: Type.Optional(
      Type.String({
        description: 'Full description of Forma instance',
      }),
    ),
    link: Type.Optional(
      Type.String({
        description: 'Source URI for references',
      }),
    ),
    relevance: Type.Optional(
      Type.Number({
        description: 'Relevance score from 0 to 1',
      }),
    ),
    fuzzy_id: Type.Optional(
      Type.String({
        description: 'identifier for a Forma (e.g., UUID64.base64 or namespace-unique substring thereof)',
      }),
    ),
    field: Type.Optional(
      Type.String({
        description: 'Field name (for set_field_value)',
      }),
    ),
    value: Type.Optional(
      Type.String({
        description: 'Field value (for set_field_value)',
      }),
    ),
  }),

  async execute(
    toolCallId: string,
    params: any,
    signal: AbortSignal | undefined,
    onUpdate: any,
    ctx: any,
  ) {
    try {
      onUpdate?.({
        content: [{ type: 'text' as const, text: 'Running nf command...' }],
      });

      if (signal?.aborted) {
        return {
          content: [{ type: 'text' as const, text: 'Cancelled' }],
          details: { command: '', output: '' },
        };
      }

      const { 
        debug,
        field, 
        forma = 'task',
        fuzzy_id, 
        link, 
        more_less,
        name, 
        operation, 
        relevance, 
        summary, 
        value, 
      } = params;

      let cmd = 'nf';

      if (operation === 'add') {
        cmd += ` ${forma} add` + arg(name) + arg(summary);
        if (link) {
          cmd += ' --source' + arg(link);
        }
        if (relevance !== undefined) {
          cmd += ` --relevance ${relevance}`;
        }
      } else if (operation === 'focus') {
        const focusOp = more_less === 'less' ? 'unfocus' : 'focus';
        cmd += ` task ${focusOp} ${fuzzy_id}`;
      } else if (operation === 'set_field_value') {
        cmd += ` ${forma} set ${fuzzy_id}.${field}` + arg(value);
      } else if (operation === 'get_forma_json') {
        cmd += ` ${forma} get --json ${fuzzy_id}`;
      } else {
        throw new Error(`Unsupported operation params: ${params}`);
      }

      let output = execSync(cmd, { encoding: 'utf8' });
      if (debug) {
        output += `[DEBUG] cmd: ${cmd}\n`;
        output += `[DEBUG] opDescriptions: ${opDescriptions}\n`;
      }

      return {
        content: [{ type: 'text' as const, text: output.trim() }],
        details: { command: cmd, output: output.trim() },
      };
    } catch (error: any) {
      const errorMsg = error.stderr?.toString().trim() || error.message || String(error);
      throw new Error(`nf command failed: ${errorMsg}`);
    }
  },
};
