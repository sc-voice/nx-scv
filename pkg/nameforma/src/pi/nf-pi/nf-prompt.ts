import type { Theme } from '@mariozechner/pi-coding-agent';
import type { Focusable, TUI } from '@mariozechner/pi-tui';
import { LineRenderer } from '../../line-renderer.js';
import type { RenderDetail } from '../../navigable-view.js';
import { ZenoCoord, RenderDetail as RD } from '../../navigable-view.js';
import { WorldView } from '../../world-view.js';
import type { Forma } from '../../forma.js';
import type { World } from '../../world.js';
import type { IRegistry } from '../../registry.js';
import { NfSession } from './nf-session.js';

export class NfPrompt implements Focusable {
  focused = false;
  private lines: string[] = [];
  private view: WorldView;
  private renderer!: LineRenderer;
  private inputBuffer: string = '';

  constructor(
    public tui: TUI,
    private theme: Theme,
    private done: () => void,
    world?: World,
    anchor?: IRegistry,
    pivot?: Forma | null,
  ) {
    const usingShared = !world && !anchor && pivot === undefined;
    const w = world || NfSession.shared.world;
    const a = anchor || NfSession.shared.view.anchor;
    const p = pivot !== undefined ? pivot : NfSession.shared.view.pivot;

    this.view = new WorldView(w, 'nf-prompt');
    this.view.setAnchor(a);
    if (p) {
      this.view.setPivot(p);
    }
    this.update();
    if (usingShared) {
      NfSession.shared.on('tick', this.update);
    }
  }

  private processInputSequence(input: string): void {
    const coord = this.view.zenoCoord;
    let newCoord: ZenoCoord | null = null;

    if (input === 'zo') {
      if (coord.anchorStep < ZenoCoord.MAX_ZENO_STEP) {
        newCoord = new ZenoCoord((coord.anchorStep + 1) as any, 0 as any);
      }
    } else if (input === 'zc') {
      if (coord.anchorStep > 0) {
        newCoord = new ZenoCoord((coord.anchorStep - 1) as any, 0 as any);
      }
    }

    if (newCoord) {
      this.view.zoomTo(newCoord);
      this.update();
      this.tui.requestRender();
    }
  }

  private renderContent(): string[] {
    if (!this.view.anchor) {
      return ['(no anchor)'];
    }

    const renderData = this.view.anchor.asRenderData(this.view);
    return this.renderer.render(renderData);
  }

  private update = () => {
    this.renderer = new LineRenderer({
      zenoStep: this.view.zenoCoord.anchorStep,
    });
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const zenoStr =
      'detail@' +
      this.view.zenoCoord.anchorStep +
      '/' +
      this.view.zenoCoord.pivotStep;
    const header = this.theme.fg(
      'accent',
      `pi-nameforma ${timeStr} ${zenoStr}`,
    );
    const contentLines = this.renderContent();
    this.lines = [header, ...contentLines];
    this.tui.requestRender();
  };

  render(_width: number): string[] {
    return this.lines.map((line, index) => {
      if (index === 0) {
        return `╭ ${line}`;
      } else if (index === this.lines.length - 1) {
        return `╰ ${line}`;
      } else {
        return `│ ${line}`;
      }
    });
  }

  setAnchor(value: IRegistry): void {
    this.view.setAnchor(value);
    this.update();
    this.tui.requestRender();
  }

  setPivot(value: any): void {
    this.view.setPivot(value);
    this.update();
    this.tui.requestRender();
  }

  invalidate(): void {
    this.update();
    this.tui.requestRender();
  }

  dispose(): void {
    NfSession.shared.off('tick', this.update);
  }

  handleInput(data: string): void {
    if (data === '\x1b' || data === 'q' || data === 'Q') {
      this.done();
      return;
    }

    this.inputBuffer += data;

    // Check for recognized sequences
    if (this.inputBuffer === 'zo' || this.inputBuffer === 'zc') {
      this.processInputSequence(this.inputBuffer);
      this.inputBuffer = '';
    } else if (
      this.inputBuffer.length > 2 ||
      !this.inputBuffer.match(/^[zoc]*$/)
    ) {
      // Reset if buffer exceeds expected length or contains invalid chars
      this.inputBuffer = '';
    }
  }
}
