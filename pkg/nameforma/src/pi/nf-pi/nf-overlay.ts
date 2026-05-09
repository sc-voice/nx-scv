import type { Theme } from '@mariozechner/pi-coding-agent';
import type { Focusable, TUI } from '@mariozechner/pi-tui';
import { LineRenderer } from '../../line-renderer.js';
import type { IRenderable, RenderDetail } from '../../navigable-view.js';
import type { Forma } from '../../forma.js';
import { ZenoCoord } from '../../navigable-view.js';
import { EventEmitter } from 'events';
import { NfSession } from './nf-session.js';

export class NfOverlay implements Focusable {
  focused = false;
  private lines: string[] = [];
  private anchor: IRenderable | null = null;
  private pivot: Forma | null = null;
  private detail: RenderDetail | number = 0;
  private renderer = new LineRenderer();

  constructor(
    public tui: TUI,
    private theme: Theme,
    private done: () => void,
    private events: EventEmitter,
    initialDetail: RenderDetail | number = 0,
  ) {
    this.detail = initialDetail;
    this.anchor = NfSession.shared.anchor;
    this.pivot = NfSession.shared.pivot;
    this.update();
    this.events.on('tick', this.update);
  }

  private renderContent(): string[] {
    if (!this.anchor) {
      return ['(no anchor)'];
    }

    const renderData = this.anchor.asRenderData(
      this.detail,
      this.pivot ?? undefined,
    );
    return this.renderer.render(renderData);
  }

  private update = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const zeno = ZenoCoord.fromRenderDetail(this.detail);
    const zenoStr = 'detail@' + zeno.anchorStep + '/' + zeno.pivotStep;
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

  setAnchor(value: IRenderable): void {
    this.anchor = value;
    this.update();
    this.tui.requestRender();
  }

  setPivot(value: Forma): void {
    this.pivot = value;
    this.update();
    this.tui.requestRender();
  }

  zoom(detailIncrement: number): void {
    this.detail = (this.detail as number) + detailIncrement;
    this.update();
    this.tui.requestRender();
  }

  invalidate(): void {
    this.update();
    this.tui.requestRender();
  }

  dispose(): void {
    this.events.off('tick', this.update);
  }

  handleInput(data: string): void {
    if (data === '\x1b' || data === 'q' || data === 'Q') {
      this.done();
    }
  }
}
