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
}

export interface ResolvedPreferences {
  title: string;
  focusColor1: string;
  focusColor2: string;
  maxRows?: number;
  maxWidth?: number;
  maxLinesPerRow?: number;
  textOverflow: 'ellipsis' | 'hidden';
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
    };
  }

  private wrapAndTruncate(text: string, maxWidth: number, maxLines?: number, textOverflow?: 'ellipsis' | 'hidden'): string {
    // Step 1: Wrap exhaustively to meet maxWidth requirement
    const wrappedLines: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      wrappedLines.push(remaining.slice(0, maxWidth));
      remaining = remaining.slice(maxWidth);
    }

    // Step 2: Enforce max lines limit (maxLines=0/undefined means no limit)
    const keptLines = maxLines && maxLines > 0 
      ? wrappedLines.slice(0, maxLines) 
      : wrappedLines;

    // Step 3: Apply textOverflow to last kept line if text was truncated
    if (keptLines.length < wrappedLines.length) {
      const kLast = keptLines.length - 1;
      const lastLine = keptLines[kLast];
      keptLines[kLast] = (textOverflow === 'ellipsis')
        ? lastLine.slice(0, maxWidth - 1) + '…'
        : lastLine.slice(0, maxWidth);
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

    // Sort: focusOrder asc, then itemListId.localeCompare()
    const sorted = items.sort((a, b) => {
      const cmp = this.world.focusOrder(a) - this.world.focusOrder(b);
      return cmp || this.list.itemListId(a).localeCompare(this.list.itemListId(b));
    });

    const { focusColor1, focusColor2, maxRows, maxWidth, maxLinesPerRow, textOverflow } = resolved;
    const rows = maxRows ? sorted.slice(0, maxRows) : sorted;

    // primary focus item (focusOrder===0) used for UUID64 relatedness check
    const primary = sorted.find(item => this.world.focusOrder(item) === 0);

    for (const item of rows) {
      const focusOrder = this.world.focusOrder(item);
      const bullet = focusOrder < Number.MAX_SAFE_INTEGER ? Unicode.BULLET : Unicode.HYPHEN;
      let line = item.listItemString({ itemId: this.list.itemListId(item), bullet });

      // Wrap and truncate text based on preferences
      line = this.wrapAndTruncate(line, maxWidth!, maxLinesPerRow, textOverflow);

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
