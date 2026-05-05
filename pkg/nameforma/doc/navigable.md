# Design Document: Vi-inspired Navigable Interface (`IViNavigable`)

## Context & Vision
The `nf-visual` task aims to implement a "Vim-inspired" modal interface for browsing and mutating Nameforma entities. This is not merely a list viewer, but a **Spatial Navigation Engine** for a fractal space of `uuid64` points.

We are moving from a static view of IDs to an active observation of **Live Agents** (`Forma` objects). The architecture relies on the concept that the interface is a **Projection** of high-dimensional data into a 2D viewport, where the resolution of that projection is controlled by `RenderDetail`.

## Core Architectural Principles

### 1. Fractal Projection
The system operates on a scale-invariant principle. Using the `IRenderable.asRenderData(detail: RenderDetail)` contract, an entity's representation changes fundamentally as the cursor "zooms":
*   **`Cell` Level**: Minimalist; identifies the point via a primitive string (`id.timeId()`).
*   **`Row` Level**: Summary mode; shows identity and primary name.
*   **`All/High` Level**: Expanded mode; reveals the full structural complexity of the `Forma`.

Navigation is "fractal" because the movement logic (`j`/`k`) remains constant, even as the density and resolution of the projected data change.

### 2. The Cursor as a Sampling Tool
The cursor is a 0-based pointer in a 2D coordinate system.
*   **Type-Awareness**: While currently focused on `CursorType.Row`, the architecture must support transitions to `CursorType.Cell` (horizontal movement within a single entity's properties).
*   **State**: The cursor tracks `y` (vertical/row) and `x` (horizontal/column) indices.

### 3. Decoupled Observation (`IView` vs `IViNavigable`)
We distinguish between the **Lens** and the **Navigator**:
*   **`IView` (The Lens)**: Mantains the `Anchor`, `Pivot`, and `RenderDetail`. It defines *how* a single point is viewed.
*   **`IViNavigable` (The Navigator)**: Maintains the `Cursor` position across a collection of `Forma` objects. It defines *where* we are looking in the space.

## Proposed Interface Definition (`IViNavigable`)

The interface must bridge the gap between user input and the `IView` state.

```typescript
export type CursorType = 'Row' | 'Cell';

export interface Cursor {
  type: CursorType;
  x: number; // 0-based
  y: number; // 0-based
}

export interface IViNavigable {
  // Navigation (j/k)
  moveNext(): void;
  movePrevious(): void;
  jumpTo(index: number): void;

  // Zooming (zo/zc) - Manipulates the underlying IView detail level
  zoomIn(): void;
  zoomOut(): void;

  // Searching (/ and ?)
  search(pattern: string, direction: 'forward' | 'backward'): void;
  clearSearch(): void;

  // Mutation Dispatch
  executeAction(action: 'edit' | 'delete' | 'create' | 'link', payload?: any): void;

  // State Access
  getCursor(): Cursor;
  getVisibleEntities(): Forma[];
}
```

## Implementation Strategy (Task 6qs00)

The `TaskListNavigable` implementation will:
1.  Hold a reference to an `IView`.
2.  Maintain a local `Cursor` state.
3.  Map `moveNext`/`movePrevious` to increments/decrements of the cursor's `y` property, bounded by the collection size.
4.  Map `zoomIn`/`zoomOut` to calls on the `IView.zoom()` method.
5.  Wrap `Forma.asRenderData` calls to provide the "visible" projection to the UI layer.

## Changes to Current Codebase

### `src/renderable.ts`
- Remove dead `import UUID64 from './uuid64.js'` (line 3) — no longer used in the type union

### `src/forma.ts`
Two type errors in `asRenderData()` caused by UUID64 no longer being in `RenderData`:

1. **Line 305** — `return id` returns a `UUID64` directly. Fix: `return this`. At `Cell+` detail level, returning the live `Forma` gives the navigator an identifiable, interactive object.

2. **Line 301** — `return [{id}, {name}, {summary}]` embeds `{id: UUID64}` which is not assignable to `{[key: string]: RenderData}`. Fix: `return [{id: id.base64}, {name}, {summary}]` — serialize id as its base64 string.

### Circular Dependency Note
`renderable.ts` imports `Forma`; `forma.ts` imports `renderable.ts`. This cycle pre-existed via `IView.pivot: Forma`. TypeScript handles type-level cycles; no new action needed.

## Evaluation Criteria for Claude
*   **Consistency**: Does this interface respect the existing `IRenderable` and `IView` contracts?
*   **Scalability**: Can this structure support a transition from `Row` navigation to `Cell` (horizontal) navigation?
*   **Simplicity**: Does it avoid over-engineering the cursor while allowing for the "fractal" expansion of the space?

## Zeno Micro-steps: anchor/pivot unified RenderDetail

This table illustrates the relationship between the Anchor-level complexity and the Pivot-scale expansion. The values represent the total {	ext{total}}$ achieved by applying a fractional pivot scale to the current macro-step increment ($\Delta_{macro} = 0.375$).

```glow
| Anchor \ Pivot | 0.0 (Baseline) | 0.25 (1/4) | 0.5 (1/2) | 0.75 (3/4) | 1.0 (Full Step) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **0.000** | 0.000 | 0.09375 | 0.1875 | 0.28125 | 0.375 |
| **0.375** | 0.375 | 0.46875 | 0.5625 | 0.65625 | 0.750 |
| **0.750** | 0.750 | 0.84375 | 0.9375 | etc. | |
```
0PtuqxHd00vxi4w5IPOJNW

