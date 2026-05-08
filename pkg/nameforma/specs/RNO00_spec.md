# Implementation Specification: RNO00

## Objective
Refactor `NfContext` to centralize task tracking and decouple `NfOverlay`/`NfWidget` from the `World` instance.

## 1. NfContext Refactor (src/pi/nf-pi/nf-context.ts)

### 1.1 New Properties
*   `public focusedTask: Task | null = null;`
    *   Stores the currently active task retrieved from the world's focus stack.

### 1.2 Event Bridging in `init()`
Update `NfContext.init()` to establish a listener on the `World` instance's event bus:
1.  Retrieve the `World` instance (already resolved during `init`).
2.  Subscribe to `world.on('change', ...)` and `world.on('delete', ...)`.
3.  Inside the listener, if the event type involves a change to `Focus` or `Task`:
    *   Call `this.updateFocusedTask(world);`

### 1.3 Helper Method: `updateFocusedTask(world: World): void`
*   Logic: 
    1.  Check `world.focusedForma('task')`.
    2.  If a `Focus` exists, load the `Task` entity using `world.loadEntity(Task, ...)`.
    3.  Update `this.focusedTask = task;`.
    4.  Emit `'taskChanged'` event with the new task (or `null`) as payload.

## 2. Component Refactoring (src/pi/nf-pi/nf-overlay.ts & src/pi/nf-pi/nf-widget.ts)

### 2.1 Constructor Signature Change
Remove `private world?: World` from the constructor parameters. The components must only depend on `NfContext` and `EventEmitter`.

### 2.2 Remove Duplicate Logic
*   **Delete**: `loadFocusedTaskAsAnchor()`. This logic is now obsolete.

### 2.3 Implement Reactive Tracking
In the constructor, subscribe to the new `NfContext` event:
```typescript
// New implementation pattern for both components
NfContext.shared.on('taskChanged', (newTask: Task | null) => {
    this.anchor = newTask; // Cast/handle as IRenderable
    this.update();
});
```

## 3. Verification Plan
*   **Unit Test**: Verify `NfContext.focusedTask` updates when `World` emits a change event.
*   **Integration Test**: Ensure `NfOverlay` and `NfWidget` anchors update automatically when the active task is changed via `nf task`.
