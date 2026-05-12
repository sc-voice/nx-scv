import {
  RenderData,
  RenderDetail,
  IRenderable,
  IView,
  ICursor,
  CursorType,
  ZenoCoord,
} from './navigable-view.js';
import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import { World } from './world.js';
import { nfTui } from './cli/nf-tui.js';
import type { IRegistry } from './registry.js';

/**
 * A simple implementation of IView for prototyping.
 */
export class WorldView implements IView {
  readonly world: World;
  readonly channel: string;

  constructor(world: World, channel: string = 'watch') {
    this.world = world;
    this.channel = channel;
    this._detail = RenderDetail.Row;
  }

  private _anchor: IRegistry | null = null;
  get anchor(): IRegistry {
    return this._anchor!;
  }
  private set anchor(value: IRegistry | null) {
    this._anchor = value;
  }

  private _pivot: Forma | null = null;
  get pivot(): Forma {
    return this._pivot!;
  }
  private set pivot(value: Forma | null) {
    this._pivot = value;
  }

  private _detail: RenderDetail | number = 0;
  get detail(): number {
    return this._detail;
  }
  private set detail(value: RenderDetail | number) {
    this._detail = value;
  }

  get zenoCoord(): ZenoCoord {
    return ZenoCoord.fromRenderDetail(this._detail);
  }

  private _primaryAxis: IRenderable[] = [];
  private _cursor: ICursor | null = null;

  setAnchor(value: IRegistry): void {
    this.anchor = value;
    this.pivot = null;
  }

  setPivot(value: Forma): void {
    if (!this.anchor) throw new Error('No anchor set!');
    this.pivot = value;
  }

  zoomTo(zeno: ZenoCoord): void {
    this._detail = zeno.toRenderDetail();
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
