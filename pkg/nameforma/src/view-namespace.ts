import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import { Entity } from './entity.js';
import { FuzzyNamespace, type IMutableNamespace } from './fuzzy-namespace.js';

/**
 * NavigableView provides session context for a view.
 * Since a Navigable may comprise multiple namespaces, it must
 * dynamically merge those namespaces into a single namespace facade 
 * for presentation. 
 * ViewNamespace also maintains an Entity stack that
 * tracks relevant context during a session.
 * The ViewNamespace facade is specifically designed to provide 
 * a namespace context that is:
 * - dynamically compacted, 
 * - resumable
 * - mutable 
 */
export class ViewNamespace implements IMutableNamespace {
  private anchorNs: IMutableNamespace;
  private pivotNs: IMutableNamespace;
  private _track: Entity[] = [];

  constructor(anchor: IMutableNamespace, pivot: IMutableNamespace) {
    this.anchorNs = anchor;
    this.pivotNs = pivot;
  }

  track(entity: Entity): boolean {
    if (this.getForma(entity.id.base64)) {
      return false;
    }

    this._track.push(entity);

    return true;
  }

  untrack(entity: Entity): void {
    const { base64 } = entity.id;
    this._track = this._track.filter(e => e.id.base64 != base64);
  }

  /** Compute merged namespace from anchor + pivot */
  private getMerged(): FuzzyNamespace {
    const merged = new FuzzyNamespace();
    const seen = new Set<string>();

    for (const entity of this._track) {
      merged.addForma(entity);
      seen.add(entity.id.base64);
    }

    for (const [, forma] of this.anchorNs) {
      if (!seen.has(forma.id.base64)) {
        merged.addForma(forma);
        seen.add(forma.id.base64);
      }
    }

    for (const [, forma] of this.pivotNs) {
      if (!seen.has(forma.id.base64)) {
        merged.addForma(forma);
      }
    }

    return merged;
  }

  [Symbol.iterator](): Iterator<[string, Forma]> {
    return this.getMerged()[Symbol.iterator]();
  }

  getForma(fuzzyId: string): Forma | undefined {
    const formaA = this.anchorNs.getForma(fuzzyId);
    if (formaA) {
      return formaA;
    }
    const formaP = this.pivotNs.getForma(fuzzyId);
    if (formaP) {
      return formaP;
    }

    const id = fuzzyId;
    const matchCase = true;
    const matchExact = Identifiable.idFilter(id, id.length, matchCase);
    const matchNoCase = Identifiable.idFilter(id, id.length, !matchCase);
    return this._track.filter(e => matchExact(e.id.base64))[0] ??
      this._track.filter(e => matchNoCase(e.id.base64))[0];
  }

  fuzzyIdOf(forma: Forma): string {
    const msg = "N11w.fuzzyIdOf"
    const { anchorNs, pivotNs } = this;
    const base64 = forma.id.base64;
    const inA = anchorNs.getForma(base64);
    const fzA = anchorNs.fuzzyIdOf(forma);
    const dbg = 0;

    // unique fuzzy ids
    if (inA && pivotNs.getForma(fzA) == null) {
      dbg && console.log(msg, { base64, fzA });
      return fzA;
    }
    const inP = pivotNs.getForma(base64);
    const fzP = pivotNs.fuzzyIdOf(forma);
    if (inP && anchorNs.getForma(fzP) == null) {
      dbg && console.log(msg, { base64, fzP });
      return fzP;
    }

    // Forma is in neither namespace
    if (!inA && !inP) {
      dbg && console.log(msg, { base64 });
      return base64;
    }

    // Forma is in both namespaces with same fuzzy id
    if (inA && inP && fzA === fzP) {
      dbg && console.log(msg, "both", { base64, fzA });
      return fzA;
    }

    dbg && console.log(msg, { base64, inA: !!inA, inP: !!inP, fzA, fzP });

    const timeId = forma.id.timeId();
    const tid = timeId.substring(timeId.indexOf(fzA));
    const tidA = anchorNs.getForma(tid);
    const tidP = pivotNs.getForma(tid);
    if (tidA && (tidP == null || tidP === tidA)) {
      dbg && console.log(msg, "tidA", { tid });
      return tid;
    }
    if (tidP) {
      dbg && console.log(msg, "tidB", { tid });
      return tid;
    }

    throw new Error(`${msg} unknown failure`);
  }

  /** addForma is ambiguous in a ViewNamespace.  Client should mutate
   * underlying namespaces and invalidate this one.
   */
  addForma(forma: Forma): void {
    throw new Error('Ambiguous operation. Invalidate and mutate ancor/pivot directly.');
  }

  removeForma(fuzzyId: string): Forma | undefined {
    let removed = this.anchorNs.removeForma(fuzzyId);
    if (!removed) {
      removed = this.pivotNs.removeForma(fuzzyId);
    }
    return removed;
  }
}
