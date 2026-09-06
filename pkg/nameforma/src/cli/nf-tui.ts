import {
  TUI,
  Text,
  Input,
  ProcessTerminal,
  type Component,
  type Focusable,
} from '@earendil-works/pi-tui';
import { Unicode } from '@sc-voice/tools/text';

type Channel = 'stdout' | 'stderr' | string;

const { NO_COLOR, BRIGHT_CYAN, BRIGHT_RED } = Unicode.LINUX_COLOR;
const { RESET } = Unicode.LINUX_STYLE;

function stringify(arg: unknown): string {
  if (arg instanceof Error) return arg.message ?? arg.stack ?? String(arg);
  if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
  return String(arg);
}

/*
 * Generic multi-channel renderer that can be mapped to stdout/stderr
 * as well as named channels
 */
export interface IRenderer {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  logTo(channel: Channel, ...args: unknown[]): void;
}

/*
 * Renderer for application Read-Eval-Print-Loop (REPL)
 */
export interface IReplRenderer extends IRenderer {
  start(): void;
  stop(): void;
  readLine(): Promise<string>;
  clearErrors(): void;
}

/*
 * Renderer for shell Command Line Interface (CLI)
 */
export class CliRenderer implements IRenderer {
  log(...args: unknown[]): void {
    console.log(args.map(stringify).join(' '));
  }

  error(...args: unknown[]): void {
    console.error(args.map(stringify).join(' '));
  }

  logTo(channel: Channel, ...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    if (channel === 'stderr') {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}

class PromptInput implements Component, Focusable {
  readonly input: Input;

  get focused(): boolean {
    return this.input.focused;
  }
  set focused(v: boolean) {
    this.input.focused = v;
  }

  constructor(private prompt: string) {
    this.input = new Input();
    this.input.setValue('');
  }

  handleInput(data: string): void {
    this.input.handleInput(data);
  }
  invalidate(): void {
    this.input.invalidate();
  }

  render(width: number): string[] {
    const lines = this.input.render(
      Math.max(1, width - this.prompt.length),
    );
    return lines.map((line, i) => (i === 0 ? this.prompt + line : line));
  }
}

export class ReplRenderer implements IReplRenderer {
  private tui: TUI;
  private scrollText: Text;
  private watchText: Text;
  private errorText: Text;
  private promptInput: PromptInput;
  private scrollLines: string[] = [];
  private errorLines: string[] = [];
  private resolveInput?: (value: string) => void;

  constructor() {
    this.scrollText = new Text('', 0);
    this.watchText = new Text('(watch...)', 0);
    this.errorText = new Text('', 0);
    this.promptInput = new PromptInput('nf');
    this.tui = new TUI(new ProcessTerminal());
    this.tui.addChild(this.scrollText);
    this.tui.addChild(this.watchText);
    this.tui.addChild(this.errorText);
    this.tui.addChild(this.promptInput);

    this.promptInput.input.onSubmit = (value) => {
      this.promptInput.input.setValue('');
      this.tui.requestRender();
      if (this.resolveInput) {
        const resolve = this.resolveInput;
        this.resolveInput = undefined;
        resolve(value);
      }
    };

    this.promptInput.input.onEscape = () => {
      if (this.resolveInput) {
        const resolve = this.resolveInput;
        this.resolveInput = undefined;
        resolve('/exit');
      }
    };

    this.tui.addInputListener((data) => {
      if (data === '\x03') {
        if (this.resolveInput) {
          const resolve = this.resolveInput;
          this.resolveInput = undefined;
          resolve('/exit');
        }
        return { consume: true };
      }
      return undefined;
    });
  }

  static started: boolean = false;

  start(): void {
    if (ReplRenderer.started) {
      console.log(
        BRIGHT_CYAN,
        '[nf-tui123] extra start() ignored',
        NO_COLOR,
      );
      return;
    }
    ReplRenderer.started = true;
    this.tui.start();
    this.tui.setFocus(this.promptInput);
    this.tui.requestRender();
  }

  stop(): void {
    this.tui.stop();
  }

  readLine(): Promise<string> {
    return new Promise((resolve) => {
      this.resolveInput = resolve;
      this.tui.requestRender();
    });
  }

  log(...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    this.scrollLines.push(line);
    if (this.scrollLines.length > 200) this.scrollLines.shift();
    this.scrollText.setText(this.scrollLines.join('\n'));
    this.tui.requestRender();
  }

  error(...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    this.errorLines.push(line);
    if (this.errorLines.length > 10) this.errorLines.shift();
    this.errorText.setText(
      `${BRIGHT_RED}${this.errorLines.join('\n')}${RESET}`,
    );
    this.tui.requestRender();
  }

  clearErrors(): void {
    this.errorLines = [];
    this.errorText.setText('');
    this.tui.requestRender();
  }

  logTo(channel: Channel, ...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    if (channel === 'watch') {
      this.watchText.setText(line);
    } else {
      this.scrollLines.push(line);
      if (this.scrollLines.length > 200) this.scrollLines.shift();
      this.scrollText.setText(this.scrollLines.join('\n'));
    }
    this.tui.requestRender();
  }
}

export class TestReplRenderer implements IReplRenderer {
  scrollLines: string[] = [];
  errorLines: string[] = [];
  private inputQueue: string[] = [];
  private resolveRead?: (value: string) => void;

  feedLine(line: string): void {
    if (this.resolveRead) {
      const resolve = this.resolveRead;
      this.resolveRead = undefined;
      resolve(line);
    } else {
      this.inputQueue.push(line);
    }
  }

  readLine(): Promise<string> {
    if (this.inputQueue.length > 0) {
      return Promise.resolve(this.inputQueue.shift()!);
    }
    return new Promise((resolve) => {
      this.resolveRead = resolve;
    });
  }

  start(): void {}
  stop(): void {}
  clearErrors(): void {
    this.errorLines = [];
  }

  log(...args: unknown[]): void {
    this.scrollLines.push(args.map(String).join(' '));
  }

  error(...args: unknown[]): void {
    this.errorLines.push(args.map(String).join(' '));
  }

  logTo(_channel: string, ...args: unknown[]): void {
    this.scrollLines.push(args.map(String).join(' '));
  }
}

class NameformaTui {
  private channels: Map<Channel, string[]> = new Map();
  private renderer: IRenderer = new CliRenderer();

  setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  private append(channel: Channel, line: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, []);
    }
    this.channels.get(channel)!.push(line);
  }

  log(...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    this.append('stdout', line);
    this.renderer.log(line);
  }

  error(...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    this.append('stderr', line);
    this.renderer.error(line);
  }

  logTo(channel: Channel, ...args: unknown[]): void {
    const line = args.map(stringify).join(' ');
    this.append(channel, line);
    this.renderer.logTo(channel, line);
  }

  getChannel(channel: Channel): string[] {
    return this.channels.get(channel) ?? [];
  }

  clearChannel(channel: Channel): void {
    this.channels.set(channel, []);
  }

  clearAll(): void {
    this.channels.clear();
  }
}

export const nfTui = new NameformaTui();
