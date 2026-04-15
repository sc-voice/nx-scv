import { Forma } from '../forma.js';
import { FormaList } from '../forma-list.js';
import { World } from '../world.js';
import { Unicode } from '@sc-voice/tools/text';

const { BRIGHT_GREEN, GREEN } = Unicode.LINUX_COLOR;
const { RESET } = Unicode.LINUX_STYLE;

export interface TuiPreferences {
  title?: string;                  // list title (default: entity name)
  focusColor1?: string;            // primary focus: focusOrder===0 (default: BRIGHT_GREEN)
  focusColor2?: string;            // secondary focus: UUID64.isRelated() to focusOrder===0 item (default: GREEN)
  maxRows?: number;                // truncate at this many rows (default: unlimited)
  maxWidth?: number;               // max line width in characters (default: 80)
  maxLinesPerRow?: number;         // max lines per item (0/undefined=unlimited, 1=single line, 2=wrap 1 extra line, etc.)
  textOverflow?: 'ellipsis' | 'hidden'; // what to do with undisplayable text remainder (default: 'ellipsis')
  wrapIndent?: number;             // indent continuation lines by this many spaces relative to text start (default: 0)
}

export interface ResolvedPreferences {
  title: string;
  focusColor1: string;
  focusColor2: string;
  maxRows?: number;
  maxWidth?: number;
  maxLinesPerRow?: number;
  textOverflow: 'ellipsis' | 'hidden';
  wrapIndent: number;
}

export const defaultPrefs: TuiPreferences = {
  focusColor1: BRIGHT_GREEN,
  focusColor2: GREEN,
  maxWidth: 80,
  textOverflow: 'ellipsis',
};

export class TuiList<T extends Forma> {
  constructor(
    private list: FormaList<T>,
    private world: World,
    private prefs: TuiPreferences = defaultPrefs
  ) {}

  /**
   * Resolve preferences by merging input with defaults and computing title.
   * @param prefs - User-provided preferences
   * @returns Fully resolved preferences with all required fields
   */
  resolvePreferences(prefs: TuiPreferences): ResolvedPreferences {
    const {
      focusColor1 = BRIGHT_GREEN,
      focusColor2 = GREEN,
      maxRows,
      maxWidth = 80,
      maxLinesPerRow,
      textOverflow = 'ellipsis',
      wrapIndent = 0,
    } = prefs;

    // Generate title: use provided title or derive from entity class name
    const title = prefs.title || (this.list.itemClass as any).entity || this.list.itemClass.name;

    return {
      title,
      focusColor1,
      focusColor2,
      maxRows,
      maxWidth,
      maxLinesPerRow,
      textOverflow,
      wrapIndent,
    };
  }

  /**
   * Wrap and optionally truncate text with indentation support.
   * Public method for reuse in other contexts (e.g., CLI output formatting).
   * Wraps at word boundaries to avoid splitting words.
   *
   * @param text - Text to wrap
   * @param maxWidth - Maximum line width
   * @param maxLines - Maximum lines (0/undefined = unlimited)
   * @param textOverflow - How to mark truncated text ('ellipsis' or 'hidden')
   * @param wrapIndent - Indent continuation lines by this many spaces relative to content start
   * @returns Wrapped text with newlines
   */
  wrapAndTruncate(text: string, maxWidth: number, maxLines?: number, textOverflow?: 'ellipsis' | 'hidden', wrapIndent: number = 0): string {
    // Find where content actually starts (first non-space character)
    const contentStart = text.search(/\S/);
    const indentPos = contentStart >= 0 ? contentStart + wrapIndent : wrapIndent;
    const indentStr = ' '.repeat(Math.max(0, indentPos));
    const continuationWidth = Math.max(1, maxWidth - indentPos);

    // Helper to wrap text at word boundaries
    const wrapLine = (line: string, width: number): string[] => {
      const result: string[] = [];
      let remaining = line;

      while (remaining.length > 0) {
        if (remaining.length <= width) {
          result.push(remaining);
          break;
        }

        // Find last space within width
        let breakPoint = width;
        const lastSpace = remaining.lastIndexOf(' ', width);
        if (lastSpace > 0) {
          breakPoint = lastSpace;
        }

        // Extract line and trim trailing whitespace
        result.push(remaining.slice(0, breakPoint).trimEnd());
        // Remove leading whitespace from remaining text
        remaining = remaining.slice(breakPoint).trimStart();
      }

      return result;
    };

    // Step 1: Wrap at word boundaries
    const wrappedLines: string[] = [];
    let remaining = text;
    let isFirstLine = true;

    while (remaining.length > 0) {
      if (isFirstLine) {
        // First line uses full maxWidth
        const lines = wrapLine(remaining, maxWidth);
        wrappedLines.push(lines[0]);
        remaining = lines.slice(1).join(' ');
        isFirstLine = false;
      } else {
        // Continuation lines: prepend indent
        const lines = wrapLine(remaining, continuationWidth);
        wrappedLines.push(indentStr + lines[0]);
        remaining = lines.slice(1).join(' ');
      }
    }

    // Step 2: Enforce max lines limit (maxLines=0/undefined means no limit)
    const keptLines = maxLines && maxLines > 0
      ? wrappedLines.slice(0, maxLines)
      : wrappedLines;

    // Step 3: Apply textOverflow to last kept line if text was truncated
    if (keptLines.length < wrappedLines.length) {
      const kLast = keptLines.length - 1;
      const lastLine = keptLines[kLast];
      const availWidth = kLast === 0 ? maxWidth : maxWidth;
      keptLines[kLast] = (textOverflow === 'ellipsis')
        ? lastLine.slice(0, availWidth - 1) + '…'
        : lastLine.slice(0, availWidth);
    }

    return keptLines.join('\n');
  }

  render(): void {
    const items = Array.from(this.list);
    const resolved = this.resolvePreferences(this.prefs);

    // Print title with item count
    console.log(`${resolved.title} (${items.length}):`);

    if (items.length === 0) {
      return;
    }

    // Sort: focusOrder asc, then itemListId descending (most recent first)
    const sorted = items.sort((a, b) => {
      const cmp = this.world.focusOrder(a) - this.world.focusOrder(b);
      return cmp || this.list.itemListId(b).localeCompare(this.list.itemListId(a));
    });

    const { focusColor1, focusColor2, maxRows, maxWidth, maxLinesPerRow, textOverflow, wrapIndent } = resolved;
    const rows = maxRows ? sorted.slice(0, maxRows) : sorted;

    // primary focus item (focusOrder===0) used for UUID64 relatedness check
    const primary = sorted.find(item => this.world.focusOrder(item) === 0);

    for (const item of rows) {
      const focusOrder = this.world.focusOrder(item);
      const bullet = focusOrder < Number.MAX_SAFE_INTEGER ? Unicode.BULLET : Unicode.HYPHEN;
      let line = item.listItemString({ itemId: this.list.itemListId(item), bullet });

      // Wrap and truncate text based on preferences
      line = this.wrapAndTruncate(line, maxWidth!, maxLinesPerRow, textOverflow, wrapIndent);

      if (focusOrder === 0) {
        console.log(`${focusColor1}${line}${RESET}`);
      } else if (primary && item.id.isRelated(primary.id)) {
        console.log(`${focusColor2}${line}${RESET}`);
      } else {
        console.log(line);
      }
    }
  }
}
