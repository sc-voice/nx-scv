import { Identifiable } from './identifiable.js';
import { Forma } from './forma.js';
import { UUID64, UUID64String } from './uuid64.js';
import { FuzzyId } from './identifiable.js';
import { logger } from './logger.js';
import { DBG } from './defines.js';
import {
  FuzzyNamespace,
  type IMutableNamespace,
} from './fuzzy-namespace.js';

type Constructor<T> = new (...args: any[]) => T;

/**
 * ZidSpace is a namespace that allocates a case-insensitive zid
 * (typically 3 or more chars) for each UUID64 (22 chars) tracked
 * by the namespace. The case-insensitivity of a zid allows it
 * it be spoken/heard unambiguously: "aB1" spoken as "Alpha Bravo 1"
 * is guaranteed to be unique.
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
    const fuzzyId64 =
      fuzzyId.length === UUID64.CHARS
        ? (fuzzyId as UUID64String)
        : undefined;
    let forma =
      fuzzyId64 != null ? this._b64FormaMap.get(fuzzyId64!) : undefined;

    // is it possibly a zid
    if (fuzzyId64 == null) {
      if (forma == null) {
        dbg && logger.info({ ctx, line: 68 }, 'fuzzyId64/forma null');
        const b64 = this._zidB64Map.get(fuzzyId);
        if (b64) {
          forma = this._b64FormaMap.get(b64);
        }
      }

      if (forma == null) {
        const { _formas } = this;
        dbg && logger.info({ ctx, line: 77 }, 'fuzzyId64/forma null');

        // substring match for possible candidates
        const matches = _formas.filter((_f) =>
          _f.id.base64.includes(fuzzyId),
        );
        if (matches.length === 1) {
          const msg = `Z6E078: '${fuzzyId}' might be '${matches[0].id}'?`;
          dbg && logger.info({ ctx }, msg);
          throw new Error(`${ctx}: ${msg}`);
        }
        if (matches.length > 1) {
          const ids = Array.from(this._b64FormaMap.keys());
          const m = matches.length;
          const msg = `Z6E085: not found (ambiguous) '${fuzzyId}': matches [${ids.join(',')}]`;
          dbg && logger.info({ ctx }, msg);
          throw new Error(`${ctx}: ${msg}`);
        }
      }
    } // !fuzzyId64

    if (forma == null) {
      const ids = Array.from(this._b64FormaMap.keys());
      const idList = ids.join(',');
      dbg &&
        logger.info({ ctx, dbg: fuzzyId }, `ids${ids.length}:` + idList);
      if (strict) {
        throw new Error(`${ctx}: Z6E077: not found: ${fuzzyId}`);
      }
    }

    return forma;
  }

  /** IReadonlyNamespace implementation */
  fuzzyIdOf(id: UUID64 | string, string?: boolean): string {
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
      //let conflict1 = this._zidB64Map.get(zid);
      let conflict1 = !this._zidAvailable(zid);
      if (conflict1) {
        let end = endSeconds + 1;
        do {
          zid = timeId.substring(start, end);
          //conflict1 = this._zidB64Map.get(zid);
          conflict1 = !this._zidAvailable(zid);
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
  addForma(forma: Forma): void {
    const { base64 } = forma.id;
    this._b64FormaMap.set(base64, forma);
    const zid = this.fuzzyIdOf(base64);
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
