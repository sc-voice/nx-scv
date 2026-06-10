import { describe, it, expect, vi } from '@sc-voice/vitest';
import { NameFormaTheme } from '../dist/nameforma-theme.js';
import type { INameFormaTheme } from '../dist/navigable-view.js';

describe('NameFormaTheme', () => {
  it('NameFormaTheme.shared returns cached INameFormaTheme', () => {
    const theme = NameFormaTheme.shared;
    expect(theme).toBeDefined();
    expect(theme).toHaveProperty('nfLabel');
  });

  it('NameFormaTheme.load can accept custom theme name', () => {
    const theme = NameFormaTheme.load('dark');
    expect(theme).toBeDefined();
  });

  it('all nf methods apply styling and preserve text', () => {
    const theme = NameFormaTheme.shared;
    const methods = [
      'nfText',
      'nfBoundary',
      'nfLink',
      'nfNominal',
      'nfWarn',
      'nfAttend',
      'nfAway',
      'nfLabel',
    ] as const;

    methods.forEach((method) => {
      const result = theme[method]('test');
      expect(result).toContain('test');
      expect(result).not.toBe('test');
    });
  });
});
