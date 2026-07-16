import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WorldView } from '../src/world-view.js';
import {
  FileRepository,
  World,
  RenderDetail,
  Forma,
  UUID64,
} from '@sc-voice/nameforma';

describe('WorldView cursor state management', () => {
  let tempDir: string;
  let world: World;
  let view: WorldView;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-view-test-'));
    const worldPath = path.join(tempDir, '.nameforma');
    world = await FileRepository.worldFromPath(worldPath);
    view = new WorldView(world, 'test');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('extractFormas', () => {
    it('extracts Forma from flat object', () => {
      const forma = new Forma({ id: new UUID64(), name: 'test' });
      const renderData = { forma };

      const result = view['extractFormas'](renderData);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(forma);
    });

    it('extracts multiple Formas from array', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'test1' });
      const forma2 = new Forma({ id: new UUID64(), name: 'test2' });
      const renderData = [forma1, forma2];

      const result = view['extractFormas'](renderData);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(forma1);
      expect(result[1]).toBe(forma2);
    });

    it('extracts nested Formas from complex structure', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'test1' });
      const forma2 = new Forma({ id: new UUID64(), name: 'test2' });
      const renderData = {
        items: [forma1, { nested: [forma2, 'string', 123] }],
        other: 'data',
      };

      const result = view['extractFormas'](renderData);
      expect(result).toHaveLength(2);
      expect(result.includes(forma1)).toBe(true);
      expect(result.includes(forma2)).toBe(true);
    });

    it('returns empty array for RenderData without Formas', () => {
      const renderData = {
        strings: ['a', 'b'],
        numbers: [1, 2, 3],
        nested: { value: 'test' },
      };

      const result = view['extractFormas'](renderData);
      expect(result).toHaveLength(0);
    });

    it('handles primitive RenderData', () => {
      expect(view['extractFormas']('string')).toHaveLength(0);
      expect(view['extractFormas'](123)).toHaveLength(0);
      expect(view['extractFormas'](true)).toHaveLength(0);
    });
  });

  describe('initializeCursor', () => {
    it('sets cursor to null when primaryAxis is empty', () => {
      view['_primaryAxis'] = [];
      view['initializeCursor']();
      expect(view['_cursor']).toBeNull();
    });

    it('initializes cursor to first Forma in primaryAxis', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];

      view['initializeCursor']();

      expect(view['_cursor']).not.toBeNull();
      expect(view['_cursor']!.forma).toBe(forma1);
      expect(view['_cursor']!.field).toBeNull();
      expect(view['_cursor']!.formaIndex).toBe(0);
      expect(view['_cursor']!.fieldIndex).toBe(0);
      expect(view['_cursor']!.type).toBe('Forma');
    });
  });

  describe('getCursor', () => {
    it('returns cursor when initialized', () => {
      const forma = new Forma({ id: new UUID64(), name: 'test' });
      view['_primaryAxis'] = [forma];
      view['initializeCursor']();

      const cursor = view.getCursor();
      expect(cursor.forma).toBe(forma);
      expect(cursor.formaIndex).toBe(0);
    });

    it('throws error when cursor is null', () => {
      view['_cursor'] = null;
      expect(() => view.getCursor()).toThrow('Cursor not initialized');
    });
  });

  describe('nextForma', () => {
    it('moves cursor forward and returns true', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];
      view['initializeCursor']();

      const result = view.nextForma();
      expect(result).toBe(true);
      expect(view.getCursor().formaIndex).toBe(1);
      expect(view.getCursor().forma).toBe(forma2);
    });

    it('returns false at last Forma (boundary)', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];
      view['initializeCursor']();

      view.nextForma(); // move to second
      const result = view.nextForma(); // try to move past last
      expect(result).toBe(false);
      expect(view.getCursor().formaIndex).toBe(1); // stays at last
    });

    it('preserves field position when moving Formas', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];
      view['initializeCursor']();

      view['_cursor']!.field = 'somefield';
      view['_cursor']!.fieldIndex = 3;

      view.nextForma();

      const cursor = view.getCursor();
      expect(cursor.field).toBe('somefield');
      expect(cursor.fieldIndex).toBe(3);
    });

    it('returns false and does not move if cursor is null', () => {
      view['_cursor'] = null;
      const result = view.nextForma();
      expect(result).toBe(false);
      expect(view['_cursor']).toBeNull();
    });
  });

  describe('prevForma', () => {
    it('moves cursor backward and returns true', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];
      view['initializeCursor']();

      view.nextForma(); // move to second
      const result = view.prevForma(); // move back to first
      expect(result).toBe(true);
      expect(view.getCursor().formaIndex).toBe(0);
      expect(view.getCursor().forma).toBe(forma1);
    });

    it('returns false at first Forma (boundary)', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];
      view['initializeCursor']();

      const result = view.prevForma(); // try to move before first
      expect(result).toBe(false);
      expect(view.getCursor().formaIndex).toBe(0); // stays at first
    });

    it('preserves field position when moving Formas', () => {
      const forma1 = new Forma({ id: new UUID64(), name: 'first' });
      const forma2 = new Forma({ id: new UUID64(), name: 'second' });
      view['_primaryAxis'] = [forma1, forma2];
      view['initializeCursor']();

      view.nextForma(); // move to second
      view['_cursor']!.field = 'anotherfield';
      view['_cursor']!.fieldIndex = 5;

      view.prevForma(); // move back to first

      const cursor = view.getCursor();
      expect(cursor.field).toBe('anotherfield');
      expect(cursor.fieldIndex).toBe(5);
    });

    it('returns false and does not move if cursor is null', () => {
      view['_cursor'] = null;
      const result = view.prevForma();
      expect(result).toBe(false);
      expect(view['_cursor']).toBeNull();
    });
  });
});
