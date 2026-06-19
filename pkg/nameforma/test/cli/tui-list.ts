import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from '@sc-voice/vitest';
import { World, Task, UUID64 } from '@sc-voice/nameforma';
import { TuiList } from '@sc-voice/nameforma/unstable';
import { Unicode } from '@sc-voice/tools/text';
import path from 'path';
import fs from 'fs';
import os from 'os';

const { BRIGHT_GREEN, GREEN } = Unicode.LINUX_COLOR;
const { RESET } = Unicode.LINUX_STYLE;

describe('TuiList', () => {
  let worldPath: string;
  let world: World;

  beforeEach(() => {
    worldPath = path.join(os.tmpdir(), `tui-list-test-${Date.now()}`);
    world = World.fromPath(path.join(worldPath, '.nameforma'));
  });

  afterEach(() => {
    if (fs.existsSync(worldPath)) {
      fs.rmSync(worldPath, { recursive: true });
    }
  });

  describe('resolvePreferences', () => {
    it('should apply all defaults when preferences are empty', () => {
      const entityList = world.entityList(Task);
      const tui = new TuiList(entityList, world);

      const resolved = tui.resolvePreferences({});

      expect(resolved.focusColor1).toBe(BRIGHT_GREEN);
      expect(resolved.focusColor2).toBe(GREEN);
      expect(resolved.maxWidth).toBe(80);
      expect(resolved.maxLinesPerRow).toBeUndefined();
      expect(resolved.textOverflow).toBe('ellipsis');
    });

    it('should override defaults with provided preferences', () => {
      const entityList = world.entityList(Task);
      const tui = new TuiList(entityList, world);
      const customColor = '\x1b[35m';

      const resolved = tui.resolvePreferences({
        title: 'Custom',
        focusColor1: customColor,
        maxRows: 5,
        maxLinesPerRow: 1,
        textOverflow: 'hidden',
      });

      expect(resolved.title).toBe('Custom');
      expect(resolved.focusColor1).toBe(customColor);
      expect(resolved.focusColor2).toBe(GREEN); // default
      expect(resolved.maxRows).toBe(5);
      expect(resolved.maxWidth).toBe(80); // default
      expect(resolved.maxLinesPerRow).toBe(1);
      expect(resolved.textOverflow).toBe('hidden');
    });
  });

  describe('render', () => {
    it('should render empty list with title and count', () => {
      const entityList = world.entityList(Task);
      const consoleSpy = vi.spyOn(console, 'log');

      new TuiList(entityList, world).render();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(0):'),
      );
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('should sort by focusOrder ascending, then itemListId descending (most recent first)', () => {
      const entityList = world.entityList(Task);
      const task1 = new Task({ name: 'Task 1' });
      const task2 = new Task({ name: 'Task 2' });
      const task3 = new Task({ name: 'Task 3' });
      const task4 = new Task({ name: 'Task 4' });
      entityList.addItem(task1);
      entityList.addItem(task2);
      entityList.addItem(task3);
      entityList.addItem(task4);

      world.focusManager.focus(task3.id); // focusOrder = 1
      world.focusManager.focus(task1.id); // focusOrder = 0 (most recent)
      // task2 and task4 remain unfocused; task4 is more recent

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // Verify all tasks appear
      expect(output).toContain('Task 1');
      expect(output).toContain('Task 3');
      expect(output).toContain('Task 4');
      expect(output).toContain('Task 2');

      // Verify order: Task 1 (focusOrder=0) before Task 3 (focusOrder=1) before unfocused tasks
      const i1 = output.indexOf('Task 1');
      const i3 = output.indexOf('Task 3');
      const i4 = output.indexOf('Task 4');
      const i2 = output.indexOf('Task 2');
      expect(i1 < i3).toBe(true);
      expect(i3 < i4).toBe(true);
      expect(i4 < i2).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should visually distinguish primary focus (focusOrder===0)', () => {
      const entityList = world.entityList(Task);
      const focused = new Task({ name: 'Focused Task' });
      entityList.addItem(focused);
      const unfocused = new Task({ name: 'Unfocused Task' });
      entityList.addItem(unfocused);
      world.focusManager.focus(focused.id);

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const focusedLine = consoleSpy.mock.calls.find((c: any[]) =>
        (c[0] as string).includes('Focused Task'),
      )?.[0] as string;
      const unfocusedLine = consoleSpy.mock.calls.find((c: any[]) =>
        (c[0] as string).includes('Unfocused Task'),
      )?.[0] as string;

      // Focused and unfocused items should have different output (different color or shape)
      expect(focusedLine).toBeDefined();
      expect(unfocusedLine).toBeDefined();
      expect(focusedLine).not.toBe(unfocusedLine);

      consoleSpy.mockRestore();
    });

    it('should visually distinguish related items (UUID64.isRelated)', () => {
      const entityList = world.entityList(Task);
      const primary = new Task({ name: 'Primary' });
      entityList.addItem(primary);
      world.focusManager.focus(primary.id);

      const relatedId = UUID64.createRelatedId(primary.id);
      const related = new Task({ id: relatedId, name: 'Related' });
      entityList.addItem(related);
      const unrelated = new Task({ name: 'Unrelated' });
      entityList.addItem(unrelated);

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const primaryLine = consoleSpy.mock.calls.find((c: any[]) =>
        (c[0] as string).includes('Primary'),
      )?.[0] as string;
      const relatedLine = consoleSpy.mock.calls.find((c: any[]) =>
        (c[0] as string).includes('Related'),
      )?.[0] as string;
      const unrelatedLine = consoleSpy.mock.calls.find((c: any[]) =>
        (c[0] as string).includes('Unrelated'),
      )?.[0] as string;

      // All three should be different from each other (primary, related, unrelated)
      expect(primaryLine).toBeDefined();
      expect(relatedLine).toBeDefined();
      expect(unrelatedLine).toBeDefined();
      expect(primaryLine).not.toBe(relatedLine);
      expect(relatedLine).not.toBe(unrelatedLine);
      expect(primaryLine).not.toBe(unrelatedLine);

      consoleSpy.mockRestore();
    });

    it('should use default bullets that demarcate groups of five items', () => {
      const entityList = world.entityList(Task);
      for (let i = 0; i < 6; i++) {
        entityList.addItem(new Task({ name: `Task ${i}` }));
      }

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // All items should appear with bullets
      expect(output).toContain('Task 0');
      expect(output).toContain('Task 5');

      // Get the lines for items at index 4 (5th item) and neighbors for comparison
      const lines = consoleSpy.mock.calls.filter((c: any[]) =>
        /Task [0-5]/.test(c[0] as string),
      );
      expect(lines.length).toBeGreaterThanOrEqual(6);

      // Item at index 4 should have different bullet than items at 3 and 5
      const firstItemChar = lines[0]?.[0]?.charAt(0);
      const fifthItemChar = lines[4]?.[0]?.charAt(0);
      const sixthItemChar = lines[5]?.[0]?.charAt(0);

      expect(fifthItemChar).not.toBe(firstItemChar);
      expect(sixthItemChar).toBe(firstItemChar);

      consoleSpy.mockRestore();
    });

    it('should use custom fBullet when provided', () => {
      const entityList = world.entityList(Task);
      entityList.addItem(new Task({ name: 'Item 1' }));
      entityList.addItem(new Task({ name: 'Item 2' }));

      const customBullet = (index: number) => (index === 0 ? '→' : '◦');

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, { fBullet: customBullet }).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // Custom bullets should appear in output
      expect(output).toContain('Item 1');
      expect(output).toContain('Item 2');
      expect(output).toContain('→');
      expect(output).toContain('◦');

      consoleSpy.mockRestore();
    });

    it('should respect maxRows truncation', () => {
      const entityList = world.entityList(Task);
      const task1 = new Task({ name: 'Task 1' });
      const task2 = new Task({ name: 'Task 2' });
      const task3 = new Task({ name: 'Task 3' });
      entityList.addItem(task1);
      entityList.addItem(task2);
      entityList.addItem(task3);

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, { maxRows: 2 }).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // Only 2 tasks should appear (most recent first), not all 3
      expect(output).toContain('Task 2');
      expect(output).toContain('Task 3');
      expect(output).not.toContain('Task 1');

      consoleSpy.mockRestore();
    });

    it('should truncate with ellipsis when maxLinesPerRow=1 and text exceeds maxWidth', () => {
      const entityList = world.entityList(Task);
      entityList.addItem(new Task({ name: 'A'.repeat(100) }));

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, {
        maxLinesPerRow: 1,
        maxWidth: 20,
      }).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // Output should show truncation (ellipsis)
      expect(output).toContain('…');

      // Text should not exceed maxWidth when ANSI codes are removed
      const lines = output.split('\n');
      const itemLines = lines.filter((l: string) => l.includes('A')); // Lines with the long task
      itemLines.forEach((line: string) => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(cleanLine.length).toBeLessThanOrEqual(21); // 20 + 1 for ellipsis
      });

      consoleSpy.mockRestore();
    });

    it('should hide overflow text when textOverflow=hidden and maxLinesPerRow=1', () => {
      const entityList = world.entityList(Task);
      entityList.addItem(new Task({ name: 'A'.repeat(100) }));

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, {
        maxLinesPerRow: 1,
        maxWidth: 20,
        textOverflow: 'hidden',
      }).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // Should not have ellipsis with hidden overflow
      expect(output).not.toContain('…');

      // Text should not exceed maxWidth when ANSI codes are removed
      const lines = output.split('\n');
      const itemLines = lines.filter((l: string) => l.includes('A')); // Lines with the long task
      itemLines.forEach((line: string) => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(cleanLine.length).toBeLessThanOrEqual(20);
      });

      consoleSpy.mockRestore();
    });

    it('should render all items with progress color when no primary focus', () => {
      const entityList = world.entityList(Task);
      entityList.addItem(new Task({ name: 'Task 1' }));
      entityList.addItem(new Task({ name: 'Task 2' }));

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');

      // Both tasks should appear with progress (0% since no actions)
      expect(output).toContain('Task 1');
      expect(output).toContain('Task 2');
      expect(output).toContain('0%');

      consoleSpy.mockRestore();
    });

    it('should use custom title from preferences', () => {
      const entityList = world.entityList(Task);
      const consoleSpy = vi.spyOn(console, 'log');

      new TuiList(entityList, world, { title: 'My Tasks' }).render();

      expect(consoleSpy).toHaveBeenCalledWith('My Tasks (0):');
      consoleSpy.mockRestore();
    });

    it('should apply wrapIndent to continuation lines', () => {
      const entityList = world.entityList(Task);
      entityList.addItem(new Task({ name: 'A'.repeat(100) }));

      const consoleSpy = vi.spyOn(console, 'log');
      // Render with maxLinesPerRow=2 and wrapIndent=4
      new TuiList(entityList, world, {
        maxLinesPerRow: 2,
        maxWidth: 40,
        wrapIndent: 4,
      }).render();

      const calls = consoleSpy.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // Get the second call (first item line, may be multi-line due to wrapping)
      const output = calls[1][0] as string;
      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, ''); // Remove color codes
      const lines = cleanOutput.split('\n');

      // If there's a second line (wrapped), it should start with spaces (the wrapIndent)
      if (lines.length > 1) {
        const secondLine = lines[1];
        // The second line should be indented (start with spaces)
        expect(secondLine).toMatch(/^ +/);
        // Should have at least 4 spaces of indentation
        const leadingSpaces = secondLine.match(/^ */)?.[0]?.length ?? 0;
        expect(leadingSpaces).toBeGreaterThanOrEqual(4);
      }

      consoleSpy.mockRestore();
    });
  });
});
