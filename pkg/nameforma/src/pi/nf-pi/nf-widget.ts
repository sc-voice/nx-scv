import type { Theme } from '@mariozechner/pi-coding-agent';
import { LineRenderer } from '../../line-renderer.js';
import type {
  IView,
  IRenderable,
  RenderDetail,
  RenderData,
} from '../../navigable-view.js';
import type { Forma } from '../../forma.js';

import { ZenoCoord } from '../../navigable-view.js';
import { NfSession } from './nf-session.js';

export class NfWidget {
  private lines: string[] = [];
  private renderer = new LineRenderer();
  public detail: RenderDetail | number = 0;

  constructor(
    private theme: Theme,
    private key: string,
    private onInvalidate: () => void,
    initialDetail: RenderDetail | number = 0,
  ) {
    this.detail = initialDetail;
    this.update();
    NfSession.shared.on('tick', this.update);
  }

  get anchor(): IRenderable | null {
    return NfSession.shared.anchor;
  }

  get pivot(): Forma | null {
    return NfSession.shared.pivot;
  }

  get zenoCoord(): ZenoCoord {
    return ZenoCoord.fromRenderDetail(this.detail);
  }

  private renderContent(): string[] {
    if (!this.anchor) {
      return ['(no anchor)'];
    }

    const renderData = this.anchor.asRenderData(NfSession.shared.view);
    return this.renderer.render(renderData);
  }

  private update = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour12: false });
    const detailStr = (this.detail as number).toFixed(1);
    const zeno = ZenoCoord.fromRenderDetail(this.detail);
    const zenoStr = zeno.anchorStep + '/' + zeno.pivotStep;
    const worldName = NfSession.shared.world?.name || 'nameforma';
    const worldId = NfSession.shared.world?.id.timeId() || '';
    const header = this.theme.fg(
      'accent',
      `${worldName} ${worldId}▸${zenoStr} ${timeStr}`,
    );
    const contentLines = this.renderContent();
    this.lines = [header, ...contentLines];
    this.onInvalidate();
  };

  private renderDataToLines(
    data: RenderData,
    indent: string = '',
  ): string[] {
    const lines: string[] = [];

    if (typeof data === 'string') {
      lines.push(`${indent}${data}`);
    } else if (typeof data === 'number') {
      lines.push(`${indent}${data}`);
    } else if (typeof data === 'boolean') {
      lines.push(`${indent}${data}`);
    } else if (Array.isArray(data)) {
      data.forEach((item) => {
        lines.push(...this.renderDataToLines(item, indent));
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && !Array.isArray(value)) {
          lines.push(`${indent}${key}:`);
          lines.push(...this.renderDataToLines(value, indent + '  '));
        } else {
          lines.push(`${indent}${key}: ${this.valueToString(value)}`);
        }
      });
    }

    return lines;
  }

  private valueToString(value: any): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  }

  getContent(): string[] {
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

  observe(): void {
    // Widget is already observing via the tick event
  }

  dispose(): void {
    NfSession.shared.off('tick', this.update);
  }
}
