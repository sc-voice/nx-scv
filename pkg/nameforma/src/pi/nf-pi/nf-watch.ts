import { NfSession } from './nf-session.js';
import { NameFormaTheme } from '../../nameforma-theme.js';
import { LineRenderer } from '../../line-renderer.js';
import type { IRenderable } from '../../navigable-view.js';
import type { Forma } from '../../forma.js';

/**
 * NfWatch class handles the observation of file system changes
 * that represent the convergence of the nf system of record.
 */
export class NfWatch {
  #active: boolean;
  #theme: ReturnType<typeof NameFormaTheme.load>;
  #renderer: any;
  #ctx: any;
  lines: string[] = [];

  constructor(ctx: any) {
    this.#ctx = ctx;
    this.#active = true;
    this.#theme = NameFormaTheme.load();
    this.update();
    NfSession.shared.on('tick', () => this.update());
  }

  public async start(): Promise<void> {
    if (!this.#active) {
      this.#active = true;
      this.update();
    }
    // TODO: Implement file system watching logic using chokidar or similar
  }

  public async stop(): Promise<void> {
    if (this.#active) {
      this.#active = false;
      this.update();
    }
    // TODO: Implement cleanup logic
  }

  get anchor(): IRenderable | null {
    return NfSession.shared.anchor;
  }

  get pivot(): Forma | null {
    return NfSession.shared.pivot;
  }

  private renderContent(): string[] {
    if (!this.anchor) {
      return ['(no anchor)'];
    }

    const renderData = this.anchor.asRenderData(NfSession.shared.view);
    return this.#renderer.render(renderData);
  }

  update = () => {
    if (!this.#active) {
      return;
    }
    const theme = this.#theme;
    const { notify } = this.#ctx.ui;
    const { world, view } = NfSession.shared;
    if (world == null) {
      notify("world?");
      return;
    }
    const zeno = view.zenoCoord;
    this.#renderer = new LineRenderer({
      theme,
      zenoStep: zeno.anchorStep,
    });
    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour12: false });
    const zenoStr = zeno.anchorStep + '/' + zeno.pivotStep;
    world.sync();
    const worldName = world.name || 'name?';
    const worldId = world.id.timeId() || 'id?';
    const header = [
      theme.nfBoundary(`${timeStr} NfWatch anchor:`),
      worldId,
      theme.nfBoundary('zeno'),
      zenoStr,
    ].join(' ');

    const contentLines = this.renderContent();
    this.lines = [header, ...contentLines];
    notify(this.lines.join('\n'));
  };

}
