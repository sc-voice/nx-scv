import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from '@sc-voice/vitest';
import { World } from '../../src/world.js';
import { Task } from '../../src/task.js';
import UUID64 from '../../src/uuid64.js';
import { TuiList } from '../../src/cli/tui-list.js';
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
      const task1 = entityList.addItem({ name: 'Task 1' });
      const task2 = entityList.addItem({ name: 'Task 2' });
      const task3 = entityList.addItem({ name: 'Task 3' });
      const task4 = entityList.addItem({ name: 'Task 4' });

      world.focusForma(task3); // focusOrder = 1
      world.focusForma(task1); // focusOrder = 0 (most recent)
      // task2 and task4 remain unfocused; task4 is more recent

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const calls = consoleSpy.mock.calls;
      expect(calls.length).toBe(5);
      expect(calls[1][0]).toContain('Task 1'); // focusOrder=0, most recent
      expect(calls[2][0]).toContain('Task 3'); // focusOrder=1
      expect(calls[3][0]).toContain('Task 4'); // unfocused, more recent
      expect(calls[4][0]).toContain('Task 2'); // unfocused, older
      consoleSpy.mockRestore();
    });

    it('should highlight primary focus (focusOrder===0) with focusColor1', () => {
      const entityList = world.entityList(Task);
      const task = entityList.addItem({ name: 'Focused Task' });
      world.focusForma(task);

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const focusedLine = consoleSpy.mock.calls[1][0] as string;
      expect(focusedLine).toContain(BRIGHT_GREEN);
      expect(focusedLine).toContain(RESET);
      consoleSpy.mockRestore();
    });

    it('should highlight related items (UUID64.isRelated) with focusColor2', () => {
      const entityList = world.entityList(Task);
      const primary = entityList.addItem({ name: 'Primary' });
      world.focusForma(primary);

      const relatedId = UUID64.createRelatedId(primary.id);
      const related = entityList.addItem({
        id: relatedId,
        name: 'Related',
      });

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const primaryLine = consoleSpy.mock.calls[1][0] as string;
      const relatedLine = consoleSpy.mock.calls[2][0] as string;

      expect(primaryLine).toContain(BRIGHT_GREEN);
      expect(relatedLine).toContain(GREEN);
      expect(relatedLine).not.toContain(BRIGHT_GREEN);
      consoleSpy.mockRestore();
    });

    it('should use default bullets that demarcate groups of five items', () => {
      const entityList = world.entityList(Task);
      for (let i = 0; i < 6; i++) {
        entityList.addItem({ name: `Task ${i}` });
      }

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      // items are sorted by itemListId descending, so render indices match creation order reversed
      const line1 = consoleSpy.mock.calls[1][0] as string; // render index 0
      const line5 = consoleSpy.mock.calls[5][0] as string; // render index 4 (should be BLACK_CIRCLE)
      const line6 = consoleSpy.mock.calls[6][0] as string; // render index 5

      expect(line1).toContain(Unicode.BULLET);
      expect(line5).toContain(Unicode.BLACK_CIRCLE);
      expect(line6).toContain(Unicode.BULLET);
      consoleSpy.mockRestore();
    });

    it('should use custom fBullet when provided', () => {
      const entityList = world.entityList(Task);
      entityList.addItem({ name: 'Item 1' });
      entityList.addItem({ name: 'Item 2' });

      const customBullet = (index: number) => (index === 0 ? '→' : '◦');

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, { fBullet: customBullet }).render();

      const line1 = consoleSpy.mock.calls[1][0] as string;
      const line2 = consoleSpy.mock.calls[2][0] as string;

      expect(line1).toContain('→');
      expect(line2).toContain('◦');
      consoleSpy.mockRestore();
    });

    it('should respect maxRows truncation', () => {
      const entityList = world.entityList(Task);
      entityList.addItem({ name: 'Task 1' });
      entityList.addItem({ name: 'Task 2' });
      entityList.addItem({ name: 'Task 3' });

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, { maxRows: 2 }).render();

      expect(consoleSpy.mock.calls.length).toBe(3); // title + 2 items
      consoleSpy.mockRestore();
    });

    it('should truncate with ellipsis when maxLinesPerRow=1 and text exceeds maxWidth', () => {
      const entityList = world.entityList(Task);
      entityList.addItem({ name: 'A'.repeat(100) });

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, {
        maxLinesPerRow: 1,
        maxWidth: 20,
      }).render();

      const listLine = consoleSpy.mock.calls[1][0] as string;
      expect(listLine).toContain('…');
      consoleSpy.mockRestore();
    });

    it('should hide overflow text when textOverflow=hidden and maxLinesPerRow=1', () => {
      const entityList = world.entityList(Task);
      entityList.addItem({ name: 'A'.repeat(100) });

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world, {
        maxLinesPerRow: 1,
        maxWidth: 20,
        textOverflow: 'hidden',
      }).render();

      const listLine = consoleSpy.mock.calls[1][0] as string;
      const cleanLine = listLine.replace(/\x1b\[[0-9;]*m/g, '');
      expect(cleanLine).not.toContain('…');
      expect(cleanLine.length).toBeLessThanOrEqual(20);
      consoleSpy.mockRestore();
    });

    it('should render all items with progress color when no primary focus', () => {
      const entityList = world.entityList(Task);
      entityList.addItem({ name: 'Task 1' });
      entityList.addItem({ name: 'Task 2' });

      const consoleSpy = vi.spyOn(console, 'log');
      new TuiList(entityList, world).render();

      const line1 = consoleSpy.mock.calls[1][0] as string;
      const line2 = consoleSpy.mock.calls[2][0] as string;

      // Both tasks have no actions, so progress is 0% in red (ANSI code \x1b[91m)
      expect(line1).toContain('\x1b[91m0%\x1b[39m');
      expect(line2).toContain('\x1b[91m0%\x1b[39m');
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
      entityList.addItem({ name: 'A'.repeat(100) });

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
