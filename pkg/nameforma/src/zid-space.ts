import { Forma } from './forma.js';
import { UUID64, UUID64String } from './uuid64.js';
import { FuzzyId } from './identifiable.js';
import { logger } from './logger.js';
import { DBG } from './defines.js';
import { type IMutableNamespace } from './fuzzy-namespace.js';

type Constructor<T> = new (...args: any[]) => T;

/** Serialized zid tables produced by ZidSpace.toJSON() */
export type ZidSpaceJSON = {
  minChars: number;
  zids: [UUID64String, string][];
};

/**
 * ZidSpace is a namespace that allocates a case-insensitive zid
 * (typically 3 or more chars) for each UUID64 (22 chars) tracked
 * by the namespace. The case-insensitivity of a zid allows it
 * it be spoken/heard unambiguously: "aB1" spoken as "Alpha Bravo 1"
 * is guaranteed to be unique.
 */
export class ZidSpace implements IMutableNamespace {
  private _zidB64Map = new Map<FuzzyId, UUID64String>();
  private _b64ZidMap = new Map<UUID64String, FuzzyId>();
  private _b64FormaMap = new Map<UUID64String, Forma>();

  readonly minChars: number;

  constructor(cfg: Partial<ZidSpace> = {}) {
    this.minChars = cfg.minChars ?? 3;
  }

  protected get _formas(): Forma[] {
    return [...this._b64FormaMap.values()];
  }

  get size(): number {
    return this._b64FormaMap.size;
  }

  /**
   * IReadonlytNamespace implementation
   * @returns Forma iff fuzzyId exactly matches a registered string (i.e., base64, zid or mmid)
   */
  getForma(fuzzyId: FuzzyId, strict?: boolean): Forma | undefined {
    const ctx = 'ZidSpace.getForma';
    const dbg = DBG.ZID_SPACE.GET_FORMA;
    const b64 =
      fuzzyId.length === UUID64.CHARS
        ? (fuzzyId as UUID64String)
        : this._zidB64Map.get(fuzzyId);
    let forma = b64 != null ? this._b64FormaMap.get(b64!) : undefined;

    if (b64 && !forma) {
      // deleted
      dbg && logger.info({ ctx }, `Z6E062 ${fuzzyId} ${!!forma}`);
      if (strict) {
        const msg = `Z6E064: not found '${fuzzyId}': ${b64} (deleted)`;
        dbg && logger.info({ ctx }, msg);
        throw new Error(`${ctx}: ${msg}`);
      }
      return undefined;
    }

    // is it possibly a zid
    if (b64 == null) {
      const mmid = String(fuzzyId).toLowerCase();
      if (forma == null) {
        dbg && logger.info({ ctx }, 'Z6E073: b64:null forma:null');
        const b64 = this._zidB64Map.get(mmid);
        if (b64) {
          forma = this._b64FormaMap.get(b64);
        }
      }

      if (forma == null) {
        const { _formas } = this;
        dbg && logger.info({ ctx }, 'Z6E082: forma:null');

        // substring match for possible candidates
        const matches: Forma[] = _formas.filter(
          (_f) => _f && _f.id.base64.includes(fuzzyId),
        ) as Forma[];
        if (matches.length === 1) {
          const msg = `Z6E089: '${fuzzyId}' might be '${matches[0].id}'?`;
          dbg && logger.info({ ctx }, msg);
          throw new Error(`${ctx}: ${msg}`);
        }
        if (matches.length > 1) {
          const ids = [...this._b64FormaMap.keys()];
          const msg = `Z6E096: not found (ambiguous) '${fuzzyId}': matches [${ids.join(',')}]`;
          dbg && logger.info({ ctx }, msg);
          throw new Error(`${ctx}: ${msg}`);
        }
      }
    } // !b64

    if (forma == null && strict) {
      const ids = Array.from(this._b64FormaMap.keys());
      const idList = ids.join(',');
      dbg &&
        logger.info({ ctx, dbg: fuzzyId }, `ids${ids.length}:` + idList);
      throw new Error(`${ctx}: Z6E077: not found: ${fuzzyId}`);
    }

    return forma;
  }

  /** IReadonlyNamespace implementation */
  fuzzyIdOf(id: UUID64 | string): string {
    const ctx = 'ZidSpace.fuzzyIdOf';
    const idString =
      id instanceof UUID64 ? id.base64 : id.replace(/\x1B\[[0-9;]*m/g, ''); // strip ANSII
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

    // Forma may not be in namespace
    const forma = base64 && this._b64FormaMap.get(base64);
    if (forma == null) {
      return idString; // we cannot construct a zid if Forma is not in namespace
    }
    base64 = forma.id.base64;

    // Forma in namespace
    const timeId = forma.id.timeId();

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
      let conflict1 = !this._zidAvailable(zid);
      if (conflict1) {
        let end = endSeconds + 1;
        do {
          zid = timeId.substring(start, end);
          conflict1 = !this._zidAvailable(zid);
          if (!conflict1) {
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

  _zidAvailable(zid: string): boolean {
    const zidB64 = this._zidB64Map.get(zid);
    const mmid = zid.toLowerCase();
    const mmidB64 = this._zidB64Map.get(mmid);

    return zidB64 == null && mmidB64 == null;
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
  _addForma(forma: Forma): FuzzyId {
    const { base64 } = forma.id;
    this._b64FormaMap.set(base64, forma);
    return this.fuzzyIdOf(base64);
  }

  addForma(...formas: Forma[]): void {
    formas.forEach((f) => this._addForma(f));
  }

  /** IMutableNamespace implementation */
  removeForma(fuzzyId: FuzzyId): Forma | undefined {
    const base64: UUID64String =
      this._zidB64Map.get(fuzzyId) ?? (fuzzyId as UUID64String);
    const forma = this._b64FormaMap.get(base64);

    if (forma) {
      const { base64 } = forma.id;
      this._b64FormaMap.delete(base64);
    }

    return forma;
  }

  /**
   * Serialize zid tables (including zids of removed Formas).
   * Formas are not included; persist them separately.
   */
  toJSON(): ZidSpaceJSON {
    return {
      minChars: this.minChars,
      zids: [...this._b64ZidMap.entries()],
    };
  }

  /**
   * Restore zid tables exactly as saved. Add Formas afterward with addForma();
   * saved zids are reused and new Formas get fresh zids.
   */
  static fromJSON(json: ZidSpaceJSON): ZidSpace {
    const zs = new ZidSpace({ minChars: json.minChars });
    for (const [b64, zid] of json.zids) {
      zs._b64ZidMap.set(b64, zid);
      zs._zidB64Map.set(zid, b64);
      zs._zidB64Map.set(zid.toLowerCase(), b64);
    }
    return zs;
  }
}
