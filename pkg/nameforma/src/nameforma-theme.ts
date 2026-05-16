import type { Theme } from '@earendil-works/pi-coding-agent';
import { initTheme } from '@earendil-works/pi-coding-agent';
import type { ITheme } from './navigable-view.js';
import { Text } from '@sc-voice/tools';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const { ColorConsole } = Text;
const { cc } = ColorConsole;

const THEME_KEY = Symbol.for('@earendil-works/pi-coding-agent:theme');

/**
 * NameFormaTheme - Provides yellow label coloring via pi-coding-agent Theme API.
 * Handles theme installation: pi-coding-agent's initTheme() searches ~/.pi/agent/themes/,
 * but our custom nameforma.json lives in .pi/themes/. This class copies it to the user
 * directory on first load, ensuring consistent behavior in CLI and extension contexts.
 */
export class NameFormaTheme implements ITheme {
  constructor(private theme: Theme) {}

  /**
   * Load and initialize the nameforma theme, installing to ~/.pi/agent/themes/ if needed.
   * @param themeName - Theme name to load (default: 'nameforma')
   * @returns ITheme instance with nameforma colors
   */
  static load(themeName: string = 'nameforma'): ITheme {
    const msg = "NameFormaTheme.load";

    if (themeName === 'nameforma') {
      const targetDir = join(homedir(), '.pi', 'agent', 'themes');
      const targetPath = join(targetDir, `${themeName}.json`);
      if (!existsSync(targetPath)) {
        const srcPath = fileURLToPath(new URL('../.pi/themes/nameforma.json', import.meta.url));
        mkdirSync(targetDir, { recursive: true });
        copyFileSync(srcPath, targetPath);
      }
    }

    initTheme(themeName);
    const theme = (globalThis as any)[THEME_KEY] as Theme;
    if (theme.name === 'nameforma') {
      cc.ok1(msg, 'loaded theme:', theme?.name);
    } else {
      cc.bad1(msg, 'loaded theme:', theme?.name, 'expected: nameforma');
    }

    return new NameFormaTheme(theme);
  }

  /**
   * Apply 'border' color to text 
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfBoundary(text: string): string {
    return this.theme.fg('border', text);
  }

  /**
   * Apply 'border' color to text 
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfTrack(text: string): string {
    return this.theme.fg('borderAccent', text);
  }

  /**
   * Apply 'success' color to text 
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfNominal(text: string): string {
    return this.theme.fg('success', text);
  }

  /**
   * Apply 'warning' color to text 
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfWarn(text: string): string {
    return this.theme.fg('warning', text);
  }

  /**
   * Apply 'error' color to text 
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfAttend(text: string): string {
    return this.theme.fg('error', text);
  }

  /**
   * Apply 'muted' color to text 
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfFree(text: string): string {
    return this.theme.fg('muted', text);
  }

  /**
   * Apply 'border' color to text (used for field labels)
   * @param text - Text to colorize
   * @returns Colorized text suitable for TUI display
   */
  nfLabel(text: string): string {
    return text ? this.theme.fg('border', text + ':') : '';
  }
}
