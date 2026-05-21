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
  new Operation('add-task',
    'Add a new Task',
    ['name', 'summary']),
  new Operation('add-action', 
    'Add a new Action to focused Task', 
    ['name', 'summary', ]),
  new Operation('add-reference', 
    'Add a new Reference to focused Task', 
    ['name', 'summary', 'relevance', 'source']),
  new Operation('focus', 'Focus a task', ['fuzzy_id'] ),
  new Operation('unfocus', 'Focus a task', ['fuzzy_id'] ),
  new Operation('task', 'Get current task', [] ),
  new Operation('rename', 'Rename a forma with given value', 
    ['fuzzy_id', 'value']),
  new Operation('set_action_status', 
    'Set action status and statusNote values',
    ['fuzzy_id', 'actionStatus', 'statusNote'] ),
  new Operation('set_field_value', 'Set a Forma field value', 
    ['fuzzy_id', 'field', 'value']),
  new Operation('get', 'Get JSON for a Forma', ['fuzzy_id']), 
];

const opNames = [
  ...operations.map(op=>op.name),
];
const opDescriptions = JSON.stringify(
  operations.map(op=>op.description),
)

export function validateParams(operation: string, params: any): void {
  const op = operations.find(o => o.name === operation);

  if (!op) {
    throw new Error(`Unknown operation: ${operation}`);
  }

  const missing = op.required_parameters.filter((param: string) =>
    params[param] == null || params[param] === 'null'
  );

  if (missing.length > 0) {
    throw new Error(`Missing required parameters for ${operation}: ${missing.join(', ')}`);
  }
}

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
    actionStatus: Type.Optional(
      StringEnum(['req', 'spec', 'work', 'test', 'manage', 'done'], {
        description: 'action status workflow states',
      }),
    ),
    statusNote: Type.Optional(
      Type.String({
        description: 'Details of status change',
      }),
    ),
    debug: Type.Optional(
      StringEnum(['--debug'], {
        description: 'Include [DEBUG] output',
      }),
    ),
    name: Type.Optional(
      Type.String({
        description: 'Short title of summary (required for add)',
      }),
    ),
    summary: Type.Optional(
      Type.String({
        description: 'Detailed description (required for add)',
      }),
    ),
    link: Type.Optional(
      Type.String({
        description: 'Source URI for references',
      }),
    ),
    relevance: Type.Optional(
      Type.Number({
        description: 'Relevance score from 0:not-relevant to 1:highly-relevant',
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
        actionStatus,
        debug,
        field, 
        forma,
        fuzzy_id, 
        link, 
        name, 
        operation, 
        relevance, 
        statusNote,
        summary, 
        value, 
      } = params;

      validateParams(operation, params);

      let cmd = 'nf';

      if (operation === 'add-task') {
        cmd += ` task add` + arg(name) + arg(summary);
      } else if (operation === 'add-action') {
        cmd += ` action add` + arg(name) + arg(summary);
      } else if (operation === 'add-reference') {
        cmd += ` reference add` + arg(name) + arg(summary);
        if (link) {
          cmd += ' --source' + arg(link);
        }
        if (relevance !== undefined) {
          cmd += ` --relevance ${relevance}`;
        }
      } else if (operation === 'focus') {
        cmd += ` task focus ${fuzzy_id}`;
      } else if (operation === 'unfocus') {
        cmd += ` task unfocus ${fuzzy_id}`;
      } else if (operation === 'rename') {
        cmd += ` set ${fuzzy_id}.name` + arg(value);
      } else if (operation === 'set_action_status') {
        cmd += ` action set ${fuzzy_id} ${actionStatus} ` + arg(statusNote);
      } else if (operation === 'set_field_value') {
        cmd += ` set ${fuzzy_id}.${field}` + arg(value);
      } else if (operation === 'task') {
        cmd += ` task`;
      } else if (operation === 'get') {
        cmd += ` get ${fuzzy_id}`;
      } else {
        throw new Error(`Unsupported operation params: ${params}`);
      }

      let output = execSync(cmd, { encoding: 'utf8' });
      if (debug) {
        output += `[DEBUG] cmd: ${cmd}\n`;
        output += `[DEBUG] value: ${value} ${typeof value}\n`;
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
