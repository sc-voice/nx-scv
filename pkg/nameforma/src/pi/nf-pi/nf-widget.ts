import type { Theme } from '@earendil-works/pi-coding-agent';
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
  private renderer!: LineRenderer;
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
    const zeno = ZenoCoord.fromRenderDetail(this.detail);
    this.renderer = new LineRenderer({
      zenoStep: zeno.anchorStep,
    });
    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour12: false });
    const detailStr = (this.detail as number).toFixed(1);
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

    // Check if data is RenderRow[] (array of arrays) or RenderRow (array of cells)
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      // RenderRow[]: array of rows
      for (const row of data) {
        lines.push(indent + this.rowToString(row));
      }
    } else {
      // RenderRow: single row of cells
      lines.push(indent + this.rowToString(data));
    }

    return lines;
  }

  private rowToString(row: any): string {
    return row
      .map((cell: any) => this.cellToString(cell))
      .join(' ');
  }

  private cellToString(cell: any): string {
    if (typeof cell === 'string') return cell;
    if (typeof cell === 'number') return cell.toString();
    if (typeof cell === 'boolean') return cell.toString();
    if (cell?.label) return `${cell.label}:${cell.value}`;
    return String(cell);
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
