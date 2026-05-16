import {
  RenderData,
  RenderDetail,
  IRenderable,
  IView,
  ICursor,
  CursorType,
  ZenoCoord,
  type ITheme,
} from './navigable-view.js';
import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import { World } from './world.js';
import { nfTui } from './cli/nf-tui.js';
import type { IRegistry } from './registry.js';
import { NameFormaTheme } from './nameforma-theme.js';

/**
 * A simple implementation of IView for prototyping.
 */
export class WorldView implements IView {
  readonly world: World;
  readonly channel: string;

  private _anchor: IRegistry | null = null;
  private _pivot: Forma | null = null;
  private _zenoCoord: ZenoCoord;
  private _bodyIndent: string;
  private _primaryAxis: IRenderable[] = [];
  private _cursor: ICursor | null = null;
  private _theme: ITheme;

  constructor(world: World, channel: string = 'watch') {
    this.world = world;
    this.channel = channel;
    this._zenoCoord = ZenoCoord.fromRenderDetail(RenderDetail.Row);
    this._bodyIndent = '  ';
    this._theme = NameFormaTheme.load();
  }

  get anchor(): IRegistry {
    return this._anchor!;
  }

  get pivot(): Forma {
    return this._pivot!;
  }

  get zenoCoord(): ZenoCoord {
    return this._zenoCoord;
  }

  get bodyIndent(): string {
    return this._bodyIndent;
  }

  get theme(): ITheme {
    return this._theme;
  }

  setAnchor(value: IRegistry): void {
    this._anchor = value;
    this._pivot = null;
  }

  setPivot(value: Forma): void {
    if (!this._anchor) throw new Error('No anchor set!');
    this._pivot = value;
  }

  setBodyIndent(value: string): void {
    this._bodyIndent = value;
  }

  setTheme(value: ITheme): void {
    this._theme = value;
  }

  zoomTo(zeno: ZenoCoord): void {
    this._zenoCoord = new ZenoCoord(zeno.anchorStep, zeno.pivotStep);
  }

  getCursor(): ICursor {
    if (!this._cursor) {
      throw new Error('Cursor not initialized');
    }
    return this._cursor;
  }

  private extractFormas(data: RenderData): IRenderable[] {
    const formas: IRenderable[] = [];

    const traverse = (item: any) => {
      // Check if item is a Forma (IRenderable)
      if (
        item &&
        typeof item === 'object' &&
        item.id &&
        typeof item.asRenderData === 'function'
      ) {
        formas.push(item as IRenderable);
      }

      // Recurse into arrays
      if (Array.isArray(item)) {
        item.forEach(traverse);
      }
      // Recurse into objects
      else if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(traverse);
      }
    };

    traverse(data);
    return formas;
  }

  private initializeCursor(): void {
    if (this._primaryAxis.length === 0) {
      this._cursor = null;
      return;
    }

    const forma = this._primaryAxis[0] as Forma;
    this._cursor = {
      type: 'Forma' as CursorType,
      forma,
      field: null,
      formaIndex: 0,
      fieldIndex: 0,
    };
  }

  nextForma(): boolean {
    if (
      !this._cursor ||
      this._cursor.formaIndex >= this._primaryAxis.length - 1
    ) {
      return false;
    }

    this._cursor.formaIndex++;
    this._cursor.forma = this._primaryAxis[
      this._cursor.formaIndex
    ] as Forma;
    return true;
  }

  prevForma(): boolean {
    if (!this._cursor || this._cursor.formaIndex <= 0) {
      return false;
    }

    this._cursor.formaIndex--;
    this._cursor.forma = this._primaryAxis[
      this._cursor.formaIndex
    ] as Forma;
    return true;
  }

  observe(): void {
    setInterval(() => {
      nfTui.logTo(this.channel, 'WorldView.observe: TBD', new Date());
    }, 1000);
  }
}
