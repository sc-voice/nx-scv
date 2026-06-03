import { FormaList } from './forma-list.js';
import { Focus } from './focus.js';
import { Forma } from './forma.js';
import RGA64Stack from './rga64-stack.js';
import UUID64 from './uuid64.js';

export class FocusManager {
  #focusStack: FormaList<Focus>;
  #rgaFocusStack: RGA64Stack;

  constructor() {
    this.#focusStack = new FormaList<Focus>([], Focus as any, {
      keyField: 'formaId',
    });
    this.#rgaFocusStack = new RGA64Stack({ name: 'Focus Stack' });
  }

  get focusStack(): FormaList<Focus> {
    return this.#focusStack;
  }

  get rgaFocusStack(): RGA64Stack {
    return this.#rgaFocusStack;
  }

  get size(): number {
    //return Array.from(this.#focusStack).length;
    return this.#rgaFocusStack.size;
  }

  setRgaFocusStack(rgaFocusStack: RGA64Stack): void {
    this.#rgaFocusStack = rgaFocusStack;
  }

  focusForma(forma: Forma): void {
    const formaIdStr = forma.id.base64;

    // Remove if already in stack (by formaId)
    try {
      this.#focusStack.deleteItem(formaIdStr);
      this.#rgaFocusStack.remove(forma.id);
    } catch {
      // Not in stack, that's fine
    }

    // Create new Focus entry from entity and add to stack
    const focus = Focus.fromEntity(forma);
    this.#focusStack.addItem(focus);
    this.#rgaFocusStack.push(forma.id);
  }

  unfocusForma(forma: Forma): void {
    const formaIdStr = forma.id.base64;
    try {
      this.#focusStack.deleteItem(formaIdStr);
      this.#rgaFocusStack.remove(forma.id);
    } catch {
      // Not in stack, that's fine
    }
  }

  focusOrder(ent: Forma): number {
    // For Focus items (which have formaId), lookup by formaId
    // For regular Forma items (Task, etc.), lookup by id
    const isFocus = ent instanceof Focus;
    const lookupId = isFocus ? (ent as any).formaId : ent.id;

    const nodes = Array.from(this.#rgaFocusStack.nodes(true));
    // nodes() returns nodes top-to-bottom with leaf (most recent) first
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].value.equals(lookupId)) {
        return i; // Position from most recent
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  focusedForma(formaType: string): Focus | null {
    // Iterate through rgaFocusStack (most recent first) to find first item of type
    for (const node of this.#rgaFocusStack.nodes(true)) {
      const focus = this.#focusStack.getItem(node.value.toString());
      if (focus && focus.formaType === formaType) {
        return focus;
      }
    }
    return null;
  }

  peek(): UUID64 | null {
    const topNode = this.#rgaFocusStack.peek();
    return topNode ? topNode.value : null;
  }

  getFocusStackReversed(): FormaList<Focus> {
    // Return new FormaList with items reversed (most recent first)
    const items = Array.from(this.#focusStack).reverse();
    return new FormaList<Focus>(items, Focus as any, {
      keyField: 'formaId',
    });
  }

  validate(isValid: (focus: Focus) => boolean): boolean {
    const before = Array.from(this.#focusStack);
    const valid = before.filter(isValid);

    const validIds = new Set(valid.map((f) => f.formaId.toString()));

    // Remove stale/orphaned active rgaFocusStack nodes not in valid set
    for (const node of this.#rgaFocusStack.nodes(false)) {
      if (!node.deleted && !validIds.has(node.value.toString())) {
        node.delete();
      }
    }

    if (valid.length === before.length) return true;

    // Update focusStack
    this.#focusStack = new FormaList<Focus>(valid, Focus as any, {
      keyField: 'formaId',
    });

    return false;
  }

  toJSON(): any {
    return {
      focusStack: Array.from(this.#focusStack).map((f) => ({
        id: f.id.toString(),
        formaId: f.formaId.toString(),
        formaType: f.formaType,
        name: f.name,
        summary: f.summary,
      })),
      rgaFocusStack: this.#rgaFocusStack.toJSON(),
    };
  }

  static fromJSON(data: any): FocusManager {
    const fm = new FocusManager();

    // Restore focusStack if present
    if (data.focusStack && Array.isArray(data.focusStack)) {
      const focuses = data.focusStack.map((f: any) =>
        Focus.fromJson({
          id: f.id,
          formaId: f.formaId,
          formaType: f.formaType,
          name: f.name,
          summary: f.summary,
        }),
      );
      fm.#focusStack = new FormaList<Focus>(focuses, Focus as any, {
        keyField: 'formaId',
      });
    }

    // Restore rgaFocusStack if present
    if (data.rgaFocusStack && typeof data.rgaFocusStack === 'object') {
      fm.setRgaFocusStack(RGA64Stack.fromJSON(data.rgaFocusStack));
    } else if (Array.from(fm.focusStack).length > 0) {
      // Sync focusStack to rgaFocusStack if the latter is missing (backward compatibility)
      for (const focus of Array.from(fm.focusStack)) {
        fm.rgaFocusStack.push(focus.formaId);
      }
    }

    return fm;
  }
}
