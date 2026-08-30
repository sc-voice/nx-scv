import type { Theme } from '@earendil-works/pi-coding-agent';
import { initTheme } from '@earendil-works/pi-coding-agent';
import type { INameFormaTheme } from './navigable-view.js';
import { Text } from '@sc-voice/tools';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const { ColorConsole } = Text;
const { cc } = ColorConsole;

const THEME_KEY = Symbol.for('@earendil-works/pi-coding-agent:theme');

/**
 * NameFormaTheme - A attention-based color palette for pi-coding-agent Theme API.
 * Default package theme: .pi/agent/themes/nameforma.json
 * Installed theme: ~/.pi/themes/nameforma.json
 */
export class NameFormaTheme implements INameFormaTheme {
  private static _shared: NameFormaTheme | null = null;
  columnSeparator: string = '│';

  constructor(private theme: Theme) {}

  /**
   * Cached singleton instance of the nameforma theme.
   * @returns INameFormaTheme instance with nameforma colors
   */
  static get shared(): NameFormaTheme {
    if (!this._shared) {
      this._shared = this.load();
    }
    return this._shared!;
  }

  /**
   * Load and initialize the nameforma theme, installing to ~/.pi/agent/themes/ if needed.
   * @param themeName - Theme name to load (default: 'nameforma')
   * @returns INameFormaTheme instance with nameforma colors
   */
  static load(themeName: string = 'nameforma'): NameFormaTheme {
    const msg = 'NameFormaTheme.load';
    const dbg = 0;

    if (themeName === 'nameforma') {
      const targetDir = join(homedir(), '.pi', 'agent', 'themes');
      const targetPath = join(targetDir, `${themeName}.json`);
      if (!existsSync(targetPath)) {
        const srcPath = fileURLToPath(
          new URL('../.pi/themes/nameforma.json', import.meta.url),
        );
        mkdirSync(targetDir, { recursive: true });
        copyFileSync(srcPath, targetPath);
      }
    }

    initTheme(themeName);
    const theme = (globalThis as any)[THEME_KEY] as Theme;
    if (theme.name === 'nameforma') {
      dbg && cc.ok1(msg, 'loaded theme:', theme?.name);
    } else {
      cc.bad1(msg, 'loaded theme:', theme?.name, 'expected: nameforma');
    }

    return new NameFormaTheme(theme);
  }

  /**
   * Standard attention
   * Apply 'customMessageText' color to text
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfText(text: string): string {
    return this.theme.fg('customMessageText', text);
  }

  /**
   * Secondary text or annotation
   */
  nfNote(text: string): string {
    return this.theme.fg('dim', text);
  }

  /**
   * A boundary marks a static transition in attention
   * Apply 'border' color to text
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfBoundary(text: string): string {
    return this.theme.fg('border', text);
  }

  /**
   * A link points to a destination anchor
   * Apply 'borderAccent' color to text
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfLink(text: string): string {
    return this.theme.fg('borderAccent', text);
  }

  /**
   * A transient value that matches expectations
   * Apply 'success' color to text
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfNominal(text: string): string {
    return this.theme.fg('success', text);
  }

  /**
   * A transient value that may require attention
   * Apply 'warning' color to text
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfWarn(text: string): string {
    return this.theme.fg('warning', text);
  }

  /**
   * A transient value the requires immediate attention
   * Apply 'error' color to text
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfAttend(text: string): string {
    return this.theme.fg('error', text);
  }

  /**
   * Apply 'muted' color to text that indicates fading attention
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfAway(text: string): string {
    return this.theme.fg('muted', text);
  }

  /**
   * Apply 'customMessageLabel' color to text (used for field labels)
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfLabel(text: string, suffix: string = ':'): string {
    return text ? this.theme.fg('customMessageLabel', text + suffix) : '';
  }

  documentation(): Record<string, any> {
    return {
      name: 'NameFormaTheme',
      summary:
        'Extends pi-coding-agent Theme with string formatting methods',
      rows: [
        {
          type: 'static',
          method: this.nfText('nfText'),
          notes: 'default foreground',
        },
        {
          type: 'static',
          method: this.nfNote('nfNote'),
          notes: 'annotation',
        },
        {
          type: 'static',
          method: this.nfBoundary('nfBoundary'),
          notes: 'borders, landmarks, titles',
        },
        {
          type: 'static',
          method: this.nfLink('nfLink'),
          notes: 'URL, fuzzyId',
        },
        {
          type: 'static',
          method: this.nfLabel('nfLabel'),
          notes: 'boundary text',
        },
        {
          type: 'dynamic',
          method: this.nfNominal('nfNominal'),
          notes: 'value within expectations',
        },
        {
          type: 'dynamic',
          method: this.nfWarn('nfWarn'),
          notes: 'divergent value',
        },
        {
          type: 'dynamic',
          method: this.nfAttend('nfAttend'),
          notes: 'requires immediate attention',
        },
        {
          type: 'dynamic',
          method: this.nfAway('nfAway'),
          notes: 'vanishing significance',
        },
      ],
    };
  }
} // NameFormaTheme

/**
 * MarkerTheme implements INameFormaTheme. This theme is useful
 * for tests that validate specically themed content without
 * ANSI Colors
 */
export class MarkerTheme implements INameFormaTheme {
  columnSeparator: string = '│';

  nfText(text: string): string {
    return `«${text}»`;
  }
  nfNote(text: string): string {
    return `‹${text}›`;
  }
  nfLabel(text: string): string {
    return text + ':';
  }
  nfBoundary(text: string): string {
    return `「${text}」`;
  }
  nfLink(text: string): string {
    return `←${text}→`;
  }
  nfNominal(text: string): string {
    return '🟢' + text;
  }
  nfWarn(text: string): string {
    return '🟡' + text;
  }
  nfAttend(text: string): string {
    return '🔴' + text;
  }
  nfAway(text: string): string {
    return '❎' + text;
  }
}

/**
 * PlainTheme implements INameFormaTheme. This theme is useful
 * for content without color.
 */
export class PlainTheme implements INameFormaTheme {
  columnSeparator: string = '│';

  nfText(text: string): string {
    return text;
  }
  nfNote(text: string): string {
    return text;
  }
  nfLabel(text: string): string {
    return text + ':';
  }
  nfBoundary(text: string): string {
    return text;
  }
  nfLink(text: string): string {
    return text;
  }
  nfNominal(text: string): string {
    return text;
  }
  nfWarn(text: string): string {
    return text;
  }
  nfAttend(text: string): string {
    return text;
  }
  nfAway(text: string): string {
    return text;
  }
}
