# Design: Entity Cursor TUI Table

## Overview
A mechanism to transform a `ProjectionCursor` into a navigable, paginated table within a TUI environment using `NavigableView`.

## Components

### 1. Data Layer: `ProjectionCursor<ET>`
- Provides the stream of projected entities.
- Defines the available fields via its internal projection.
- Provides movement (next/prev) to fetch more data.

### 2. Representation Layer: `Table`
- **Responsibility**: Acts as the data container for the TUI.
- **Factory Method**: `static fromCursor<ET>(cursor: ProjectionCursor<ET>, opts: IEntityTableConfig<ET>): Table`
- **Function**: Converts the cursor's projected entities and field definitions into a structured `Table` instance (headers + rows).

### 3. Windowing Layer: `EntityScope`
- Acts as the "buffer" between the cursor and the UI.
- Holds the current "page" or "window" of entities to prevent UI flicker during cursor traversal.

### 4. View Layer: `NavigableView` / `EntityView`
- **Viewport**: Manages the visible rows.
- **Navigation**: Maps `NavigableView` cursor movements to `EntityScope.next()`/`prev()` or `ProjectionCursor` movements.
- **Rendering**: Calls `Table.format()` or `Table.asColumns()` to draw the table.

## Interface Definition (Draft)

```typescript
interface IEntityTableConfig<ET extends IEntity> {
  columns: Array<{
    header: string;
    key: string;
    formatter?: (val: any) => string;
  }>;
  // ... other table options
}
```

## Implementation Strategy
1. **Phase 1: Table Extension**: Implement `Table.fromCursor` to bridge `ProjectionCursor` to the `Table` model.
2. **Phase 2: Windowing**: Integrate `EntityScope` to manage the active set of entities provided by the cursor.
3. **Phase 3: TUI Integration**: Implement the `NavigableView` logic to render the table and handle keyboard input for navigation.
