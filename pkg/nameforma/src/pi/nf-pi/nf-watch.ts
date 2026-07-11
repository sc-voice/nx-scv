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
  private _active: boolean;
  private _theme: ReturnType<typeof NameFormaTheme.load>;
  private _renderer: any;
  private _ctx: any;
  private _invalidateInterval: NodeJS.Timeout | null = null;
  private _validateInterval: NodeJS.Timeout | null = null;
  private _lines: string[] = [];
  private _bias: number;

  constructor(ctx: any) {
    this._ctx = ctx;
    this._active = true;
    this._theme = NameFormaTheme.load();
    this._bias = 0;
    this.startTimers();
  }

  private startTimers(): void {
    const view = NfSession.shared.view;

    this._invalidateInterval = setInterval(() => {
      view.invalidate();
    }, 1000);

    this._validateInterval = setInterval(() => {
      view.validate(() => this.update());
    }, 200);
  }

  private stopTimers(): void {
    if (this._invalidateInterval) clearInterval(this._invalidateInterval);
    if (this._validateInterval) clearInterval(this._validateInterval);
    this._invalidateInterval = null;
    this._validateInterval = null;
  }

  public async start(): Promise<void> {
    if (!this._active) {
      this._active = true;
      this.startTimers();
    }
  }

  public async stop(): Promise<void> {
    if (this._active) {
      this._active = false;
      this.stopTimers();
    }
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
    return this._renderer.render(renderData);
  }

  private async update(): Promise<void> {
    if (!this._active) {
      return;
    }
    const { _theme: theme } = this;
    const { notify } = this._ctx.ui;
    const { world, view } = NfSession.shared;
    const { namespace: ns } = view;
    if (world == null) {
      notify('world?');
      return;
    }
    const { maxLines, detail, anchor, pivot } = view;
    const zeno = view.zenoCoord;
    this._renderer = new LineRenderer({
      theme,
      lines: maxLines,
      zenoStep: zeno.anchorStep,
    });
    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour12: false });
    const zenoStr = 'Z' + zeno.anchorStep + '/' + zeno.pivotStep;
    /* await */ world.syncRepository();
    const worldName = world.name || 'name?';
    const worldId = world.id.timeId() || 'id?';
    const w3d = ns.getForma(world.id.base64);
    const header = [
      theme.nfBoundary(`${timeStr} NfWatch`),
      theme.nfLabel(`anchor`),
      theme.nfLink(ns.fuzzyIdOf(anchor)),
      w3d == null ? 'null' : w3d.id.base64 === world.id.base64,
      theme.nfLabel(`pivot`),
      (pivot && ns.fuzzyIdOf(pivot)) ?? theme.nfNote('null'),
      theme.nfLabel('lines'),
      `${maxLines}@${detail}`,
      theme.nfNote(zenoStr),
    ].join(' ');

    const contentLines = this.renderContent();
    this._lines = [header, ...contentLines];
    notify(this._lines.join('\n'));
  }
}
