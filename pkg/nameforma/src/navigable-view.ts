import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import { FormaField } from './forma-field.js';
import UUID64 from './uuid64.js';
import type { IRegistry } from './registry.js';

/**
 * NameForma theme for pi-tui and nameforma cli
 * for displaying status of observables that may
 * or may not require attention
 */
export interface ITheme {
  // A label for a value
  nfLabel(text: string): string;

  // Boundary with peripheral alignment
  nfBoundary(text: string): string;

  // Identifiable and navigable
  nfTrack(text: string): string;

  // Aligned to expectations
  nfNominal(text: string): string;

  // May requires immediate attention
  nfWarn(text: string): string;

  // Requires immediate attention
  nfAttend(text: string): string;

  // Unattended and free
  nfFree(text: string): string;
}

/**
 * 3D Spatial Navigation Engine for a fractal semantic space of Forma objects.
 *
 * NameForma information is modelled as a fractal space of IRegistry 
 * instances that represent data subsets of interest. IRegistry instances 
 * are presented with IViews anchored to that instance.
 *
 * IViews present their anchors fractally as a 
 * semantically zoomable list of RenderRows.
 * RenderRows have arbitrary width that a renderer can
 * choose to render as one or more wrapped display lines according to viewport 
 * height/width constraints.
 * Each RenderRow comprises static read-only data as well as FormaFields, which
 * are potentilly mutable.
 *
 * Semantic zooming to infinite detail is specified by RenderDetail
 * over the open interval [0..1), where 0 is least detail and 1 is infinite detail.
 * RenderDetail is useful as the mathematical model for semantic zooming,
 * but is cumbersome for implementation.
 * In practice, we work with discrete ZenoSteps, which are non-negative integers (ℤ≥0)
 * that map to RenderDetail with 0 as the ZenoStep of least detail.
 * Each ZenoStep corresponds to a minimal number of displayable RenderRows:
 *
 *   ZenoStep 0: 1 terse row
 *   ZenoStep 1: 1 verbose row
 *   ZenoStep 2: 2 rows
 *   ZenoStep 3: 3 rows
 *   ZenoStep 4: 5 rows
 *   ZenoStep 5: 8 rows
 *   ...
 *   ZenoStep N: Fibonnaci(N) rows
 *
 * Renderers can wrap/clip RenderRows according to user preference.
 *
 * Two complementary concerns:
 * - IView (the Lens): maintains Anchor, Pivot, and RenderDetail — defines HOW to view
 * - INavigable (the Navigator): maintains Cursor position — defines WHERE we are
 */

export type RenderCell = string | number | boolean | FormaField;

export type RenderRow = | RenderCell[]

export type RenderData = RenderRow | RenderRow[];

const MAX_ZENO_STEP = 17;

/**
 * ZenoStep: branded integer [0..MAX_ZENO_STEP] for stepped detail levels.
 * Uses Zeno-like convergence: detail = 1 - (8/13)^n
 */
export type ZenoStep = number & { readonly __zenoStep: unique symbol };

export function zenoStep(n: number): ZenoStep {
  if (!Number.isInteger(n) || n < 0 || n > MAX_ZENO_STEP) {
    throw new RangeError(
      `zenoStep: must be integer in [0,${MAX_ZENO_STEP}], got ${n}`,
    );
  }
  return n as ZenoStep;
}

export const ZENO_1_ROW_TERSE = zenoStep(0);
export const ZENO_1_ROW_VERBOSE = zenoStep(1);
export const ZENO_2_ROWS = zenoStep(2);
export const ZENO_3_ROWS = zenoStep(3);
export const ZENO_5_ROWS = zenoStep(4);
export const ZENO_8_ROWS = zenoStep(5);
export const ZENO_13_ROWS = zenoStep(6);
export const ZENO_21_ROWS = zenoStep(7);
export const ZENO_34_ROWS = zenoStep(8);
export const ZENO_55_ROWS = zenoStep(9);

/**
 * Rendering detail can be specified continously over the range [0..1].
 * Values between Cell (-1) and Row (0) provide a continous range of
 * increasing detail (e.g., -0.5) while remaining "cells".
 * Values between Row and All provide a continuous range of
 * increasing detail (e.g., 0.5) while remaining "row/rows".
 */
export const RenderDetail = {
  Row: 0,
  All: 1,
} as const;

export type RenderDetail =
  (typeof RenderDetail)[keyof typeof RenderDetail];

/**
 * ZenoDetail: convergence levels.
 * Formula: detail[n] = 1 - (8/13)^n
 * Ranges from 0 (n=0) to ~0.998 (n=17).
 */
const ZenoDetail: readonly number[] = Object.freeze(
  Array.from(
    { length: MAX_ZENO_STEP + 2 },
    (_, n) => 1 - Math.pow(8 / 13, n),
  ),
);

function fibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0,
    b = 1;
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
  Array.from({ length: MAX_ZENO_STEP + 1 }, (_, n) => fibonacci(n + 1)),
);

