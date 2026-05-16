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
import { Forma } from './forma.js';
import type { IRegistry } from './registry.js';
import { NameFormaTheme } from './nameforma-theme.js';

/**
 * IView implementation for viewing a specific Entity.
 * Anchor is the Entity (e.g., Task), pivot semantics not yet in effect.
 */
export class EntityView implements IView {
  private _anchor: IRegistry;
  private _pivot: Forma;
  private _zenoCoord: ZenoCoord;
  private _cursor: ICursor | null = null;
  private _bodyIndent: string;
  private _theme: ITheme;

  constructor(entity: IRegistry) {
    this._anchor = entity;
    this._pivot = entity;
    this._zenoCoord = ZenoCoord.fromRenderDetail(RenderDetail.Row);
    this._bodyIndent = '  ';
    this._theme = NameFormaTheme.load();
  }

  get anchor(): IRegistry {
    return this._anchor;
  }

  get pivot(): Forma {
    return this._pivot;
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
  }

  setPivot(value: Forma): void {
    // Pivot semantics not yet in effect for EntityView
    throw new Error('setPivot not yet supported in EntityView');
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

  observe(): void {
    // TBD
  }

  getCursor(): ICursor {
    if (!this._cursor) {
      throw new Error('Cursor not initialized');
    }
    return this._cursor;
  }
}
