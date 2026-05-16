import { describe, it, expect, vi } from '@sc-voice/vitest';
import { NameFormaTheme } from '../dist/nameforma-theme.js';
import type { ITheme } from '../dist/navigable-view.js';

describe('NameFormaTheme', () => {
  it('NameFormaTheme.load returns ITheme', () => {
    const theme = NameFormaTheme.load();
    expect(theme).toBeDefined();
    expect(theme).toHaveProperty('nfLabel');
  });

  it('NameFormaTheme.load can accept custom theme name', () => {
    const theme = NameFormaTheme.load('dark');
    expect(theme).toBeDefined();
  });

  it('nfLabel returns text with ANSI styling', () => {
    const theme = NameFormaTheme.load();
    const result = theme.nfLabel('label');

    expect(typeof result).toBe('string');
    expect(result.length > 0).toBe(true);
    // Verify styling was applied (ANSI codes present, not just plain text)
    expect(result).not.toBe('label');
  });

  it('nfLabel preserves text content', () => {
    const theme = NameFormaTheme.load();
    const text = 'important label';
    const result = theme.nfLabel(text);

    expect(result).toContain(text);
  });
});