/**
 * The ZenoCoord system controls view detail in two dimensions.
 * ZenoCoord/RenderDetail are related as a 2D → 1D bijection
 * manipulable by a single end-user control (RenderDetail) or
 * dual controls (anchorDetail, pivotDetail).
 * ZenoCoord also controls the number of lines presented in a view,
 * which eliminates the need for scrolling in most use cases.
 *
 * AnchorStep sets macro detail level (0-17), pivot adjusts within that level (0-1).
 * Combined detail =
 *   detail[anchorStep] + pivotStep * (detail[anchorStep+1] - detail[anchorStep])
 *
 * Examples:
 *   anchor=0, pivot=0.5 → detail ≈ 0.1875
 *   anchor=1, pivot=0.5 → detail ≈ 0.5625
 */
export class ZenoCoord {
  readonly anchorStep: ZenoStep;
  readonly pivotStep: ZenoStep;

  static readonly MAX_ZENO_STEP = 17;

  constructor(anchorStep: ZenoStep, pivotStep: ZenoStep) {
    this.anchorStep = anchorStep;
    this.pivotStep = pivotStep;
  }

  toRenderDetail(): number {
    const anchorDetail = zenoStepToDetail(this.anchorStep);
    const pivotDetail = zenoStepToDetail(this.pivotStep);
    const anchorDelta = ZenoDetail[this.anchorStep + 1] - anchorDetail;
    return anchorDetail + pivotDetail * anchorDelta;
  }

  static fromRenderDetail(detail: number): ZenoCoord {
    const anchor = detailToZenoStep(detail);
    const anchorDetail = zenoStepToDetail(anchor);
    const anchorDelta = ZenoDetail[anchor + 1] - anchorDetail;
    const FUDGE = 0.000000000000001; // overcome floating point aliasing
    const pivotDetail =
      anchorDelta > 0 ? (detail - anchorDetail + FUDGE) / anchorDelta : 0;
    const pivot = detailToZenoStep(pivotDetail);
    return new ZenoCoord(anchor, pivot);
  }
}

export function zenoStepToDetail(step: ZenoStep): number {
  if (step < 0 || step > MAX_ZENO_STEP) {
    throw new RangeError(
      `zenoStepToDetail: step ${step} out of bounds [0,${MAX_ZENO_STEP}]`,
    );
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
    throw new RangeError(
      `zenoStepToLines: step ${step} out of bounds [0,${MAX_ZENO_STEP}]`,
    );
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
  asRenderData(view: IView): RenderData;
}

export type CursorTarget =
  | 'current'
  | 'top'
  | 'bottom'
  | 'middle'
  | 'first'
  | 'last';
export type CursorType = 'Forma' | 'Field';

/** Semantic address within the Forma sequence. Decoupled from presentation (IView). */
export interface ICursor {
  type: CursorType;
  forma: Forma; // primary axis: which Forma
  field: string | null; // secondary axis: which field within Forma
  formaIndex: number; // position in sequence
  fieldIndex: number; // position within fields
}

/**
 * Navigation state machine over an ordered Forma sequence.
 * Three axes: primary (Forma order), secondary (field order), tertiary transient (search results).
 * Does not handle presentation—that is IView's concern.
 * "next/prev" are semantic, not directional; presentation interprets the cursor.
 */
export interface INavigable {
  // Primary axis: traverse the ordered Forma sequence
  // Returns true if cursor moved, false if at boundary (facilitates UI beep/warn)
  nextForma(): boolean;
  prevForma(): boolean;

  // Secondary axis: traverse fields within the current Forma
  nextField(): ICursor | null;
  prevField(): ICursor | null;

  // Tertiary axis: traverse ephemeral search matches
  nextMatch(): ICursor | null;
  prevMatch(): ICursor | null;

  // Semantic direct access: jump to a known cursor position
  moveTo(cursor: ICursor): void;

  // Structural zoom: expands/contracts field visibility within Forma
  zoomIn(): void;
  zoomOut(): void;

  // Populate tertiary axis with pattern matches
  search(pattern: string): ICursor[];
  clearSearch(): void;

  // TODO: Dispatch operations on the current Forma/Field
  executeAction(action: 'edit' | '...' | 'link', payload?: any): void;

  // Sample cursor at semantic landmarks (current position, boundaries, viewport center)
  getCursor(at?: CursorTarget): ICursor;
}

/**
 * The observer/controller.
 * Maintains the context of observation and manages the lifecycle.
 */
export interface IView {
  readonly anchor: IRegistry;
  readonly pivot: Forma;
  readonly zenoCoord: ZenoCoord;
  readonly bodyIndent: string;
  readonly theme: ITheme;

  /**
   * Sets the primary subject of observation.
   */
  setAnchor(value: IRegistry): void;

  /**
   * Shifts the perspective within the existing anchor.
   */
  setPivot(value: Forma): void;

  /**
   * An IView comprises a header followed by an indented body.
   * Set the body indent
   */
  setBodyIndent(indent:string): void;

  zoomTo(zeno: ZenoCoord): void;

  setTheme(theme: ITheme): void;

  /**
   * Starts the observation loop/stream for a given renderer and channel.
   */
  observe(): void;
}
