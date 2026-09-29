import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import { Entity } from './entity.js';
import { UUID64, UUID64String } from './uuid64.js';
import { FuzzyId } from './identifiable.js';
import {
  FuzzyNamespace,
  type IMutableNamespace,
} from './fuzzy-namespace.js';

type Constructor<T> = new (...args: any[]) => T;

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
export class ZidSpace /* implements IMutableNamespace */ {
  private _zidB64Map = new Map<FuzzyId, UUID64String>();
  private _b64ZidMap = new Map<UUID64String, FuzzyId>();
  private _b64FormaMap = new Map<UUID64String, Forma>();

  readonly minChars;

  constructor(cfg: Partial<ZidSpace> = {}) {
    this.minChars = cfg.minChars ?? 3;
  }

  static fromFormas(...args: Forma[]): ZidSpace {
    const zs = new ZidSpace();
    args.forEach((f) => zs.addForma(f));
    return zs;
  }

  protected get _formas(): Forma[] {
    return [...this._b64FormaMap.values()];
  }

  /** IReadonlytNamespace implementation  */
  getForma(fuzzyId: FuzzyId, strict?: boolean): Forma | undefined {
    const ctx = 'ZidSpace.getForma';
    let forma = this._b64FormaMap.get(fuzzyId as UUID64String);

    if (forma == null) {
      const b64 = this._zidB64Map.get(fuzzyId);
      if (b64) {
        forma = this._b64FormaMap.get(b64);
      }
    }

    if (forma == null) {
      const { _formas } = this;

      // TimeId filter exact match of fuzzyIdOf
      const matches = _formas.filter((f) => f.id.base64.includes(fuzzyId));
      if (matches.length === 1) {
        forma = matches[0];
      }
      if (matches.length > 1) {
        const ids = matches.map((f) => f.id);
        const m = matches.length;
        throw new Error(
          `${ctx}: Z6E070: not found (ambiguous) "${fuzzyId}": matches [${ids}]`,
        );
      }
    }
    if (forma == null && strict) {
      throw new Error(`${ctx}: Z6E077: not found: ${fuzzyId}`);
    }

    return forma;
  }

  /** IReadonlyNamespace implementation */
  fuzzyIdOf(idInput: UUID64 | string, string?: boolean): string {
    const ctx = 'ZidSpace.fuzzyIdOf';
    const idString = idInput instanceof UUID64 ? idInput.base64 : idInput;
    let base64 =
      idString.length === UUID64.CHARS
        ? (idString as UUID64String)
        : undefined;

    // Does base64 map to existing zid?
    let zid = base64 && this._b64ZidMap.get(base64);
    if (zid != null) {
      return zid;
    }

    // is idString an existing zid?
    if (!base64) {
      base64 = this._zidB64Map.get(idString);
      if (base64 != null) {
        return idString;
      }
    }

    // Forma must be in ZidSpace
    const forma = base64 && this._b64FormaMap.get(base64);
    if (forma == null) {
      throw new Error(`${ctx} ZidSpace has no Forma id: ${idString}`);
    }
    base64 = forma.id.base64;

    // Forma in namespace
    const timeId = forma!.id.timeId();

    if (zid == null) {
      // Create a new zid
      const { minChars } = this;
      const start = Math.max(0, timeId.length - 2 - minChars);
      const endSeconds = timeId.length - 2; // timeId sequence chars are normally '00'
      zid =
        endSeconds < start + minChars
          ? timeId
          : timeId.substring(start, endSeconds);

      // zid collision case #1: extend zid to right to resolve
      let conflict1 = this._zidB64Map.get(zid);
      if (conflict1) {
        let end = endSeconds + 1;
        do {
          zid = timeId.substring(start, end);
          conflict1 = this._zidB64Map.get(zid);
          if (conflict1 == null) {
            break;
          }
          end++;
        } while (conflict1 && end < UUID64.CHARS);
        if (conflict1) {
          throw new Error(
            `${ctx} Z6E131: zid ${zid} conflict1: ${base64} ${conflict1}`,
          );
        }
      }

      if (zid != null) {
        const conflict2 = this._zidB64Map.get(zid);
        if (conflict2) {
          throw new Error(
            `${ctx} Z6E138: zid ${zid} conflict: ${base64} ${conflict2}`,
          );
        }
      }
    }

    if (zid == null) {
      throw new Error(`${ctx} Z6E152: id not found: ${idString}`);
    }

    // register new zid
    this._zidB64Map.set(zid, base64);
    this._b64ZidMap.set(base64, zid);

    // Support spoken multi-modal zids as lowercase (e.g., "alpha bravo 1")
    const mmid = zid.toLowerCase();
    this._zidB64Map.set(mmid, base64);

    return zid;
  }

  /** IMutableNamespace implementation */
  [Symbol.iterator](): Iterator<[string, Forma]> {
    return this._b64FormaMap[Symbol.iterator]();
  }

  /** IMutableNamespace implementation */
  *findByClass<T extends Forma, C extends Constructor<T>>(
    targetClass: C,
    filter?: (element: T) => boolean,
  ): Generator<InstanceType<C>> {
    const resolvedFilter = filter ?? (() => true);
    for (const item of this._formas) {
      if (
        item instanceof (targetClass as Function) &&
        resolvedFilter(item as T)
      ) {
        yield item as InstanceType<C>;
      }
    }
  }

  /** IMutableNamespace implementation */
  addForma(forma: Forma): void {
    this._b64FormaMap.set(forma.id.base64, forma);
  }

  /** IMutableNamespace implementation */
  removeForma(fuzzyId: FuzzyId): Forma | undefined {
    const base64: UUID64String =
      this._zidB64Map.get(fuzzyId) ?? (fuzzyId as UUID64String);
    const forma = this._b64FormaMap.get(base64);

    if (forma) {
      const { base64 } = forma.id;
      this._b64FormaMap.delete(base64);
      const zid = this._b64ZidMap.get(base64);
      if (zid) {
        const mmid = zid.toLowerCase();
        this._b64ZidMap.delete(base64);
        this._zidB64Map.delete(zid);
        zid !== mmid && this._zidB64Map.delete(mmid);
      }
    }

    return forma;
  }
}
