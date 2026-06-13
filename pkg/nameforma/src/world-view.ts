import {
  RenderData,
  RenderDetail,
  IRenderable,
  NavigableView,
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
export class WorldView extends NavigableView {
  readonly world: World;
  readonly channel: string;

  private _primaryAxis: IRenderable[] = [];

  constructor(world: World, channel: string = 'watch') {
    super();
    this.world = world;
    this.channel = channel;
    this.setAnchor(world);
  }

  override setAnchor(value: IRegistry): void {
    super.setAnchor(value);
    this._pivot = null;
  }

  override setPivot(value: Forma): void {
    if (!this._anchor) throw new Error('No anchor set!');
    super.setPivot(value);
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
}
