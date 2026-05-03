import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import UUID64 from './uuid64.js';

/**
 * Rendering detail can be specified continously over the range [-1..1].
 * Values between Cell (-1) and Row (0) provide a continous range of 
 * increasing detail (e.g., -0.5) while remaining "cells".
 * Values between Row and All provide a continuous range of 
 * increasing detail (e.g., 0.5) while remaining "row/rows".
 */
export const RenderDetail = {
  Cell: -1,
  Row: 0,
  All: 1,
} as const;

export type RenderDetail = typeof RenderDetail[keyof typeof RenderDetail];

export type RenderData = 
  | string 
  | number 
  | boolean 
  | UUID64 
  | RenderData[] 
  | { [key: string]: RenderData };

/**
 * The entity being observed.
 * Represents a specific point of interest in the system.
 */
export interface IRenderable extends Identifiable {
  /**
   * Renders the subject into the provided renderer.
   */
  asRenderData(
    detail?: RenderDetail | number,
    pivot?: Forma,
  ): RenderData;
}

/**
 * The observer/controller.
 * Mantains the context of the observation and manages the lifecycle.
 */
export interface IView {
  readonly anchor: IRenderable;
  readonly pivot: Forma;
  readonly detail: RenderDetail | number;

  /**
   * Sets the primary subject of observation.
   */
  setAnchor(value: IRenderable): void;

  /**
   * Shifts the perspective within the existing anchor.
   */
  setPivot(value: Forma): void;

  zoom(detailIncrement: number): void;

  /**
   * Starts the observation loop/stream for a given renderer and channel.
   */
  observe(): void;
}

