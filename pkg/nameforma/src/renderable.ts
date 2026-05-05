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

const MAX_ZENO_STEP = 17;

/**
 * ZenoStep: branded integer [0..17] for stepped detail levels.
 * Uses Zeno-like convergence: detail = 1 - (8/13)^n
 */
export type ZenoStep = number & { readonly __zenoStep: unique symbol };

export function zenoStep(n: number): ZenoStep {
  if (!Number.isInteger(n) || n < 0 || n > MAX_ZENO_STEP) {
    throw new RangeError(`zenoStep: must be integer in [0,${MAX_ZENO_STEP}], got ${n}`);
  }
  return n as ZenoStep;
}

/**
 * ZenoDetail: convergence levels.
 * Formula: detail[n] = 1 - (8/13)^n
 * Ranges from 0 (n=0) to ~0.998 (n=17).
 */
const ZenoDetail: readonly number[] = Object.freeze(
  Array.from({ length: MAX_ZENO_STEP+2 }, (_, n) => 1 - Math.pow(8/13, n))
);

function fibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/**
 * ZenoLines: line-budget levels.
 * Formula: ZenoLines[n] = Fibonacci(n+2)
 */
const ZenoLines: readonly number[] = Object.freeze(
  Array.from({ length: MAX_ZENO_STEP+1 }, (_, n) => fibonacci(n + 2))
);

/**
 * ZenoCoord: value object combining anchor and pivot ZenoSteps
 * to describe a 2D coordinate in the fractal detail space.
 */
export class ZenoCoord {
  readonly anchor: ZenoStep;
  readonly pivot: ZenoStep;

  static readonly MAX_ZENO_STEP = 17;

  constructor(anchor: ZenoStep, pivot: ZenoStep) {
    this.anchor = anchor;
    this.pivot = pivot;
  }

  toRenderDetail(): number {
    const anchorDetail = zenoStepToDetail(this.anchor);
    const pivotDetail = zenoStepToDetail(this.pivot);
    const anchorDelta = ZenoDetail[this.anchor + 1] - anchorDetail;
    return anchorDetail + pivotDetail * anchorDelta;
  }

  static fromRenderDetail(detail: number): ZenoCoord {
    const anchor = detailToZenoStep(detail);
    const anchorDetail = zenoStepToDetail(anchor);
    const anchorDelta = ZenoDetail[anchor + 1] - anchorDetail;
    const FUDGE = 0.000000000000001; // overcome floating point aliasing
    const pivotDetail = anchorDelta > 0 ? (detail - anchorDetail + FUDGE) / anchorDelta : 0;
    const pivot = detailToZenoStep(pivotDetail);
    return new ZenoCoord(anchor, pivot);
  }
}

export function zenoStepToDetail(step: ZenoStep): number {
  if (step < 0 || step > MAX_ZENO_STEP) {
    throw new RangeError(`zenoStepToDetail: step ${step} out of bounds [0,${MAX_ZENO_STEP}]`);
  }
  return ZenoDetail[step];
}

export function detailToZenoStep(detail: number): ZenoStep {
  let best = 0;
  for (let i = 1; i <= MAX_ZENO_STEP; i++) {
    if (ZenoDetail[i] <= detail) {
      best = i;
    } else {
      break;
    }
  }
  return zenoStep(best);
}

export function zenoStepToLines(step: ZenoStep): number {
  if (step < 0 || step > MAX_ZENO_STEP) {
    throw new RangeError(`zenoStepToLines: step ${step} out of bounds [0,${MAX_ZENO_STEP}]`);
  }
  return ZenoLines[step];
}

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

